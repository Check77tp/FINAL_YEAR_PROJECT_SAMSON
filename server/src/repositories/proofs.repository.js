// Data access layer for `resolution_proofs`. No business logic here — only
// querying and mapping rows.
import { supabase } from '../config/supabaseClient.js';

export async function findProofByRequestId(requestId) {
  const { data, error } = await supabase
    .from('resolution_proofs')
    .select('request_id, photo_url, note, created_at')
    .eq('request_id', requestId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Upsert: if a technician re-submits (e.g. a better photo), it replaces the
// earlier proof rather than piling up.
export async function upsertProof({ requestId, photoUrl, note, submittedBy }) {
  const { error } = await supabase
    .from('resolution_proofs')
    .upsert(
      { request_id: requestId, photo_url: photoUrl, note, submitted_by: submittedBy },
      { onConflict: 'request_id' }
    );

  if (error) throw error;
}
