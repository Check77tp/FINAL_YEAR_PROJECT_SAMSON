-- Proof of work: when a technician marks a request Resolved they attach a
-- photo of the completed repair (and optionally a note). Run once in the
-- Supabase SQL Editor.
--
-- Kept in its own table (one row per request) rather than new columns on
-- maintenance_requests, so every existing query keeps working even before
-- this migration is run — only resolving a request needs it.
create table public.resolution_proofs (
  request_id integer primary key references public.maintenance_requests (request_id) on delete cascade,
  photo_url text not null,
  note text,
  submitted_by uuid not null references public.users (user_id),
  created_at timestamptz not null default now()
);

alter table public.resolution_proofs enable row level security;

-- The assigned technician may add proof; students see proof for their own
-- requests; administrators see everything. (The server, using the service
-- role, is what actually reads and writes this in practice.)
create policy "proofs_insert_assigned_technician" on public.resolution_proofs
  for insert with check (
    auth.uid() = submitted_by
    and exists (
      select 1 from public.technician_assignments ta
      where ta.request_id = resolution_proofs.request_id
        and ta.technician_id = auth.uid()
    )
  );

create policy "proofs_select_owner_student" on public.resolution_proofs
  for select using (
    exists (
      select 1 from public.maintenance_requests r
      where r.request_id = resolution_proofs.request_id
        and r.student_id = auth.uid()
    )
  );

create policy "proofs_select_assigned_technician" on public.resolution_proofs
  for select using (
    exists (
      select 1 from public.technician_assignments ta
      where ta.request_id = resolution_proofs.request_id
        and ta.technician_id = auth.uid()
    )
  );

create policy "proofs_select_admin" on public.resolution_proofs
  for select using (public.current_user_role() = 'administrator');

-- No GRANT needed: 003_grant_service_role_privileges.sql's default
-- privileges already cover new tables.
