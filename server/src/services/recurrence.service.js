// Business logic layer: recurring-issue detection. Framework-agnostic.
//
// A fault that keeps coming back is a sign the repair didn't fix the cause
// (a patched pipe that keeps bursting, a socket with bad wiring). Spot repairs
// waste technician time and frustrate students, so the system flags:
//   - ROOM level:   the same category reported from the same room
//                   ROOM_THRESHOLD+ times within ROOM_WINDOW_DAYS
//   - HOSTEL level: the same category reported across one hostel
//                   HOSTEL_THRESHOLD+ times within HOSTEL_WINDOW_DAYS
// and suggests a proper inspection or a preventive-maintenance schedule.
import * as reportsRepository from '../repositories/reports.repository.js';
import { isPreventiveDescription } from '../utils/preventive.js';

export const ROOM_THRESHOLD = 3;
export const ROOM_WINDOW_DAYS = 60;
export const HOSTEL_THRESHOLD = 6;
export const HOSTEL_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE = ['open', 'assigned', 'in_progress'];

// "Block C , room 24" and "block c, Room 24" are the same room.
export const normalizeRoom = (room) =>
  typeof room === 'string' ? room.toLowerCase().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim() : '';

// Pure. rows: { request_id, hostel, room, description, status, created_at,
//               category: { category_id, name } }
export function detectRecurringIssues(rows, now = new Date()) {
  const usable = rows.filter(
    (r) => r.hostel && r.category && !isPreventiveDescription(r.description)
  );

  const groupBy = (scope, windowDays, threshold, keyFn) => {
    const cutoff = now.getTime() - windowDays * DAY_MS;
    const groups = new Map();

    for (const r of usable) {
      if (new Date(r.created_at).getTime() < cutoff) continue;
      const key = keyFn(r);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    const issues = [];
    for (const items of groups.values()) {
      if (items.length < threshold) continue;
      const sorted = items.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const last = sorted[sorted.length - 1];
      const category = last.category;
      const where = scope === 'room' ? `${last.hostel}, ${last.room}` : last.hostel;

      issues.push({
        scope,
        hostel: last.hostel,
        room: scope === 'room' ? last.room : null,
        category: { id: category.category_id, name: category.name },
        count: items.length,
        windowDays,
        openCount: items.filter((r) => ACTIVE.includes(r.status)).length,
        firstReportedAt: sorted[0].created_at,
        lastReportedAt: last.created_at,
        requestIds: sorted.map((r) => r.request_id),
        severity: items.length >= threshold * 2 ? 'high' : 'watch',
        suggestion:
          scope === 'room'
            ? `${items.length} ${category.name.toLowerCase()} reports from ${where} in ${windowDays} days. The cause has probably not been fixed - inspect and repair it properly instead of another spot fix.`
            : `${items.length} ${category.name.toLowerCase()} reports across ${where} in ${windowDays} days. Check the building's ${category.name.toLowerCase()} system as a whole.`,
      });
    }
    return issues;
  };

  return [
    ...groupBy('room', ROOM_WINDOW_DAYS, ROOM_THRESHOLD, (r) => {
      const room = normalizeRoom(r.room);
      return room ? `${r.hostel}|${room}|${r.category.category_id}` : null;
    }),
    ...groupBy('hostel', HOSTEL_WINDOW_DAYS, HOSTEL_THRESHOLD, (r) => `${r.hostel}|${r.category.category_id}`),
  ].sort((a, b) => b.count - a.count || new Date(b.lastReportedAt) - new Date(a.lastReportedAt));
}

// Administrator action.
export async function getRecurringIssues(now = new Date()) {
  const since = new Date(now.getTime() - ROOM_WINDOW_DAYS * DAY_MS);
  const rows = await reportsRepository.findRequestsForRecurrence(since.toISOString());
  return detectRecurringIssues(rows, now);
}
