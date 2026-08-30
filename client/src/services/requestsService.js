import { apiGet } from './api';

export async function getMyRequests() {
  const data = await apiGet('/requests/mine', { auth: true });
  return data.requests;
}
