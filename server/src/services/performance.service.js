// Business logic layer: technician performance. Framework-agnostic — the
// maths is a pure function (unit-tested); the exported async functions load
// the rows and call it.
//
// For each technician, over a time window:
//   resolved          requests they resolved in the window
//   avgResolutionHours  assigned -> resolved (the time THEY had the job,
//                     not the wait before an administrator assigned it)
//   onTimeRate        % of those resolved within the request's SLA target
//                     (created -> resolved <= the priority's target hours)
//   active            jobs they hold right now; overdueNow = those past SLA
//   avgRating         students' average rating of their finished requests
import * as reportsRepository from '../repositories/reports.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import { computeSla, SLA_TARGET_HOURS } from '../utils/sla.js';
import { httpError } from '../utils/httpError.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ACTIVE = ['assigned', 'in_progress'];

export const ALLOWED_WINDOWS = [7, 30, 90, 365]; // days; 0 = all time

const round1 = (n) => Math.round(n * 10) / 10;

// Pure.
//  technicians:   { user_id, name }
//  assignmentRows:{ request_id, technician_id, assigned_at, request: { status, priority, created_at } }
//  historyRows:   { request_id, new_status, changed_at }   (only 'resolved' rows are used)
//  ratingRows:    { request_id, rating }
export function computeTechnicianPerformance({
  technicians,
  assignmentRows,
  historyRows,
  ratingRows,
  now = new Date(),
  days = 30,
}) {
  const since = days > 0 ? now.getTime() - days * DAY_MS : -Infinity;

  // Only the most recent assignment per request counts (a request could be
  // reassigned); when was each request resolved (latest 'resolved' event)?
  const latest = new Map();
  for (const row of assignmentRows) {
    const existing = latest.get(row.request_id);
    if (!existing || new Date(row.assigned_at) > new Date(existing.assigned_at)) latest.set(row.request_id, row);
  }
  const resolvedAt = new Map();
  for (const h of historyRows) {
    if (h.new_status !== 'resolved') continue;
    const t = new Date(h.changed_at).getTime();
    if (!resolvedAt.has(h.request_id) || t > resolvedAt.get(h.request_id)) resolvedAt.set(h.request_id, t);
  }
  const ratingByRequest = new Map(ratingRows.map((r) => [r.request_id, r.rating]));

  return technicians
    .map((tech) => {
      const mine = [...latest.values()].filter((a) => a.technician_id === tech.user_id);

      const resolvedInWindow = mine.filter((a) => {
        const t = resolvedAt.get(a.request_id);
        return t !== undefined && t >= since;
      });

      const durations = resolvedInWindow.map(
        (a) => (resolvedAt.get(a.request_id) - new Date(a.assigned_at).getTime()) / HOUR_MS
      );
      const onTime = resolvedInWindow.filter((a) => {
        const target = SLA_TARGET_HOURS[a.request?.priority] ?? SLA_TARGET_HOURS.medium;
        const elapsed = (resolvedAt.get(a.request_id) - new Date(a.request?.created_at).getTime()) / HOUR_MS;
        return elapsed <= target;
      });

      const active = mine.filter((a) => ACTIVE.includes(a.request?.status));
      const overdueNow = active.filter(
        (a) =>
          computeSla({
            priority: a.request?.priority,
            status: a.request?.status,
            createdAt: a.request?.created_at,
            now,
          })?.state === 'overdue'
      ).length;

      const ratings = mine.map((a) => ratingByRequest.get(a.request_id)).filter((r) => r !== undefined);

      return {
        id: tech.user_id,
        name: tech.name,
        availabilityStatus: tech.availability_status,
        resolved: resolvedInWindow.length,
        avgResolutionHours: durations.length
          ? round1(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null,
        onTimeRate: resolvedInWindow.length ? Math.round((onTime.length / resolvedInWindow.length) * 100) : null,
        active: active.length,
        overdueNow,
        avgRating: ratings.length ? round1(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null,
        ratingCount: ratings.length,
      };
    })
    .sort((a, b) => b.resolved - a.resolved || (b.avgRating ?? 0) - (a.avgRating ?? 0) || a.name.localeCompare(b.name));
}

function parseDays(days) {
  const n = days === undefined || days === '' ? 30 : Number(days);
  if (n === 0 || ALLOWED_WINDOWS.includes(n)) return n;
  throw httpError(`days must be one of: ${ALLOWED_WINDOWS.join(', ')} (or 0 for all time)`, 400);
}

async function load() {
  const [technicians, assignmentRows, historyRows, ratingRows] = await Promise.all([
    usersRepository.findUsersByRole('technician'),
    reportsRepository.findAssignmentsForPerformance(),
    reportsRepository.findOpenAndResolvedHistory(),
    reportsRepository.findRatingsWithRequest(),
  ]);
  return { technicians, assignmentRows, historyRows, ratingRows };
}

// Administrator: every technician, best first.
export async function getTechnicianPerformance({ days, now = new Date() } = {}) {
  const windowDays = parseDays(days);
  const data = await load();
  return { days: windowDays, technicians: computeTechnicianPerformance({ ...data, now, days: windowDays }) };
}

// Technician: their own numbers, plus how many colleagues they are compared with.
export async function getMyPerformance({ technicianId, days, now = new Date() }) {
  const windowDays = parseDays(days);
  const data = await load();
  const all = computeTechnicianPerformance({ ...data, now, days: windowDays });
  const index = all.findIndex((t) => t.id === technicianId);
  return {
    days: windowDays,
    performance: index === -1 ? null : all[index],
    rank: index === -1 ? null : index + 1,
    outOf: all.length,
  };
}
