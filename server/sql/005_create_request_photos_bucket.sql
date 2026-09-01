-- Already applied programmatically (via supabase.storage.createBucket, since
-- bucket creation isn't plain table DDL) — this file documents the resulting
-- configuration so it's tracked like every other schema change.
--
-- Public bucket: maintenance_requests.photo_url is stored as a plain,
-- permanently-usable URL (no signed-URL refresh logic exists in this app),
-- so reads need to work without a Supabase session. Uploads only ever
-- happen from the server via the service role key (bypasses RLS), so no
-- storage.objects policies are required for the app to function — students
-- never talk to Supabase Storage directly, per CLAUDE.md's architecture.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-photos',
  'request-photos',
  true,
  5000000, -- 5MB (Supabase's createBucket interprets "MB" as decimal, not 5*1024*1024)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
