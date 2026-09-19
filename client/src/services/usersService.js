import { apiGet, apiPatch, apiPost } from './api';

export async function getTechnicians() {
  const data = await apiGet('/users/technicians', { auth: true });
  return data.technicians;
}

export async function getAllUsers() {
  const data = await apiGet('/users', { auth: true });
  return data.users;
}

export async function createStaffAccount({ name, email, idNumber, password, role }) {
  const data = await apiPost(
    '/users',
    { name, email, id_number: idNumber, password, role },
    { auth: true }
  );
  return data.user;
}

export async function setOwnAvailability(availabilityStatus) {
  return apiPatch('/users/me/availability', { availabilityStatus }, { auth: true });
}

export async function updateOwnProfile({ name, photoDataUrl }) {
  const data = await apiPatch('/users/me', { name, photo: photoDataUrl || undefined }, { auth: true });
  return data.user;
}
