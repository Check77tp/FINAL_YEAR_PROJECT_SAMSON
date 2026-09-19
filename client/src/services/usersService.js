import { apiGet, apiPatch } from './api';

export async function getTechnicians() {
  const data = await apiGet('/users/technicians', { auth: true });
  return data.technicians;
}

export async function setOwnAvailability(availabilityStatus) {
  return apiPatch('/users/me/availability', { availabilityStatus }, { auth: true });
}

export async function updateOwnProfile({ name, photoDataUrl }) {
  const data = await apiPatch('/users/me', { name, photo: photoDataUrl || undefined }, { auth: true });
  return data.user;
}
