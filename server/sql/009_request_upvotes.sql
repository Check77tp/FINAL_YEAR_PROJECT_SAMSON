-- "Me too" upvotes on maintenance requests. Instead of 200 students each
-- filing the same broken-tap report, a student can upvote the existing one;
-- the count tells administrators how many people an issue affects.
-- Run once in the Supabase SQL Editor — the server code that uses this
-- table is already written and will fail without it.

-- One row per (request, student): the composite primary key is the database's
-- own guarantee that nobody can upvote the same request twice, even if the
-- service-layer check were ever bypassed.
create table public.request_upvotes (
  request_id integer not null references public.maintenance_requests (request_id) on delete cascade,
  user_id uuid not null references public.users (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

create index request_upvotes_request_id_idx on public.request_upvotes (request_id);

alter table public.request_upvotes enable row level security;

-- Students can only add/remove/see their own upvotes directly; counts shown
-- to everyone are computed by the server (service role), not read by students.
create policy "upvotes_insert_own" on public.request_upvotes
  for insert with check (auth.uid() = user_id);

create policy "upvotes_delete_own" on public.request_upvotes
  for delete using (auth.uid() = user_id);

create policy "upvotes_select_own" on public.request_upvotes
  for select using (auth.uid() = user_id);

create policy "upvotes_select_admin" on public.request_upvotes
  for select using (public.current_user_role() = 'administrator');

-- No GRANT needed: 003_grant_service_role_privileges.sql's default
-- privileges already cover new tables.
