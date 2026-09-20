// Business logic layer for overdue alerts: finds requests that have just
// passed their SLA deadline (see utils/sla.js) and tells the people who need
// to act — every administrator and the assigned technician — once per request.
// Framework-agnostic; the scheduler (jobs/scheduler.js) is what calls it.
import * as requestsRepository from '../repositories/requests.repository.js';
import { computeSla } from '../utils/sla.js';
import { notifyUser, notifyAdministrators } from './push.service.js';
import { announceRequestChange } from './events.service.js';
import { PRIORITY_LABELS } from '../utils/labels.js';

// More than this many at once -> one summary notification instead of a flood
// (e.g. the first run after the feature ships, or after downtime).
const MAX_INDIVIDUAL_ALERTS = 3;

// Pure: which of these active requests are overdue and not yet alerted?
export function findNewlyOverdue(rows, now = new Date()) {
  return rows.filter((row) => {
    if (row.overdue_notified_at) return false;
    const sla = computeSla({
      priority: row.priority,
      status: row.status,
      createdAt: row.created_at,
      now,
    });
    return sla?.state === 'overdue';
  });
}

function latestTechnicianId(row) {
  const assignments = row.technician_assignments || [];
  return assignments
    .slice()
    .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at))[0]?.technician_id;
}

// Returns how many requests were newly flagged.
export async function runOverdueCheck(now = new Date()) {
  const rows = await requestsRepository.findActiveRequestsForSla();
  const overdue = findNewlyOverdue(rows, now);
  if (overdue.length === 0) return 0;

  // Mark first: if sending is slow or a send fails, the next check must not
  // alert the same requests again.
  await requestsRepository.markOverdueNotified(overdue.map((r) => r.request_id));

  if (overdue.length > MAX_INDIVIDUAL_ALERTS) {
    void notifyAdministrators({
      title: `${overdue.length} requests are overdue`,
      body: 'Open Manage Requests to review them.',
      url: '/manage-requests',
      tag: 'overdue-summary',
    });
  }

  for (const row of overdue) {
    const label = `#${row.request_id} (${PRIORITY_LABELS[row.priority] || row.priority}${row.hostel ? `, ${row.hostel}` : ''})`;

    if (overdue.length <= MAX_INDIVIDUAL_ALERTS) {
      void notifyAdministrators({
        title: 'Request overdue',
        body: `${label} has passed its resolution target.`,
        url: `/manage-requests/${row.request_id}`,
        tag: `overdue-${row.request_id}`,
      });
    }

    const technicianId = latestTechnicianId(row);
    if (technicianId) {
      void notifyUser(technicianId, {
        title: 'Task overdue',
        body: `${label} has passed its resolution target.`,
        url: `/tasks/${row.request_id}`,
        tag: `overdue-${row.request_id}`,
      });
    }

    // Live refresh so the Overdue tile and badges update on open pages.
    announceRequestChange({
      requestId: row.request_id,
      userIds: [technicianId],
      message: `Request #${row.request_id} is now overdue`,
    });
  }

  return overdue.length;
}
