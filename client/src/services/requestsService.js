import { apiGet, apiPost, apiPatch, apiDelete } from './api';
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

// Other students' active requests (no names) for the "already reported?"
// feed. Returns { hostel, requests }.
export async function getCommunityRequests(hostel) {
  return apiGet(communityPath(hostel), { auth: true });
}

function communityPath(hostel) {
  return hostel ? `/requests/community?hostel=${encodeURIComponent(hostel)}` : '/requests/community';
}

// Suggested { categoryId, priority, reason, source: 'ai'|'rules' } for a
// description. Advisory only - nothing is saved.
export async function getTriageSuggestion(description) {
  const data = await apiPost('/requests/triage', { description }, { auth: true });
  return data.suggestion;
}

// Both return { requestId, hasUpvoted, upvoteCount }.
export async function upvoteRequest(requestId) {
  return apiPost(`/requests/${requestId}/upvote`, {}, { auth: true });
}

export async function removeUpvote(requestId) {
  return apiDelete(`/requests/${requestId}/upvote`, { auth: true });
}

getCommunityRequests.peek = (hostel) => peekResponse(communityPath(hostel));
getMyRequests.peek = () => peekResponse('/requests/mine')?.requests;
getAllRequests.peek = () => peekResponse('/requests')?.requests;
getAssignedRequests.peek = () => peekResponse('/requests/assigned-to-me')?.requests;
getRequestDetail.peek = (requestId) => peekResponse(`/requests/${requestId}`)?.request;
