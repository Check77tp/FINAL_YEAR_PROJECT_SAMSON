-- Adds real schema support for four screens that mockups showed but the
-- schema never had: request location (hostel/room), request priority,
-- student ratings on resolved requests, and technician availability status.
-- Run this once against your Supabase project (SQL Editor) — the server
-- code that depends on these columns is already written and will fail
-- without them.

-- ---------------------------------------------------------------------------
-- maintenance_requests: hostel + room (free text — no fixed hostel table
-- exists elsewhere in this schema, and adding one is out of scope for what
-- these screens need) and priority (student-selected at submission, matching
-- the usability goal that the request form needs zero training — the
-- reporter already knows whether a burst pipe is more urgent than a
-- squeaky drawer).
-- ---------------------------------------------------------------------------

create type request_priority as enum ('low', 'medium', 'high', 'critical');

alter table public.maintenance_requests
  add column hostel text,
  add column room text,
  add column priority request_priority not null default 'medium';

-- ---------------------------------------------------------------------------
-- users: technician availability status. Nullable-by-default would need
-- special-casing everywhere it's read, and the value is simply ignored for
-- non-technicians, so every row gets a default instead.
-- ---------------------------------------------------------------------------

create type technician_availability as enum ('available', 'on_job', 'off_duty');

alter table public.users
  add column availability_status technician_availability not null default 'available';

-- ---------------------------------------------------------------------------
-- ratings: one student rating (1-5) per resolved/closed request. Service
-- layer enforces "only the owning student, only after resolved/closed, only
-- once" — the unique constraint on request_id is the second line of defense
-- for "only once", matching this project's RLS-as-second-line-of-defense
-- pattern used throughout 001_init_schema.sql.
-- ---------------------------------------------------------------------------

create table public.ratings (
  rating_id serial primary key,
  request_id integer not null unique references public.maintenance_requests (request_id),
  student_id uuid not null references public.users (user_id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.ratings enable row level security;

create policy "ratings_insert_own_student" on public.ratings
  for insert with check (auth.uid() = student_id);

create policy "ratings_select_own_student" on public.ratings
  for select using (auth.uid() = student_id);

create policy "ratings_select_admin" on public.ratings
  for select using (public.current_user_role() = 'administrator');

create policy "ratings_select_assigned_technician" on public.ratings
  for select using (
    exists (
      select 1 from public.technician_assignments ta
      where ta.request_id = ratings.request_id
        and ta.technician_id = auth.uid()
    )
  );

-- No new GRANT statements needed: 003_grant_service_role_privileges.sql
-- already ran `alter default privileges ... grant all on tables to
-- service_role`, which covers this new table automatically.
