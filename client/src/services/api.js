// Thin wrapper around fetch for calling the Express API.
// The client never talks to Supabase directly — every data access goes
// through this layer to the server's REST API.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API GET ${path} failed with status ${response.status}`);
  }
  return response.json();
}
