-- Web Push subscriptions: one row per browser/device a user has allowed
-- notifications on. A user can have several (phone + laptop), so this is
-- one-to-many from users. The endpoint is globally unique — it's the address
-- of that specific browser's push service — so re-subscribing the same
-- browser updates the row instead of duplicating it.
-- Run once in the Supabase SQL Editor.

create table public.push_subscriptions (
  subscription_id serial primary key,
  user_id uuid not null references public.users (user_id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- A user may only see/manage their own device subscriptions. The server
-- (service role) reads every row when it needs to send a notification.
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- No GRANT needed: 003_grant_service_role_privileges.sql's default
-- privileges already cover new tables.
