import { apiGet, apiPost } from './api';

export function registerRequest({ name, email, idNumber, password }) {
  return apiPost('/auth/register', { name, email, id_number: idNumber, password });
}

// idNumber is the default/primary credential; email is the fallback path
// (see CLAUDE.md "Authentication: ID-Based Login"). Pass whichever the user
// is signing in with — the server resolves ID number to email itself.
export function loginRequest({ idNumber, email, password }) {
  return apiPost('/auth/login', { id_number: idNumber, email, password });
}

export async function getCurrentUser() {
  const data = await apiGet('/auth/me', { auth: true });
  return data.user;
}
