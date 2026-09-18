import { apiGet } from './api';

export async function getRecentActivity() {
  const data = await apiGet('/activity/recent', { auth: true });
  return data.activity;
}
