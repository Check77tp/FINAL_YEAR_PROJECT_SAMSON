// Data access layer for `maintenance_requests`. No business logic here —
// only querying and mapping rows.
import { supabase } from '../config/supabaseClient.js';

// technician_assignments only ever has one row per request today (a request
// is assigned once), so the most recent assignment is the current one.
const SELECT_WITH_RELATIONS = `
  request_id,
  description,
  photo_url,
  status,
  created_at,
  category:categories ( category_id, name ),
  technician_assignments (
    assigned_at,
    technician:users ( user_id, name )
  )
`;

export async function findRequestsByStudentId(studentId) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(SELECT_WITH_RELATIONS)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
