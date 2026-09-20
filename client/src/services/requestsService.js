import { apiGet, apiPost, apiPatch } from './api';
import { peekResponse } from './apiCache';

// Each getter has a .peek() returning the last-seen data (or undefined) so a
// page can render instantly while the real fetch refreshes it — see apiCache.js.

export async function getMyRequests() {
  const data = await apiGet('/requests/mine', { auth: true });
  return data.requests;
}

export async function createRequest({ categoryId, description, photoDataUrl, hostel, room, priority }) {
  const data = await apiPost(
    '/requests',
    { categoryId, description, photo: photoDataUrl || undefined, hostel, room, priority },
    { auth: true }
  );
  return data.request;
}

export async function getAllRequests() {
  const data = await apiGet('/requests', { auth: true });
  return data.requests;
}

export async function getAssignedRequests() {
  const data = await apiGet('/requests/assigned-to-me', { auth: true });
  return data.requests;
}

export async function getRequestDetail(requestId) {
  const data = await apiGet(`/requests/${requestId}`, { auth: true });
  return data.request;
}

export async function assignTechnician(requestId, technicianId) {
  return apiPost(`/requests/${requestId}/assign`, { technicianId }, { auth: true });
}

export async function updateRequestStatus(requestId, status) {
  return apiPatch(`/requests/${requestId}/status`, { status }, { auth: true });
}

export async function updateRequestPriority(requestId, priority) {
  return apiPatch(`/requests/${requestId}/priority`, { priority }, { auth: true });
}

export async function submitRating(requestId, rating, comment) {
  const data = await apiPost(`/requests/${requestId}/rating`, { rating, comment }, { auth: true });
  return data.rating;
}

getMyRequests.peek = () => peekResponse('/requests/mine')?.requests;
getAllRequests.peek = () => peekResponse('/requests')?.requests;
getAssignedRequests.peek = () => peekResponse('/requests/assigned-to-me')?.requests;
getRequestDetail.peek = (requestId) => peekResponse(`/requests/${requestId}`)?.request;
