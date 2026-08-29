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

// A throwaway client for anything under supabase.auth.* that verifies a USER
// (signInWithPassword, getUser, etc.) — never the shared `supabase` client
// above. supabase-js mutates a client's own session after calls like
// signInWithPassword(), which then swaps that SAME client's outgoing
// Authorization header from the service role key to the signed-in user's own
// JWT for every later request — silently downgrading every subsequent
// service-role table query, for every user, until the next sign-in
// overwrites it again. A fresh, disposable client per call keeps that
// mutation from ever touching the shared admin client.
export function createAuthClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
