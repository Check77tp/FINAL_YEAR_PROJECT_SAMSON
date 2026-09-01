import { apiGet, apiPost, apiPatch } from './api';

export async function getMyRequests() {
  const data = await apiGet('/requests/mine', { auth: true });
  return data.requests;
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
