import { apiGet, apiPost, apiPatch, apiDelete } from './api';
import { peekResponse } from './apiCache';

// -> { schedules, frequencies }
export async function getSchedules() {
  return apiGet('/schedules', { auth: true });
}
getSchedules.peek = () => peekResponse('/schedules');

export async function createSchedule(values) {
  const data = await apiPost('/schedules', values, { auth: true });
  return data.schedule;
}

export async function setScheduleActive(id, active) {
  return apiPatch(`/schedules/${id}`, { active }, { auth: true });
}

export async function deleteSchedule(id) {
  return apiDelete(`/schedules/${id}`, { auth: true });
}

// Creates this schedule's maintenance task right now -> { scheduleId, requestId }
export async function runScheduleNow(id) {
  return apiPost(`/schedules/${id}/run-now`, {}, { auth: true });
}
