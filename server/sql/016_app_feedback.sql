-- App feedback: a student (or technician) can leave a review of the SITE
-- ITSELF - a star rating plus an optional comment, separate from `ratings`
-- (which rates one technician's work on one resolved request). This gives
-- students who have no direct line to the developer a channel to be heard,
-- with an administrator-facing view to read what came in.
-- Safe to re-run: `create table if not exists` / `drop policy if exists`.

create table if not exists public.app_feedback (
  feedback_id serial primary key,
  user_id uuid not null references public.users (user_id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  category text not null default 'general' check (category in ('bug', 'suggestion', 'general')),
  message text,
  created_at timestamptz not null default now()
);

create index if not exists app_feedback_created_at_idx on public.app_feedback (created_at desc);

alter table public.app_feedback enable row level security;

-- Anyone signed in can leave feedback about the app, and read back their own
-- past submissions; only administrators can see everyone's.
drop policy if exists "app_feedback_insert_own" on public.app_feedback;
create policy "app_feedback_insert_own" on public.app_feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists "app_feedback_select_own" on public.app_feedback;
create policy "app_feedback_select_own" on public.app_feedback
  for select using (auth.uid() = user_id);

drop policy if exists "app_feedback_select_admin" on public.app_feedback;
create policy "app_feedback_select_admin" on public.app_feedback
  for select using (public.current_user_role() = 'administrator');

-- No new GRANT statements needed: 003_grant_service_role_privileges.sql
-- already covers every table via `alter default privileges`.
