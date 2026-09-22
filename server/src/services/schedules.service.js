// Business logic layer: preventive maintenance schedules. Framework-agnostic.
//
// An administrator defines a recurring job ("Inspect geysers — Block C —
// monthly"). When it falls due, the system creates a normal maintenance
// request for it, so it flows through assignment, technician work, proof
// photos and analytics like any other job. A new task is NOT created while the
// previous one for the same schedule is still open (they would just pile up).
import * as schedulesRepository from '../repositories/schedules.repository.js';
import { createRequest } from './requests.service.js';
import { PREVENTIVE_PREFIX } from '../utils/preventive.js';
import { httpError } from '../utils/httpError.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const ACTIVE_STATUSES = ['open', 'assigned', 'in_progress'];

// The choices offered in the UI.
export const FREQUENCY_DAYS = [7, 14, 21, 30, 90, 180, 365];

// Pure: the next due date after `dueAt`, stepping forward by the frequency
// until it is in the future (so a server that was off for months does not
// generate a burst of catch-up tasks - just one, then resumes the rhythm).
export function advanceNextDue(dueAt, frequencyDays, now = new Date()) {
  let next = new Date(dueAt).getTime();
  const step = frequencyDays * DAY_MS;
  while (next <= now.getTime()) next += step;
  return new Date(next);
}

// Pure: only create a new task if the previous one is finished (or none yet).
export function shouldGenerate(lastRun) {
  return !lastRun || !ACTIVE_STATUSES.includes(lastRun.status);
}

export function mapSchedule(row, lastRun, now = new Date()) {
  const due = new Date(row.next_due_at);
  return {
    id: row.schedule_id,
    title: row.title,
    description: row.description,
    category: row.category ? { id: row.category.category_id, name: row.category.name } : null,
    hostel: row.hostel,
    room: row.room,
    priority: row.priority,
    frequencyDays: row.frequency_days,
    nextDueAt: row.next_due_at,
    dueNow: row.active && due <= now,
    active: row.active,
    lastGeneratedAt: row.last_generated_at,
    lastRequest: lastRun ? { requestId: lastRun.request_id, status: lastRun.status } : null,
  };
}

export async function createSchedule({
  adminId,
  title,
  description,
  categoryId,
  hostel,
  room,
  priority,
  frequencyDays,
  firstDueAt,
}) {
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanHostel = typeof hostel === 'string' ? hostel.trim() : '';
  const cleanRoom = typeof room === 'string' && room.trim() ? room.trim() : null;
  const cleanDescription = typeof description === 'string' && description.trim() ? description.trim() : null;
  const category = Number(categoryId);
  const frequency = Number(frequencyDays);
  const level = priority || 'low';

  if (cleanTitle.length < 3 || cleanTitle.length > 100) {
    throw httpError('Title must be 3-100 characters', 400);
  }
  if (!cleanHostel) throw httpError('Hostel is required', 400);
  if (!Number.isInteger(category) || category <= 0) throw httpError('A valid category is required', 400);
  if (!FREQUENCY_DAYS.includes(frequency)) {
    throw httpError(`Frequency must be one of: ${FREQUENCY_DAYS.join(', ')} days`, 400);
  }
  if (!PRIORITIES.includes(level)) {
    throw httpError(`Priority must be one of: ${PRIORITIES.join(', ')}`, 400);
  }

  let nextDue = new Date();
  if (firstDueAt) {
    nextDue = new Date(firstDueAt);
    if (Number.isNaN(nextDue.getTime())) throw httpError('First due date is not a valid date', 400);
  }

  try {
    const row = await schedulesRepository.insertSchedule({
      title: cleanTitle,
      description: cleanDescription,
      categoryId: category,
      hostel: cleanHostel,
      room: cleanRoom,
      priority: level,
      frequencyDays: frequency,
      nextDueAt: nextDue.toISOString(),
      createdBy: adminId,
    });
    return mapSchedule(row, null);
  } catch (err) {
    if (err.code === '23503') throw httpError('Invalid category', 400); // foreign_key_violation
    throw err;
  }
}

export async function listSchedules(now = new Date()) {
  const [rows, latest] = await Promise.all([
    schedulesRepository.findAllSchedules(),
    schedulesRepository.findLatestRunPerSchedule(),
  ]);
  return rows.map((row) => mapSchedule(row, latest.get(row.schedule_id), now));
}

export async function setScheduleActive({ scheduleId, active }) {
  const row = await schedulesRepository.findScheduleById(scheduleId);
  if (!row) throw httpError('Schedule not found', 404);
  if (typeof active !== 'boolean') throw httpError('active must be true or false', 400);

  const patch = { active };
  // Resuming after a long pause must not fire instantly for an old date.
  if (active && !row.active) {
    patch.next_due_at = advanceNextDue(row.next_due_at, row.frequency_days).toISOString();
  }
  await schedulesRepository.updateSchedule(scheduleId, patch);
  return { id: scheduleId, active };
}

export async function removeSchedule(scheduleId) {
  const row = await schedulesRepository.findScheduleById(scheduleId);
  if (!row) throw httpError('Schedule not found', 404);
  await schedulesRepository.deleteSchedule(scheduleId);
  return { id: scheduleId, deleted: true };
}

// Creates the maintenance request for one schedule. The reporter is the
// administrator who created the schedule; the description carries a fixed
// prefix so the system can recognise (and exclude) preventive requests.
async function generateRequest(row, now) {
  const body = row.description ? `${row.title} - ${row.description}` : row.title;
  const request = await createRequest({
    studentId: row.created_by,
    categoryId: row.category_id,
    description: `${PREVENTIVE_PREFIX}${body}`,
    hostel: row.hostel,
    room: row.room || undefined,
    priority: row.priority,
  });
  await schedulesRepository.insertRun({ scheduleId: row.schedule_id, requestId: request.requestId });
  await schedulesRepository.updateSchedule(row.schedule_id, { last_generated_at: now.toISOString() });
  return request;
}

// Administrator action: "Run now" - create the task immediately without
// changing the schedule's rhythm.
export async function runScheduleNow({ scheduleId, now = new Date() }) {
  const row = await schedulesRepository.findScheduleById(scheduleId);
  if (!row) throw httpError('Schedule not found', 404);

  const latest = await schedulesRepository.findLatestRunPerSchedule();
  if (!shouldGenerate(latest.get(scheduleId))) {
    throw httpError('The previous task for this schedule is still open - finish it before creating another', 400);
  }
  const request = await generateRequest(row, now);
  return { scheduleId, requestId: request.requestId };
}

// Called hourly by the scheduler. Returns how many tasks were created.
export async function runDueSchedules(now = new Date()) {
  const due = await schedulesRepository.findDueSchedules(now.toISOString());
  if (due.length === 0) return 0;

  const latest = await schedulesRepository.findLatestRunPerSchedule();
  let created = 0;

  for (const row of due) {
    try {
      // Advance the due date FIRST, so a failure below cannot make the same
      // schedule fire again on every hourly check.
      await schedulesRepository.updateSchedule(row.schedule_id, {
        next_due_at: advanceNextDue(row.next_due_at, row.frequency_days, now).toISOString(),
      });

      if (!shouldGenerate(latest.get(row.schedule_id))) continue; // previous task still open

      await generateRequest(row, now);
      created += 1;
    } catch (err) {
      console.error(`Preventive schedule #${row.schedule_id} failed:`, err.message);
    }
  }
  return created;
}
