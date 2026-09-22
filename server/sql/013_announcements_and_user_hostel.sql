-- Admin announcements + each student's hostel. Run once in the Supabase SQL
-- Editor. This file is SAFE TO RE-RUN (every statement checks first).

-- ---------------------------------------------------------------------------
-- users.hostel: which hostel a student lives in. It lets an administrator push
-- an announcement to "everyone in Kalingalinga". Students set it in Settings,
-- and it is also learned automatically from their first request. Nullable:
-- students who haven't told us still receive announcements sent to
-- "All hostels".
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists hostel text;

-- ---------------------------------------------------------------------------
-- announcements: notices from administrators. hostel = NULL means every
-- hostel. expires_at = NULL means it never expires.
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  announcement_id serial primary key,
  title text not null,
  message text not null,
  hostel text,
  created_by uuid not null references public.users (user_id),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);

alter table public.announcements enable row level security;

-- Administrators manage announcements; every signed-in user may read them
-- (the server decides which ones each student actually sees).
drop policy if exists "announcements_admin_all" on public.announcements;
create policy "announcements_admin_all" on public.announcements
  for all using (public.current_user_role() = 'administrator');

drop policy if exists "announcements_read_authenticated" on public.announcements;
create policy "announcements_read_authenticated" on public.announcements
  for select using (auth.role() = 'authenticated');

-- No GRANT needed: 003_grant_service_role_privileges.sql's default
-- privileges already cover new tables.
