import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { peekResponse } from './apiCache';

// Students: the announcements that apply to them. Administrators: all of them.
export async function getAnnouncements() {
  const data = await apiGet('/announcements', { auth: true });
  return data.announcements;
}
getAnnouncements.peek = () => peekResponse('/announcements')?.announcements;

// hostel: '' or null = all hostels. expiresAt: ISO string or null.
export async function createAnnouncement({ title, message, hostel, expiresAt }) {
  return apiPost('/announcements', { title, message, hostel: hostel || null, expiresAt: expiresAt || null }, { auth: true });
}

export async function deleteAnnouncement(id) {
  return apiDelete(`/announcements/${id}`, { auth: true });
}

// A student's own hostel (used to target announcements).
export async function getMyHostel() {
  const data = await apiGet('/announcements/hostel/me', { auth: true });
  return data.hostel;
}

export async function setMyHostel(hostel) {
  const data = await apiPut('/announcements/hostel/me', { hostel }, { auth: true });
  return data.hostel;
}
