// Data access layer for `request_comments`. No business logic here — only
// querying and mapping rows.
import { supabase } from '../config/supabaseClient.js';

const COLUMNS = 'comment_id, request_id, body, created_at, author:users!author_id ( user_id, name, role )';

// Oldest first: a conversation reads top to bottom.
export async function findCommentsByRequestId(requestId) {
  const { data, error } = await supabase
    .from('request_comments')
    .select(COLUMNS)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function insertComment({ requestId, authorId, body }) {
  const { data, error } = await supabase
    .from('request_comments')
    .insert({ request_id: requestId, author_id: authorId, body })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
