// Data access layer for the `users` profile table. No business logic here —
// only querying and mapping rows.
import { supabase } from '../config/supabaseClient.js';

const PROFILE_COLUMNS = 'user_id, name, email, role, created_at';

export async function insertUserProfile({ userId, name, email, role }) {
  const { data, error } = await supabase
    .from('users')
    .insert({ user_id: userId, name, email, role })
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
