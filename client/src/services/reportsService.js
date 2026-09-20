import { apiGet } from './api';
import { peekResponse } from './apiCache';

export async function getAnalytics() {
  const data = await apiGet('/reports/analytics', { auth: true });
  return data.analytics;
}

getAnalytics.peek = () => peekResponse('/reports/analytics')?.analytics;
