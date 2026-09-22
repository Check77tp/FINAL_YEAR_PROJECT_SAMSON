// Thin wrapper around fetch for calling the Express API.
// The client never talks to Supabase directly — every data access goes
// through this layer to the server's REST API.
import { getAccessToken } from './tokenStorage';
import { cacheResponse, clearApiCache } from './apiCache';

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
    // isNetworkError lets callers (e.g. the offline draft queue) tell this
    // apart from a real validation/server error without parsing the
    // message text.
    //
    // navigator.onLine only reflects whether the network adapter thinks it
    // has a link (e.g. connected to a router) — it stays `true` even when
    // that connection has no real internet behind it, which is a common
    // case on hostel wifi. So `onLine === false` is trustworthy (definitely
    // offline), but `onLine === true` is not proof of the opposite. When
    // we're not sure, lead with "check your connection" rather than
    // confidently blaming the server.
    const definitelyOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const networkError = new Error(
      definitelyOffline
        ? "You're offline. Check your internet connection and try again."
        : "Could not reach the server. Check your internet connection — if you're online, the server may be temporarily unavailable. Please try again."
    );
    networkError.isNetworkError = true;
    throw networkError;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Request to ${path} failed with status ${response.status}`);
  }

  // Keep the newest authenticated GET result for instant re-display (see
  // apiCache.js); any write invalidates everything cached.
  if (auth && method === 'GET') cacheResponse(path, data);
  else if (method !== 'GET') clearApiCache();

  return data;
}

export const apiGet = (path, options) => request(path, { ...options, method: 'GET' });
export const apiPost = (path, body, options) => request(path, { ...options, method: 'POST', body });
export const apiPatch = (path, body, options) => request(path, { ...options, method: 'PATCH', body });
export const apiPut = (path, body, options) => request(path, { ...options, method: 'PUT', body });
export const apiDelete = (path, options) => request(path, { ...options, method: 'DELETE' });
