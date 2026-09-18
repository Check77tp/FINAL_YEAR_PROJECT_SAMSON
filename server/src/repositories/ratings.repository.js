// Data access layer for `ratings`. No business logic here — only querying
// and mapping rows.
import { supabase } from '../config/supabaseClient.js';

export async function findRatingByRequestId(requestId) {
  const { data, error } = await supabase
    .from('ratings')
    .select('rating_id, request_id, student_id, rating, comment, created_at')
    .eq('request_id', requestId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertRating({ requestId, studentId, rating, comment }) {
  const { data, error } = await supabase
    .from('ratings')
    .insert({ request_id: requestId, student_id: studentId, rating, comment })
    .select('rating_id, request_id, student_id, rating, comment, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function findAllRatings() {
  const { data, error } = await supabase.from('ratings').select('rating, request_id');

  if (error) throw error;
  return data;
}
