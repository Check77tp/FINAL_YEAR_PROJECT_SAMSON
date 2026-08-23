// Server-side Supabase client. This is the ONLY place Supabase is imported —
// the client (PWA) never talks to Supabase directly (see CLAUDE.md architecture).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. Check your .env file against .env.example.'
  );
}

// Service role key is used because the server enforces access control itself
// (routes/services), with RLS policies as a second line of defense.
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
