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
  hostel,
  room,
  priority,
  created_at,
  category:categories ( category_id, name ),
  technician_assignments (
    assigned_at,
    technician_id,
    technician:users ( user_id, name, availability_status )
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

const SELECT_WITH_RELATIONS_AND_STUDENT = `
  ${SELECT_WITH_RELATIONS},
  student:users ( user_id, name, id_number )
`;

export async function findAllRequests() {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(SELECT_WITH_RELATIONS_AND_STUDENT)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function insertRequest({ studentId, categoryId, description, photoUrl, hostel, room, priority }) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert({
      student_id: studentId,
      category_id: categoryId,
      description,
      photo_url: photoUrl,
      status: 'open',
      hostel,
      room,
      priority,
    })
    .select(SELECT_WITH_RELATIONS_AND_STUDENT)
    .single();

  if (error) throw error;
  return data;
}

export async function findRequestById(requestId) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('request_id, student_id, category_id, status, created_at')
    .eq('request_id', requestId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// technician_assignments!inner filters the parent rows down to only those
// with a matching child row, rather than embedding-and-filtering client-side.
const SELECT_ASSIGNED_TO_TECHNICIAN = `
  request_id,
  description,
  photo_url,
  status,
  hostel,
  room,
  priority,
  created_at,
  category:categories ( category_id, name ),
  student:users ( user_id, name, id_number ),
  technician_assignments!inner ( assigned_at, technician_id, technician:users ( user_id, name, availability_status ) )
`;

export async function findRequestsAssignedToTechnician(technicianId) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(SELECT_ASSIGNED_TO_TECHNICIAN)
    .eq('technician_assignments.technician_id', technicianId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

const SELECT_DETAIL = `
  ${SELECT_WITH_RELATIONS_AND_STUDENT},
  student_id,
  status_history ( history_id, previous_status, new_status, changed_at )
`;

export async function findRequestDetailById(requestId) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(SELECT_DETAIL)
    .eq('request_id', requestId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateRequestStatus(requestId, newStatus) {
  const { error } = await supabase
    .from('maintenance_requests')
    .update({ status: newStatus })
    .eq('request_id', requestId);

  if (error) throw error;
}

export async function updateRequestPriority(requestId, priority) {
  const { error } = await supabase
    .from('maintenance_requests')
    .update({ priority })
    .eq('request_id', requestId);

  if (error) throw error;
}

export async function insertStatusHistory({ requestId, previousStatus, newStatus }) {
  const { error } = await supabase
    .from('status_history')
    .insert({ request_id: requestId, previous_status: previousStatus, new_status: newStatus });

  if (error) throw error;
}

export async function insertTechnicianAssignment({ requestId, technicianId }) {
  const { error } = await supabase
    .from('technician_assignments')
    .insert({ request_id: requestId, technician_id: technicianId });

  if (error) throw error;
}

// A request is assigned once today, but the schema allows one-to-many, so
// the most recent row is treated as the current assignment.
export async function findCurrentAssignment(requestId) {
  const { data, error } = await supabase
    .from('technician_assignments')
    .select('technician_id, assigned_at')
    .eq('request_id', requestId)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Active (not yet resolved) requests from every student, for the community
// "upvote instead of re-reporting" feed. Deliberately selects no student
// columns beyond the id — other students' names are never sent to a student.
export async function findActiveRequestsForCommunity() {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(
      `request_id, student_id, description, status, hostel, priority, created_at,
       category:categories ( category_id, name )`
    )
    .in('status', ['open', 'assigned', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return data;
}
