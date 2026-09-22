// Data access layer for analytics. No business logic here — only querying
// and mapping rows; the actual math lives in reports.service.js so it's
// visible and unit-testable there, per CLAUDE.md's layering.
import { supabase } from '../config/supabaseClient.js';

// Only the two events needed to measure resolution time and this month's
// throughput — not the full history table.
export async function findOpenAndResolvedHistory() {
  const { data, error } = await supabase
    .from('status_history')
    .select('request_id, new_status, changed_at')
    .in('new_status', ['open', 'resolved']);

  if (error) throw error;
  return data;
}

export async function findRequestsForCategoryAndMonthMetrics() {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('request_id, created_at, hostel, category:categories ( name )');

  if (error) throw error;
  return data;
}

export async function findAllAssignmentsWithRequestStatus() {
  const { data, error } = await supabase
    .from('technician_assignments')
    .select('request_id, technician_id, assigned_at, maintenance_requests ( status )');

  if (error) throw error;
  return data;
}

export async function findAllRatings() {
  const { data, error } = await supabase.from('ratings').select('rating');

  if (error) throw error;
  return data;
}

// Requests since a date, with just what recurring-issue detection needs.
export async function findRequestsForRecurrence(sinceIso) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('request_id, hostel, room, description, status, created_at, category:categories ( category_id, name )')
    .gte('created_at', sinceIso);

  if (error) throw error;
  return data;
}
