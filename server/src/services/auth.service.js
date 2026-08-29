// Business logic layer for authentication. Framework-agnostic — no req/res
// objects here, so this is unit-testable in isolation.
import { supabase } from '../config/supabaseClient.js';
import * as usersRepository from '../repositories/users.repository.js';

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Public self-registration is intentionally limited to the student role —
// see the login_unza_maintenance design ("Sign up as Student"). Technician
// and administrator accounts are provisioned separately by an administrator,
// not through this open endpoint.
export async function registerStudent({ name, email, idNumber, password }) {
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
      role: 'student',
    });
  } catch (profileError) {
    // Compensating action: don't leave an orphaned auth.users row if the
    // profile insert fails (e.g. duplicate email/ID number at the table level).
    await supabase.auth.admin.deleteUser(authData.user.id);
    const message =
      profileError.code === '23505'
        ? 'Email or Student/Staff ID is already registered'
        : 'Could not create user profile';
    throw httpError(message, 400);
  }
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

  const { data, error } = await supabase.auth.signInWithPassword({
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

export async function verifyToken(accessToken) {
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw httpError('Invalid or expired token', 401);
  }

  const profile = await usersRepository.findUserProfileById(data.user.id);

  if (!profile) {
    throw httpError('User profile not found', 401);
  }

  return profile;
}
