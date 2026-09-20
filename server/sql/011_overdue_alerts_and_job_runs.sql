-- Supports two background jobs. Run once in the Supabase SQL Editor.
--
-- 1. Overdue alerts: remember that we already told people a request is
--    overdue, so the monitor alerts ONCE per request instead of every check.
alter table public.maintenance_requests
  add column overdue_notified_at timestamptz;

-- 2. Job bookkeeping: the last time each scheduled job (e.g. the weekly
--    summary email) actually ran. Stored in the database rather than memory
--    so a server restart on a free host can't cause a duplicate send.
create table public.job_runs (
  job_name text primary key,
  last_run_at timestamptz not null default now()
);

-- Internal table: RLS on with no policies means only the server (service
-- role) can read or write it; no end user can.
alter table public.job_runs enable row level security;

-- No GRANT needed: 003_grant_service_role_privileges.sql's default
-- privileges already cover new tables.
