// Business logic layer for maintenance requests. Framework-agnostic — no
// req/res objects here.
import * as requestsRepository from '../repositories/requests.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as storageRepository from '../repositories/storage.repository.js';
import * as ratingsRepository from '../repositories/ratings.repository.js';
import * as upvotesRepository from '../repositories/upvotes.repository.js';
import * as proofsRepository from '../repositories/proofs.repository.js';
import { countByRequest } from './upvotes.service.js';
import { notifyUser, notifyAdministrators } from './push.service.js';
import { computeSla } from '../utils/sla.js';
import { announceRequestChange } from './events.service.js';
import { httpError } from '../utils/httpError.js';

const STATUS_LABELS = { in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,(.+)$/;
const MAX_NOTE_CHARS = 500;

// Policy: a photo of the finished work is OPTIONAL when a technician resolves a
// request (it is shown to the student and admins when present). Setting
// REQUIRE_RESOLUTION_PROOF=true in the server environment makes it mandatory
// for technicians (administrators are always exempt, so they can close out a
// job the technician couldn't photograph). Read at call time, so no code change
// or rebuild is needed to switch the policy.
function isProofRequiredFor(actingUser) {
  return process.env.REQUIRE_RESOLUTION_PROOF === 'true' && actingUser.role === 'technician';
}

// Validates a base64 image data URL and decodes it for upload.
function decodePhotoDataUrl(dataUrl) {
  const match = PHOTO_DATA_URL_PATTERN.exec(dataUrl);
  if (!match) {
    throw httpError('Photo must be a JPEG, PNG, or WebP image', 400);
  }

  const [, subtype, base64Data] = match;
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > MAX_PHOTO_BYTES) {
    throw httpError('Photo must be 5MB or smaller', 400);
  }

  return { buffer, contentType: `image/${subtype}`, extension: subtype === 'jpeg' ? 'jpg' : subtype };
}

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

  // Live update: open pages for the student, technician and every admin
  // refresh themselves (see events.service.js).
  announceRequestChange({
    requestId,
    userIds: [technicianId, request.student_id],
    message: `Request #${requestId} was assigned to ${technician.name}`,
  });

  // Push notifications are fire-and-forget side effects (they never throw).
  void notifyUser(technicianId, {
    title: 'New task assigned',
    body: `Request #${requestId} has been assigned to you.`,
    url: `/tasks/${requestId}`,
    tag: `request-${requestId}`,
  });
  void notifyUser(request.student_id, {
    title: 'Your request was assigned',
    body: `${technician.name} will be handling request #${requestId}.`,
    url: `/requests/${requestId}`,
    tag: `request-${requestId}`,
  });

  return { requestId, status: 'assigned', technicianId };
}

// Technician (only on their own assigned requests) or administrator action:
// advance a request through in_progress -> resolved -> closed.
export async function updateRequestStatus({ requestId, newStatus, actingUser, proof }) {
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

  // Proof of work is handled BEFORE the status changes, so a failed upload
  // leaves the request untouched instead of resolved-without-proof.
  if (newStatus === 'resolved') {
    await saveResolutionProof({ requestId, actingUser, proof });
  }

  await requestsRepository.updateRequestStatus(requestId, newStatus);
  await requestsRepository.insertStatusHistory({
    requestId,
    previousStatus: request.status,
    newStatus,
  });

  const assignedNow = await requestsRepository.findCurrentAssignment(requestId).catch(() => null);
  announceRequestChange({
    requestId,
    userIds: [request.student_id, assignedNow?.technician_id],
    actorId: actingUser.user_id,
    message: `Request #${requestId} is now ${STATUS_LABELS[newStatus] || newStatus}`,
  });

  void notifyUser(request.student_id, {
    title: 'Request update',
    body: `Request #${requestId} is now ${STATUS_LABELS[newStatus] || newStatus}.`,
    url: `/requests/${requestId}`,
    tag: `request-${requestId}`,
  });

  return { requestId, status: newStatus };
}

async function saveResolutionProof({ requestId, actingUser, proof }) {
  const hasPhoto = Boolean(proof?.photoDataUrl);

  if (!hasPhoto) {
    if (isProofRequiredFor(actingUser)) {
      throw httpError('Attach a photo of the completed work before marking this resolved', 400);
    }
    return;
  }

  const note = typeof proof.note === 'string' ? proof.note.trim().slice(0, MAX_NOTE_CHARS) : null;
  const { buffer, contentType, extension } = decodePhotoDataUrl(proof.photoDataUrl);
  const photoUrl = await storageRepository.uploadResolutionPhoto({
    requestId,
    buffer,
    contentType,
    extension,
  });
  await proofsRepository.upsertProof({
    requestId,
    photoUrl,
    note: note || null,
    submittedBy: actingUser.user_id,
  });
}

function mapRequestRow(row) {
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
    hostel: row.hostel,
    room: row.room,
    priority: row.priority,
    createdAt: row.created_at,
    sla: computeSla({ priority: row.priority, status: row.status, createdAt: row.created_at }),
    category: row.category ? { id: row.category.category_id, name: row.category.name } : null,
    student: row.student
      ? { id: row.student.user_id, name: row.student.name, idNumber: row.student.id_number }
      : undefined,
    technician: latestAssignment?.technician
      ? {
          id: latestAssignment.technician.user_id,
          name: latestAssignment.technician.name,
          availabilityStatus: latestAssignment.technician.availability_status,
        }
      : null,
  };
}

// Student action: submit a new request. Always starts life as "open" (the
// repository hardcodes this) — the lifecycle only moves forward from there
// via assignTechnician()/updateRequestStatus() above.
export async function createRequest({
  studentId,
  categoryId,
  description,
  photoDataUrl,
  hostel,
  room,
  priority,
}) {
  let photoUrl = null;

  if (photoDataUrl) {
    const { buffer, contentType, extension } = decodePhotoDataUrl(photoDataUrl);
    photoUrl = await storageRepository.uploadRequestPhoto({ studentId, buffer, contentType, extension });
  }

  try {
    const row = await requestsRepository.insertRequest({
      studentId,
      categoryId,
      description,
      photoUrl,
      hostel,
      room,
      priority,
    });
    // Every request needs a real status_history row from the moment it
    // exists, not just a "Submitted" entry synthesized for display from
    // created_at — item 8's analytics (e.g. resolution time) need an actual
    // queryable 'open' timestamp to measure from.
    await requestsRepository.insertStatusHistory({
      requestId: row.request_id,
      previousStatus: null,
      newStatus: 'open',
    });
    announceRequestChange({
      requestId: row.request_id,
      userIds: [studentId],
      actorId: studentId,
      message: `New request #${row.request_id}: ${row.category?.name || 'maintenance'} in ${hostel}`,
    });
    void notifyAdministrators({
      title: 'New maintenance request',
      body: `${row.category?.name || 'Request'} in ${hostel}: ${description.slice(0, 80)}`,
      url: `/manage-requests/${row.request_id}`,
      tag: `request-${row.request_id}`,
    });
    return mapRequestRow(row);
  } catch (err) {
    // Postgres foreign_key_violation — categoryId didn't match a real row.
    if (err.code === '23503') {
      throw httpError('Invalid category', 400);
    }
    throw err;
  }
}

export async function listStudentRequests(studentId) {
  const rows = await requestsRepository.findRequestsByStudentId(studentId);
  return rows.map(mapRequestRow);
}

// Administrator action: every request, any status, with student details —
// see CLAUDE.md role rules ("administrator... views all requests").
export async function listAllRequests() {
  const [rows, upvoteRows] = await Promise.all([
    requestsRepository.findAllRequests(),
    upvotesRepository.findAllUpvotes(),
  ]);
  // upvoteCount = how many other students said "me too" - an at-a-glance
  // signal of how widespread an issue is.
  const counts = countByRequest(upvoteRows);
  return rows.map((row) => ({ ...mapRequestRow(row), upvoteCount: counts.get(row.request_id) || 0 }));
}

// Technician action: only requests currently assigned to them.
export async function listAssignedRequests(technicianId) {
  const [rows, upvoteRows] = await Promise.all([
    requestsRepository.findRequestsAssignedToTechnician(technicianId),
    upvotesRepository.findAllUpvotes(),
  ]);
  // upvoteCount = how many other students said "me too". Technicians see it so
  // widely-felt problems are fixed promptly.
  const counts = countByRequest(upvoteRows);
  return rows.map((row) => ({ ...mapRequestRow(row), upvoteCount: counts.get(row.request_id) || 0 }));
}

// Single-request detail with its status_history timeline. Access: a student
// may view only their own request; a technician only one assigned to them;
// an administrator any request.
export async function getRequestDetail({ requestId, actingUser }) {
  const row = await requestsRepository.findRequestDetailById(requestId);
  if (!row) {
    throw httpError('Request not found', 404);
  }

  const assignments = row.technician_assignments || [];
  const isAssignedToActingUser = assignments.some((a) => a.technician_id === actingUser.user_id);

  if (actingUser.role === 'student' && row.student_id !== actingUser.user_id) {
    throw httpError('You do not have access to this request', 403);
  }
  if (actingUser.role === 'technician' && !isAssignedToActingUser) {
    throw httpError('You are not assigned to this request', 403);
  }

  const history = (row.status_history || [])
    .slice()
    .sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at))
    .map((h) => ({
      previousStatus: h.previous_status,
      newStatus: h.new_status,
      changedAt: h.changed_at,
    }));

  const ratingRow = await ratingsRepository.findRatingByRequestId(requestId);
  const rating = ratingRow
    ? { rating: ratingRow.rating, comment: ratingRow.comment, createdAt: ratingRow.created_at }
    : null;

  const upvoteCount = await upvotesRepository.countUpvotesForRequest(requestId);

  // Proof lives in its own table; if it can't be read (e.g. the migration
  // hasn't been run yet) the rest of the page must still load.
  let resolution = null;
  try {
    const proofRow = await proofsRepository.findProofByRequestId(requestId);
    if (proofRow) {
      resolution = { photoUrl: proofRow.photo_url, note: proofRow.note, createdAt: proofRow.created_at };
    }
  } catch (err) {
    console.error('Could not load resolution proof:', err.message);
  }

  return { ...mapRequestRow(row), history, rating, upvoteCount, resolution };
}

// Administrator action: re-triage a request's urgency. Allowed at any point
// in the lifecycle (not just at submission) — new information can surface
// after a technician has already started work.
export async function updatePriority({ requestId, priority }) {
  const request = await requestsRepository.findRequestById(requestId);
  if (!request) {
    throw httpError('Request not found', 404);
  }

  await requestsRepository.updateRequestPriority(requestId, priority);
  return { requestId, priority };
}
