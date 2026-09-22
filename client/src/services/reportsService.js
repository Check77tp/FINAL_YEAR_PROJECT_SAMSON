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

// Faults that keep coming back to the same room / building (administrators).
export async function getRecurringIssues() {
  const data = await apiGet('/reports/recurring', { auth: true });
  return data.issues;
}
getRecurringIssues.peek = () => peekResponse('/reports/recurring')?.issues;

// Administrators: every technician's numbers over a window (7/30/90/365 days, 0 = all time).
export async function getTechnicianPerformance(days = 30) {
  return apiGet(`/reports/technician-performance?days=${days}`, { auth: true });
}
getTechnicianPerformance.peek = (days = 30) => peekResponse(`/reports/technician-performance?days=${days}`);

// Technicians: their own scorecard and rank.
export async function getMyPerformance(days = 30) {
  return apiGet(`/reports/my-performance?days=${days}`, { auth: true });
}
getMyPerformance.peek = (days = 30) => peekResponse(`/reports/my-performance?days=${days}`);
