-- Fixes "permission denied for table users" (Postgres error 42501) from the
-- Express server. The service role key bypasses Row Level Security, but RLS
-- bypass and table-level GRANTs are separate things in Postgres — 001 created
-- the tables without granting the service_role any privileges on them at all,
-- which 001 should have included from the start. Run this once against the
-- already-migrated project; it's folded into 001 for anyone setting up fresh.

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- So future tables created in this schema aren't silently missing this too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
