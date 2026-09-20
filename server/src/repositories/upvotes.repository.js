// Data access layer for `request_upvotes`. No business logic here — only
// querying and mapping rows.
import { supabase } from '../config/supabaseClient.js';

export async function insertUpvote({ requestId, userId }) {
  const { error } = await supabase
    .from('request_upvotes')
    .insert({ request_id: requestId, user_id: userId });

  if (error) throw error;
}

export async function deleteUpvote({ requestId, userId }) {
  const { error } = await supabase
    .from('request_upvotes')
    .delete()
    .eq('request_id', requestId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Every upvote row, as { request_id, user_id }. The table stays small at this
// project's scale, so counting in the service layer is simpler than a
// grouped SQL view; revisit if it ever grows large.
export async function findAllUpvotes() {
  const { data, error } = await supabase.from('request_upvotes').select('request_id, user_id');

  if (error) throw error;
  return data;
}

export async function countUpvotesForRequest(requestId) {
  const { count, error } = await supabase
    .from('request_upvotes')
    .select('request_id', { count: 'exact', head: true })
    .eq('request_id', requestId);

  if (error) throw error;
  return count ?? 0;
}
