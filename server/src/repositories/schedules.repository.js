// Data access layer for `maintenance_schedules` and
// `maintenance_schedule_runs`. No business logic here — only querying and
// mapping rows.
import { supabase } from '../config/supabaseClient.js';

const COLUMNS = `schedule_id, title, description, category_id, hostel, room, priority,
  frequency_days, next_due_at, active, created_by, created_at, last_generated_at,
  category:categories ( category_id, name )`;

export async function insertSchedule(values) {
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .insert({
      title: values.title,
      description: values.description,
      category_id: values.categoryId,
      hostel: values.hostel,
      room: values.room,
      priority: values.priority,
      frequency_days: values.frequencyDays,
      next_due_at: values.nextDueAt,
      created_by: values.createdBy,
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function findAllSchedules() {
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .select(COLUMNS)
    .order('next_due_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function findScheduleById(scheduleId) {
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .select(COLUMNS)
    .eq('schedule_id', scheduleId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findDueSchedules(nowIso) {
  const { data, error } = await supabase
    .from('maintenance_schedules')
    .select(COLUMNS)
    .eq('active', true)
    .lte('next_due_at', nowIso);

  if (error) throw error;
  return data;
}

export async function updateSchedule(scheduleId, patch) {
  const { error } = await supabase.from('maintenance_schedules').update(patch).eq('schedule_id', scheduleId);

  if (error) throw error;
}

export async function deleteSchedule(scheduleId) {
  const { error } = await supabase.from('maintenance_schedules').delete().eq('schedule_id', scheduleId);

  if (error) throw error;
}

export async function insertRun({ scheduleId, requestId }) {
  const { error } = await supabase
    .from('maintenance_schedule_runs')
    .insert({ schedule_id: scheduleId, request_id: requestId });

  if (error) throw error;
}

// The most recent request each schedule produced, with that request's status.
// -> Map(scheduleId -> { request_id, status, created_at })
export async function findLatestRunPerSchedule() {
  const { data, error } = await supabase
    .from('maintenance_schedule_runs')
    .select('schedule_id, request_id, created_at, request:maintenance_requests ( status )')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) throw error;
  const latest = new Map();
  for (const row of data) {
    if (!latest.has(row.schedule_id)) {
      latest.set(row.schedule_id, {
        request_id: row.request_id,
        status: row.request?.status ?? null,
        created_at: row.created_at,
      });
    }
  }
  return latest;
}
