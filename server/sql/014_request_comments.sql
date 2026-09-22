-- Comments on a request: a short conversation between the student who
-- reported it, the assigned technician and the administrators ("Which tap is
-- it?", "It's the one in the shower"). Run once in the Supabase SQL Editor.
-- SAFE TO RE-RUN.

create table if not exists public.request_comments (
  comment_id serial primary key,
  request_id integer not null references public.maintenance_requests (request_id) on delete cascade,
  author_id uuid not null references public.users (user_id),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists request_comments_request_idx
  on public.request_comments (request_id, created_at);

alter table public.request_comments enable row level security;

-- Only the people involved in a request can read or write its comments:
-- the student who reported it, the assigned technician, and administrators.
drop policy if exists "comments_select_involved" on public.request_comments;
create policy "comments_select_involved" on public.request_comments
  for select using (
    public.current_user_role() = 'administrator'
    or exists (
      select 1 from public.maintenance_requests r
      where r.request_id = request_comments.request_id and r.student_id = auth.uid()
    )
    or exists (
      select 1 from public.technician_assignments ta
      where ta.request_id = request_comments.request_id and ta.technician_id = auth.uid()
    )
  );

drop policy if exists "comments_insert_involved" on public.request_comments;
create policy "comments_insert_involved" on public.request_comments
  for insert with check (
    auth.uid() = author_id
    and (
      public.current_user_role() = 'administrator'
      or exists (
        select 1 from public.maintenance_requests r
        where r.request_id = request_comments.request_id and r.student_id = auth.uid()
      )
      or exists (
        select 1 from public.technician_assignments ta
        where ta.request_id = request_comments.request_id and ta.technician_id = auth.uid()
      )
    )
  );

-- No GRANT needed: 003_grant_service_role_privileges.sql's default
-- privileges already cover new tables.
