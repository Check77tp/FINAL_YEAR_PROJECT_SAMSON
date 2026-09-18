// Business logic layer for student ratings. Framework-agnostic — no req/res
// objects here.
import * as ratingsRepository from '../repositories/ratings.repository.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import { httpError } from '../utils/httpError.js';

const RATABLE_STATUSES = ['resolved', 'closed'];

function mapRating(row) {
  if (!row) return null;
  return {
    requestId: row.request_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

// Student action: rate their own request, 1-5, once it's resolved or closed.
// One rating per request — the DB's unique constraint on request_id is the
// second line of defense if this check is ever bypassed.
export async function submitRating({ requestId, studentId, rating, comment }) {
  const request = await requestsRepository.findRequestById(requestId);
  if (!request) {
    throw httpError('Request not found', 404);
  }
  if (request.student_id !== studentId) {
    throw httpError('You can only rate your own requests', 403);
  }
  if (!RATABLE_STATUSES.includes(request.status)) {
    throw httpError('You can only rate a request once it is resolved or closed', 400);
  }

  const existing = await ratingsRepository.findRatingByRequestId(requestId);
  if (existing) {
    throw httpError('This request has already been rated', 400);
  }

  const row = await ratingsRepository.insertRating({ requestId, studentId, rating, comment });
  return mapRating(row);
}

export async function getRating(requestId) {
  const row = await ratingsRepository.findRatingByRequestId(requestId);
  return mapRating(row);
}
