// Business logic layer for overdue alerts: finds requests that have passed
// their SLA deadline (see utils/sla.js) and tells the people who need to act —
// every administrator and the assigned technician — once when it first goes
// overdue, then again as a reminder (every 4h for critical/high, daily for
// the rest) for as long as it stays overdue.
// Framework-agnostic; the scheduler (jobs/scheduler.js) is what calls it.
import * as requestsRepository from '../repositories/requests.repository.js';
import { computeSla, OVERDUE_REMINDER_HOURS } from '../utils/sla.js';
import { notifyUser, notifyAdministrators } from './push.service.js';
import { announceRequestChange } from './events.service.js';
import { PRIORITY_LABELS } from '../utils/labels.js';

// More than this many at once -> one summary notification instead of a flood
// (e.g. the first run after the feature ships, or after downtime).
const MAX_INDIVIDUAL_ALERTS = 3;

const HOUR_MS = 60 * 60 * 1000;
// The monitor only wakes up hourly, so a reminder due at "exactly 4h" would
// otherwise be missed by a few milliseconds of timer drift and slip a whole
// extra hour. A small tolerance keeps reminders on schedule.
const REMINDER_TOLERANCE_MS = 5 * 60 * 1000;

// Pure: which active requests should be alerted about right now?
//  - overdue and never alerted             -> first alert
//  - overdue and last alert long enough ago -> reminder (spacing depends on
//    priority, see OVERDUE_REMINDER_HOURS)
// `overdue_notified_at` holds the time of the most recent alert.
export function findRequestsDueForAlert(rows, now = new Date()) {
  return rows.filter((row) => {
    const sla = computeSla({
      priority: row.priority,
      status: row.status,
      createdAt: row.created_at,
      now,
    });
    if (sla?.state !== 'overdue') return false;
    if (!row.overdue_notified_at) return true;

    const intervalMs = (OVERDUE_REMINDER_HOURS[row.priority] ?? 24) * HOUR_MS;
    const sinceLastAlert = new Date(now).getTime() - new Date(row.overdue_notified_at).getTime();
    return sinceLastAlert >= intervalMs - REMINDER_TOLERANCE_MS;
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
  const overdue = findRequestsDueForAlert(rows, now);
  if (overdue.length === 0) return 0;

  // Record the alert time FIRST: if sending is slow or a send fails, the next
  // check must not alert the same requests again straight away.
  await requestsRepository.markOverdueNotified(overdue.map((r) => r.request_id));

  if (overdue.length > MAX_INDIVIDUAL_ALERTS) {
    void notifyAdministrators({
      title: `${overdue.length} overdue requests need attention`,
      body: 'Open Manage Requests to review them.',
      url: '/manage-requests',
      tag: 'overdue-summary',
    });
  }

  for (const row of overdue) {
    const label = `#${row.request_id} (${PRIORITY_LABELS[row.priority] || row.priority}${row.hostel ? `, ${row.hostel}` : ''})`;
    const isReminder = Boolean(row.overdue_notified_at);
    const adminTitle = isReminder ? 'Request still overdue' : 'Request overdue';
    const techTitle = isReminder ? 'Task still overdue' : 'Task overdue';
    const body = isReminder
      ? `${label} is still past its resolution target.`
      : `${label} has passed its resolution target.`;

    if (overdue.length <= MAX_INDIVIDUAL_ALERTS) {
      void notifyAdministrators({
        title: adminTitle,
        body,
        url: `/manage-requests/${row.request_id}`,
        tag: `overdue-${row.request_id}`,
      });
    }

    const technicianId = latestTechnicianId(row);
    if (technicianId) {
      void notifyUser(technicianId, {
        title: techTitle,
        body,
        url: `/tasks/${row.request_id}`,
        tag: `overdue-${row.request_id}`,
      });
    }

    // Live refresh so the Overdue tile and badges update on open pages.
    announceRequestChange({
      requestId: row.request_id,
      userIds: [technicianId],
      message: isReminder
        ? `Request #${row.request_id} is still overdue`
        : `Request #${row.request_id} is now overdue`,
    });
  }

  return overdue.length;
}
