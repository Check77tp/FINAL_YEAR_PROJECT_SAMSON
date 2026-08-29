-- Adds the student/staff ID number used as the default login credential
-- (see CLAUDE.md "Authentication: ID-Based Login"). Already applied manually
-- to the live database — this file exists so the migration is tracked in git.

ALTER TABLE public.users ADD COLUMN id_number text UNIQUE;
