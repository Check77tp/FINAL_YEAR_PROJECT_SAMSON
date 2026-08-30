// Business logic layer for maintenance requests. Framework-agnostic — no
// req/res objects here.
import * as requestsRepository from '../repositories/requests.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import { httpError } from '../utils/httpError.js';

// Core Ticket Lifecycle (CLAUDE.md): Open -> Assigned -> In Progress ->
// Resolved -> Closed. Strictly linear, one step at a time — no skipping
// (e.g. Open -> Closed) and no moving backward. "Assigned" is only ever
// reached via assignTechnician() below, since it must always come with a
// technician_assignments row; updateRequestStatus() rejects it as a target.
const LIFECYCLE_ORDER = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];

export function isValidTransition(currentStatus, nextStatus) {
  const currentIndex = LIFECYCLE_ORDER.indexOf(currentStatus);
  const nextIndex = LIFECYCLE_ORDER.indexOf(nextStatus);
  if (currentIndex === -1 || nextIndex === -1) return false;
  return nextIndex === currentIndex + 1;
}

function assertValidTransition(currentStatus, nextStatus) {
  if (!isValidTransition(currentStatus, nextStatus)) {
    const currentIndex = LIFECYCLE_ORDER.indexOf(currentStatus);
    const nextStep = LIFECYCLE_ORDER[currentIndex + 1];
    const allowed = nextStep
      ? `the only valid next status is "${nextStep}"`
      : 'this request has already reached the end of its lifecycle';
    throw httpError(
      `Cannot move a request from "${currentStatus}" to "${nextStatus}" — ${allowed}.`,
      400
    );
  }
}

// Administrator action: assign a technician to an open request. This is the
// only path onto "assigned" — it always creates the technician_assignments
// row in the same operation, so status and assignment can never drift apart.
export async function assignTechnician({ requestId, technicianId }) {
  const request = await requestsRepository.findRequestById(requestId);
  if (!request) {
    throw httpError('Request not found', 404);
  }
  assertValidTransition(request.status, 'assigned');

  const technician = await usersRepository.findUserProfileById(technicianId);
  if (!technician || technician.role !== 'technician') {
    throw httpError('technicianId must belong to an existing technician account', 400);
  }

  // Not wrapped in a DB transaction — Supabase's JS client doesn't expose
  // one, and a Postgres function would hide this logic from the service
  // layer, which CLAUDE.md asks to avoid. Sequential writes are an accepted
  // tradeoff at this project's scale.
  await requestsRepository.insertTechnicianAssignment({ requestId, technicianId });
  await requestsRepository.updateRequestStatus(requestId, 'assigned');
  await requestsRepository.insertStatusHistory({
    requestId,
    previousStatus: request.status,
    newStatus: 'assigned',
  });

  return { requestId, status: 'assigned', technicianId };
}

// Technician (only on their own assigned requests) or administrator action:
// advance a request through in_progress -> resolved -> closed.
export async function updateRequestStatus({ requestId, newStatus, actingUser }) {
  if (newStatus === 'open' || newStatus === 'assigned') {
    throw httpError(
      `"${newStatus}" cannot be set directly — assignment is handled by the assign-technician action.`,
      400
    );
  }

  const request = await requestsRepository.findRequestById(requestId);
  if (!request) {
    throw httpError('Request not found', 404);
  }

  assertValidTransition(request.status, newStatus);

  if (actingUser.role === 'technician') {
    const assignment = await requestsRepository.findCurrentAssignment(requestId);
    if (!assignment || assignment.technician_id !== actingUser.user_id) {
      throw httpError('You are not assigned to this request', 403);
    }
  }
  // Administrators have broader access (CLAUDE.md role rules) — no
  // ownership check for them.

  await requestsRepository.updateRequestStatus(requestId, newStatus);
  await requestsRepository.insertStatusHistory({
    requestId,
    previousStatus: request.status,
    newStatus,
  });

  return { requestId, status: newStatus };
}

export async function listStudentRequests(studentId) {
  const rows = await requestsRepository.findRequestsByStudentId(studentId);

  return rows.map((row) => {
    // A request is assigned once today, but technician_assignments is
    // modeled as one-to-many, so take the most recent row defensively.
    const assignments = row.technician_assignments || [];
    const latestAssignment = assignments
      .slice()
      .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at))[0];

    return {
      requestId: row.request_id,
      description: row.description,
      photoUrl: row.photo_url,
      status: row.status,
      createdAt: row.created_at,
      category: row.category ? { id: row.category.category_id, name: row.category.name } : null,
      technician: latestAssignment?.technician
        ? { id: latestAssignment.technician.user_id, name: latestAssignment.technician.name }
        : null,
    };
  });
}
