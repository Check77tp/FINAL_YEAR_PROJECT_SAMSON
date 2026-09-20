import { apiGet } from './api';
import { peekResponse } from './apiCache';

export async function getRecentActivity() {
  const data = await apiGet('/activity/recent', { auth: true });
  return data.activity;
}

getRecentActivity.peek = () => peekResponse('/activity/recent')?.activity;
