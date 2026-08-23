import { apiGet, apiPost } from './api';

export function registerRequest(name, email, password) {
  return apiPost('/auth/register', { name, email, password });
}

export function loginRequest(email, password) {
  return apiPost('/auth/login', { email, password });
}

export async function getCurrentUser() {
  const data = await apiGet('/auth/me', { auth: true });
  return data.user;
}
