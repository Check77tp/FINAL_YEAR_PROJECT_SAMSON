import { apiGet } from './api';

export async function getTechnicians() {
  const data = await apiGet('/users/technicians', { auth: true });
  return data.technicians;
}
