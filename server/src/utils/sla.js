// Service-level agreement (SLA) rules: how long each priority is allowed to
// stay unresolved before it counts as overdue. This is a business rule, so it
// lives here on the server as the single source of truth and is attached to
// every request the API returns.
//
// The clock starts when the request is created and stops when it reaches
// "resolved" — closed/resolved requests are never flagged overdue.
export const SLA_TARGET_HOURS = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168, // one week
};

// A request is "at risk" once less than this fraction of its allowed time is left.
const AT_RISK_FRACTION = 0.25;

const HOUR_MS = 60 * 60 * 1000;
const DONE_STATUSES = ['resolved', 'closed'];

// -> { targetHours, dueAt, state, hoursRemaining }
//    state: 'on_track' | 'at_risk' | 'overdue' | 'done'
//    hoursRemaining is negative once overdue (null when done).
export function computeSla({ priority, status, createdAt, now = new Date() }) {
  // No usable start time -> no SLA (callers must treat `sla` as optional).
  if (!createdAt || Number.isNaN(new Date(createdAt).getTime())) return null;

  const targetHours = SLA_TARGET_HOURS[priority] ?? SLA_TARGET_HOURS.medium;
  const dueAt = new Date(new Date(createdAt).getTime() + targetHours * HOUR_MS);

  if (DONE_STATUSES.includes(status)) {
    return { targetHours, dueAt: dueAt.toISOString(), state: 'done', hoursRemaining: null };
  }

  const hoursRemaining = (dueAt.getTime() - new Date(now).getTime()) / HOUR_MS;
  let state = 'on_track';
  if (hoursRemaining < 0) state = 'overdue';
  else if (hoursRemaining < targetHours * AT_RISK_FRACTION) state = 'at_risk';

  return {
    targetHours,
    dueAt: dueAt.toISOString(),
    state,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
  };
}
