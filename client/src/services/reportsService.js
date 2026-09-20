import { apiGet, apiPost } from './api';
import { peekResponse } from './apiCache';

export async function getAnalytics() {
  const data = await apiGet('/reports/analytics', { auth: true });
  return data.analytics;
}

getAnalytics.peek = () => peekResponse('/reports/analytics')?.analytics;

// Emails the weekly summary to the signed-in administrator. Resolves with
// { sentTo }.
export function emailWeeklySummary() {
  return apiPost('/reports/digest/send', {}, { auth: true });
}
