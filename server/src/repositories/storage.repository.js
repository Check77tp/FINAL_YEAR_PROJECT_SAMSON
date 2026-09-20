// Data access layer for Supabase Storage. Only place Storage is imported —
// students never talk to Supabase directly (see CLAUDE.md architecture);
// photos are uploaded here, server-side, from a base64 payload in the
// request submission's JSON body.
import { randomUUID } from 'node:crypto';
import { supabase } from '../config/supabaseClient.js';

const BUCKET = 'request-photos';
const AVATAR_BUCKET = 'avatars';

export async function uploadRequestPhoto({ studentId, buffer, contentType, extension }) {
  const path = `${studentId}/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// One avatar per user — a fixed path per user (not a random filename) means
// a re-upload overwrites the previous photo rather than orphaning it in
// storage, so `upsert: true` is required here.
export async function uploadAvatar({ userId, buffer, contentType, extension }) {
  const path = `${userId}/avatar.${extension}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  // Public URLs are otherwise permanently cacheable, which would mean a
  // re-upload at the same path never visibly updates — a cache-busting
  // query param forces every client to re-fetch the new image.
  return `${data.publicUrl}?v=${Date.now()}`;
}

// Proof-of-work photo a technician attaches when resolving a request. Lives
// in the same bucket as issue photos, under resolutions/<requestId>/.
export async function uploadResolutionPhoto({ requestId, buffer, contentType, extension }) {
  const path = `resolutions/${requestId}/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
