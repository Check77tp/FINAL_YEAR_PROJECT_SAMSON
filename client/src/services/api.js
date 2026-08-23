// Thin wrapper around fetch for calling the Express API.
// The client never talks to Supabase directly — every data access goes
// through this layer to the server's REST API.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = localStorage.getItem('access_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Request to ${path} failed with status ${response.status}`);
  }

  return data;
}

export const apiGet = (path, options) => request(path, { ...options, method: 'GET' });
export const apiPost = (path, body, options) => request(path, { ...options, method: 'POST', body });
