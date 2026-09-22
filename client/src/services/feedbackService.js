import { apiGet, apiPost } from './api';
import { peekResponse } from './apiCache';

// A review of the app itself (not of one technician's work — see
// submitRating in requestsService.js for that).
export async function submitFeedback({ rating, category, message }) {
  const data = await apiPost('/feedback', { rating, category, message: message || null }, { auth: true });
  return data.feedback;
}

// The signed-in user's own past submissions.
export async function getMyFeedback() {
  const data = await apiGet('/feedback/mine', { auth: true });
  return data.items;
}
getMyFeedback.peek = () => peekResponse('/feedback/mine')?.items;

// Administrator: everything, plus the average rating.
export async function getAllFeedback() {
  return apiGet('/feedback', { auth: true });
}
getAllFeedback.peek = () => peekResponse('/feedback');
