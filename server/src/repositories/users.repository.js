// Data access layer for the `users` profile table. No business logic here —
// only querying and mapping rows.
import { supabase } from '../config/supabaseClient.js';

const PROFILE_COLUMNS = 'user_id, name, email, id_number, role, created_at';

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
