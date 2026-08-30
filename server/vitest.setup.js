// Dummy values so config/supabaseClient.js's fail-fast check doesn't throw
// while Vitest loads real repository modules to derive their auto-mock
// shape. Repositories are always mocked in service-layer unit tests, so no
// real Supabase call is ever made — these values just need to be present.
process.env.SUPABASE_URL ||= 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';
