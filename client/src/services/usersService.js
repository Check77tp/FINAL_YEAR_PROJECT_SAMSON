import { apiGet, apiPatch } from './api';

export async function getTechnicians() {
  const data = await apiGet('/users/technicians', { auth: true });
  return data.technicians;
}

export async function setOwnAvailability(availabilityStatus) {
  return apiPatch('/users/me/availability', { availabilityStatus }, { auth: true });
}
