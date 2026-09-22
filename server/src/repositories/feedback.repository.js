// Data access layer for `app_feedback`. No business logic here — only
// querying and mapping rows.
import { supabase } from '../config/supabaseClient.js';

const COLUMNS = 'feedback_id, user_id, rating, category, message, created_at';

export async function insertFeedback({ userId, rating, category, message }) {
  const { data, error } = await supabase
    .from('app_feedback')
    .insert({ user_id: userId, rating, category, message })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

// Administrator: every submission, newest first, with who sent it.
export async function findAllFeedback(limit = 200) {
  const { data, error } = await supabase
    .from('app_feedback')
    .select(`${COLUMNS}, author:users!user_id ( name, role )`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// A user's own past submissions, newest first.
export async function findFeedbackByUserId(userId) {
  const { data, error } = await supabase
    .from('app_feedback')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
