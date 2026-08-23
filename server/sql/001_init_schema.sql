-- Hostel Maintenance Request and Tracking System — initial schema.
-- Run this once against your Supabase project (SQL Editor, or `supabase db push`).
--
-- Design note on `password_hash` (see CLAUDE.md users table): Supabase Auth
-- already stores credentials internally in the protected `auth.users` table,
-- and CLAUDE.md is explicit that this project must not roll its own password
-- hashing. Duplicating a password_hash column here would just be a dead,
-- always-empty column, so `public.users` is a profile table keyed to
-- `auth.users.id` instead of storing credentials itself.

create type user_role as enum ('student', 'technician', 'administrator');
create type request_status as enum ('open', 'assigned', 'in_progress', 'resolved', 'closed');

create table public.users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role user_role not null default 'student',
  created_at timestamptz not null default now()
);

create table public.categories (
  category_id serial primary key,
  name text not null unique,
  description text
);

create table public.maintenance_requests (
  request_id serial primary key,
  student_id uuid not null references public.users (user_id),
  category_id integer not null references public.categories (category_id),
  description text not null,
  photo_url text,
  status request_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.technician_assignments (
  assignment_id serial primary key,
  request_id integer not null references public.maintenance_requests (request_id),
  technician_id uuid not null references public.users (user_id),
  assigned_at timestamptz not null default now()
);

create table public.status_history (
  history_id serial primary key,
  request_id integer not null references public.maintenance_requests (request_id),
  previous_status request_status,
  new_status request_status not null,
  changed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The Express server accesses Supabase with the service role key, which
-- bypasses RLS — authorization is primarily enforced in the service layer.
-- These policies are the second line of defense described in CLAUDE.md, in
-- case a future code path queries Supabase with a user-scoped key/JWT.
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.technician_assignments enable row level security;
alter table public.status_history enable row level security;

create or replace function public.current_user_role()
returns user_role
language sql
security definer
stable
as $$
  select role from public.users where user_id = auth.uid();
$$;

-- users: everyone can read their own profile; administrators can read all.
create policy "users_select_own" on public.users
  for select using (auth.uid() = user_id);

create policy "users_select_admin" on public.users
  for select using (public.current_user_role() = 'administrator');

create policy "users_update_own" on public.users
  for update using (auth.uid() = user_id);

-- categories: readable by any authenticated user; only administrators manage them.
create policy "categories_select_authenticated" on public.categories
  for select using (auth.role() = 'authenticated');

create policy "categories_write_admin" on public.categories
  for all using (public.current_user_role() = 'administrator');

-- maintenance_requests: students see only their own; technicians see only
-- what they're assigned to; administrators see everything.
create policy "requests_select_own_student" on public.maintenance_requests
  for select using (auth.uid() = student_id);

create policy "requests_select_assigned_technician" on public.maintenance_requests
  for select using (
    exists (
      select 1 from public.technician_assignments ta
      where ta.request_id = maintenance_requests.request_id
        and ta.technician_id = auth.uid()
    )
  );

create policy "requests_select_admin" on public.maintenance_requests
  for select using (public.current_user_role() = 'administrator');

create policy "requests_insert_own_student" on public.maintenance_requests
  for insert with check (auth.uid() = student_id);

create policy "requests_update_assigned_technician" on public.maintenance_requests
  for update using (
    exists (
      select 1 from public.technician_assignments ta
      where ta.request_id = maintenance_requests.request_id
        and ta.technician_id = auth.uid()
    )
  );

create policy "requests_update_admin" on public.maintenance_requests
  for update using (public.current_user_role() = 'administrator');

-- technician_assignments: technicians see their own assignments; admins manage all.
create policy "assignments_select_own_technician" on public.technician_assignments
  for select using (auth.uid() = technician_id);

create policy "assignments_all_admin" on public.technician_assignments
  for all using (public.current_user_role() = 'administrator');

-- status_history: visible to whoever can see the parent request; written by
-- the service layer only (no direct insert policy for end users).
create policy "status_history_select_related" on public.status_history
  for select using (
    exists (
      select 1 from public.maintenance_requests mr
      where mr.request_id = status_history.request_id
        and (
          mr.student_id = auth.uid()
          or public.current_user_role() = 'administrator'
          or exists (
            select 1 from public.technician_assignments ta
            where ta.request_id = mr.request_id and ta.technician_id = auth.uid()
          )
        )
    )
  );
