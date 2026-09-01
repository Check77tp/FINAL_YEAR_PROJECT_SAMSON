// Data access layer for Supabase Storage. Only place Storage is imported —
// students never talk to Supabase directly (see CLAUDE.md architecture);
// photos are uploaded here, server-side, from a base64 payload in the
// request submission's JSON body.
import { randomUUID } from 'node:crypto';
import { supabase } from '../config/supabaseClient.js';

const BUCKET = 'request-photos';

export async function uploadRequestPhoto({ studentId, buffer, contentType, extension }) {
  const path = `${studentId}/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
