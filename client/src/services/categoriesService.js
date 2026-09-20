import { apiGet } from './api';
import { peekResponse } from './apiCache';

export async function getCategories() {
  const data = await apiGet('/categories', { auth: true });
  return data.categories;
}

getCategories.peek = () => peekResponse('/categories')?.categories;
