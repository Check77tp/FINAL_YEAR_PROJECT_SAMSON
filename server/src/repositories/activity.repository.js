// Data access layer for recent status_history activity. No business logic
// here — only querying and mapping rows. Reuses the existing status_history
// table (CLAUDE.md schema) rather than adding a new audit-log table, since
// every status transition is already recorded there.
import { supabase } from '../config/supabaseClient.js';

const SELECT = `
  history_id,
  request_id,
  previous_status,
  new_status,
  changed_at,
  request:maintenance_requests (
    description,
    category:categories ( name ),
    student:users!student_id ( name )
  )
`;

export async function findRequestIdsForStudent(studentId) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('request_id')
    .eq('student_id', studentId);

  if (error) throw error;
  return data.map((row) => row.request_id);
}

export async function findRequestIdsForTechnician(technicianId) {
  const { data, error } = await supabase
    .from('technician_assignments')
    .select('request_id')
    .eq('technician_id', technicianId);

  if (error) throw error;
  return data.map((row) => row.request_id);
}

export async function findRecentHistoryForRequestIds(requestIds, limit) {
  if (requestIds.length === 0) return [];

  const { data, error } = await supabase
    .from('status_history')
    .select(SELECT)
    .in('request_id', requestIds)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function findRecentHistoryAll(limit) {
  const { data, error } = await supabase
    .from('status_history')
    .select(SELECT)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
