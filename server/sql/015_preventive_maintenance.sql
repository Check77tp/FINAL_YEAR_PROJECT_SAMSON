-- Preventive maintenance: recurring inspections/servicing that the system
-- turns into requests automatically ("check the geysers in Block C every
-- month") so problems are caught before students have to report them.
-- Run once in the Supabase SQL Editor. SAFE TO RE-RUN.

-- ---------------------------------------------------------------------------
-- maintenance_schedules: what to do, where, how often, and when it is next
-- due. When a schedule falls due, the server creates a normal maintenance
-- request for it (reported by the administrator who created the schedule).
-- ---------------------------------------------------------------------------
create table if not exists public.maintenance_schedules (
  schedule_id serial primary key,
  title text not null,
  description text,
  category_id integer not null references public.categories (category_id),
  hostel text not null,
  room text,
  priority request_priority not null default 'low',
  frequency_days integer not null check (frequency_days between 1 and 730),
  next_due_at timestamptz not null,
  active boolean not null default true,
  created_by uuid not null references public.users (user_id),
  created_at timestamptz not null default now(),
  last_generated_at timestamptz
);

-- ---------------------------------------------------------------------------
-- maintenance_schedule_runs: which request each schedule produced. Lets the
-- server avoid stacking a new task while the previous one is still open, and
-- lets the admin page show the last task's status.
-- ---------------------------------------------------------------------------
create table if not exists public.maintenance_schedule_runs (
  run_id serial primary key,
  schedule_id integer not null references public.maintenance_schedules (schedule_id) on delete cascade,
  request_id integer not null references public.maintenance_requests (request_id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_schedule_runs_schedule_idx
  on public.maintenance_schedule_runs (schedule_id, created_at desc);

alter table public.maintenance_schedules enable row level security;
alter table public.maintenance_schedule_runs enable row level security;

-- Administrators only.
drop policy if exists "schedules_admin_all" on public.maintenance_schedules;
create policy "schedules_admin_all" on public.maintenance_schedules
  for all using (public.current_user_role() = 'administrator');

drop policy if exists "schedule_runs_admin_all" on public.maintenance_schedule_runs;
create policy "schedule_runs_admin_all" on public.maintenance_schedule_runs
  for all using (public.current_user_role() = 'administrator');

-- No GRANT needed: 003_grant_service_role_privileges.sql's default
-- privileges already cover new tables.
