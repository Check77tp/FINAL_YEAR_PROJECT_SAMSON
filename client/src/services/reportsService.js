import { apiGet } from './api';

export async function getAnalytics() {
  const data = await apiGet('/reports/analytics', { auth: true });
  return data.analytics;
}
