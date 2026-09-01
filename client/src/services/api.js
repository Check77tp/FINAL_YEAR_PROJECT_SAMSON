// Thin wrapper around fetch for calling the Express API.
// The client never talks to Supabase directly — every data access goes
// through this layer to the server's REST API.
import { getAccessToken } from './tokenStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch() itself throws (not an HTTP error response) when the request
    // never reached a server at all — no connection, DNS failure, etc.
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw new Error(
      offline
        ? "You're offline. Check your internet connection and try again."
        : 'Could not reach the server. It may be temporarily unavailable — please try again.'
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Request to ${path} failed with status ${response.status}`);
  }

  return data;
}

export const apiGet = (path, options) => request(path, { ...options, method: 'GET' });
export const apiPost = (path, body, options) => request(path, { ...options, method: 'POST', body });
export const apiPatch = (path, body, options) => request(path, { ...options, method: 'PATCH', body });
