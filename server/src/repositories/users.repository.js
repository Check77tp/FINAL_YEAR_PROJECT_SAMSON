// Data access layer for the `users` profile table. No business logic here —
// only querying and mapping rows.
import { supabase } from '../config/supabaseClient.js';

const PROFILE_COLUMNS =
  'user_id, name, email, id_number, role, availability_status, avatar_url, created_at';

export async function insertUserProfile({ userId, name, email, idNumber, role }) {
  const { data, error } = await supabase
    .from('users')
    .insert({ user_id: userId, name, email, id_number: idNumber, role })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function findUserProfileById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findUsersByRole(role) {
  const { data, error } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS)
    .eq('role', role)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

// Administrator action (User Management page): every account, any role.
export async function findAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateProfile(userId, { name, avatarUrl }) {
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl;

  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('user_id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateAvailabilityStatus(userId, availabilityStatus) {
  const { data, error } = await supabase
    .from('users')
    .update({ availability_status: availabilityStatus })
    .eq('user_id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

// Resolves a student/staff ID number to its account email, for the
// server-side ID-based login flow (see CLAUDE.md "Authentication: ID-Based Login").
export async function findEmailByIdNumber(idNumber) {
  const { data, error } = await supabase
    .from('users')
    .select('email')
    .eq('id_number', idNumber)
    .maybeSingle();

  if (error) throw error;
  return data?.email ?? null;
}

// ---- Student hostel (users.hostel, added in migration 013) -----------------
// Kept out of PROFILE_COLUMNS on purpose: authenticate() loads the profile on
// every request, so selecting a brand-new column there would break login for
// everyone if the migration had not been run yet.

export async function findHostelByUserId(userId) {
  const { data, error } = await supabase.from('users').select('hostel').eq('user_id', userId).maybeSingle();

  if (error) throw error;
  return data?.hostel ?? null;
}

export async function updateHostel(userId, hostel) {
  const { error } = await supabase.from('users').update({ hostel }).eq('user_id', userId);

  if (error) throw error;
}

// Only fills the hostel in if the student has not chosen one yet.
export async function setHostelIfMissing(userId, hostel) {
  const { error } = await supabase.from('users').update({ hostel }).eq('user_id', userId).is('hostel', null);

  if (error) throw error;
}

export async function findStudentIdsByHostel(hostel) {
  const { data, error } = await supabase
    .from('users')
    .select('user_id')
    .eq('role', 'student')
    .eq('hostel', hostel);

  if (error) throw error;
  return data.map((row) => row.user_id);
}

export async function findAllStudentIds() {
  const { data, error } = await supabase.from('users').select('user_id').eq('role', 'student');

  if (error) throw error;
  return data.map((row) => row.user_id);
}
