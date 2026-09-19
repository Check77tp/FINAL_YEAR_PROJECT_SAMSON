-- Adds a profile photo to users, for the new Account Settings page. Run
-- this once against your Supabase project (SQL Editor).
--
-- The storage bucket itself is created programmatically (via
-- supabase.storage.createBucket), same as 005_create_request_photos_bucket.sql
-- — bucket creation isn't plain table DDL, so it doesn't belong in this file
-- as a statement to run, but the resulting configuration is documented below
-- so it's tracked like every other schema change:
--
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values (
--   'avatars',
--   'avatars',
--   true,
--   3000000, -- 3MB
--   array['image/jpeg', 'image/png', 'image/webp']
-- )
-- on conflict (id) do nothing;

alter table public.users add column avatar_url text;
