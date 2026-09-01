import { apiGet } from './api';

export async function getCategories() {
  const data = await apiGet('/categories', { auth: true });
  return data.categories;
}
