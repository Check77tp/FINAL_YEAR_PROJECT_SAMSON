// Business logic layer for authentication. Framework-agnostic — no req/res
// objects here, so this is unit-testable in isolation.
import { supabase, createAuthClient } from '../config/supabaseClient.js';
import * as usersRepository from '../repositories/users.repository.js';
import { httpError } from '../utils/httpError.js';

// Shared by registerStudent (public, student-only) and provisionStaffAccount
// (administrator-only, see below) — the only two ways an account comes into
// existence in this system.
async function createUserAccount({ name, email, idNumber, password, role }) {
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    throw httpError(authError.message, 400);
  }

  try {
    return await usersRepository.insertUserProfile({
      userId: authData.user.id,
      name,
      email,
      idNumber,
      role,
    });
  } catch (profileError) {
    // Compensating action: don't leave an orphaned auth.users row if the
    // profile insert fails (e.g. duplicate email/ID number at the table level).
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.error('Profile insert failed during account creation:', profileError);
    const message =
      profileError.code === '23505'
        ? 'Email or Student/Staff ID is already registered'
        : 'Could not create user profile';
    throw httpError(message, 400);
  }
}

// Public self-registration is intentionally limited to the student role —
// see the login_unza_maintenance design ("Sign up as Student"). Technician
// and administrator accounts are provisioned separately by an administrator,
// not through this open endpoint — see provisionStaffAccount below.
export async function registerStudent({ name, email, idNumber, password }) {
  return createUserAccount({ name, email, idNumber, password, role: 'student' });
}

const STAFF_ROLES = ['technician', 'administrator'];

// Administrator action (User Management page): the only way a technician or
// administrator account comes into existence — there is no public sign-up
// for either role.
export async function provisionStaffAccount({ name, email, idNumber, password, role }) {
  if (!STAFF_ROLES.includes(role)) {
    throw httpError(`role must be one of: ${STAFF_ROLES.join(', ')}`, 400);
  }
  return createUserAccount({ name, email, idNumber, password, role });
}

// Per CLAUDE.md "Authentication: ID-Based Login": the client sends either an
// ID number (default/primary field) or an email (fallback). The ID number is
// resolved to an email here, server-side, before calling Supabase Auth — the
// client never talks to Supabase directly and never needs to know the email
// exists behind the ID number.
export async function login({ idNumber, email, password }) {
  let resolvedEmail = email;
  let invalidCredentialsMessage = 'Invalid email or password';

  if (idNumber) {
    invalidCredentialsMessage = 'Invalid ID number or password';
    resolvedEmail = await usersRepository.findEmailByIdNumber(idNumber);
    if (!resolvedEmail) {
      throw httpError(invalidCredentialsMessage, 401);
    }
  }

  const { data, error } = await createAuthClient().auth.signInWithPassword({
    email: resolvedEmail,
    password,
  });

  if (error) {
    throw httpError(invalidCredentialsMessage, 401);
  }

  const profile = await usersRepository.findUserProfileById(data.user.id);

  return {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
    user: profile,
  };
}

// verifyToken costs two network round trips to Supabase (validate the JWT,
// then load the profile), and it runs on EVERY protected request. A short-
// lived in-memory cache means a burst of requests from one page load pays
// that cost once. The trade-off is that a deactivated user or changed role
// can take up to TOKEN_CACHE_TTL_MS to take effect — acceptable at 30s, and
// far shorter than the JWT's own lifetime.
const TOKEN_CACHE_TTL_MS = 30_000;
const TOKEN_CACHE_MAX_ENTRIES = 500;
const tokenCache = new Map();

// Called after any change to a user's profile so the next request re-reads it.
export function clearTokenCache() {
  tokenCache.clear();
}

export async function verifyToken(accessToken) {
  const hit = tokenCache.get(accessToken);
  if (hit && hit.expiresAt > Date.now()) return hit.profile;

  const { data, error } = await createAuthClient().auth.getUser(accessToken);

  if (error || !data.user) {
    throw httpError('Invalid or expired token', 401);
  }

  const profile = await usersRepository.findUserProfileById(data.user.id);

  if (!profile) {
    throw httpError('User profile not found', 401);
  }

  if (tokenCache.size >= TOKEN_CACHE_MAX_ENTRIES) tokenCache.clear();
  tokenCache.set(accessToken, { profile, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });

  return profile;
}
