// Business logic layer for request upvotes. Framework-agnostic — no req/res
// objects here.
//
// Why upvotes exist: without them, every student affected by the same broken
// pipe files their own report. Upvoting the existing request keeps the queue
// small and gives administrators a real "how many people does this affect"
// signal for prioritising.
import * as upvotesRepository from '../repositories/upvotes.repository.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import { httpError } from '../utils/httpError.js';
import { isPreventiveDescription } from '../utils/preventive.js';

const UPVOTABLE_STATUSES = ['open', 'assigned', 'in_progress'];
const COMMUNITY_FEED_LIMIT = 12;

// An issue this many students have backed is clearly not confined to one
// building, so it is shown to EVERY student, whatever their hostel - they can
// back it too instead of filing yet another duplicate.
export const CAMPUS_WIDE_UPVOTE_THRESHOLD = 30;

// { requestId -> count } from raw upvote rows.
export function countByRequest(upvoteRows) {
  const counts = new Map();
  for (const row of upvoteRows) {
    counts.set(row.request_id, (counts.get(row.request_id) || 0) + 1);
  }
  return counts;
}

// Pure ranking rule, kept separate so it can be unit-tested without a
// database: other students' active requests, optionally limited to one
// hostel - EXCEPT widespread issues (>= CAMPUS_WIDE_UPVOTE_THRESHOLD votes),
// which are shown to everyone - most-upvoted first (ties: newest first),
// capped for the UI strip.
export function rankCommunityRequests({ rows, upvoteRows, studentId, hostel }) {
  const counts = countByRequest(upvoteRows);
  const mine = new Set(upvoteRows.filter((u) => u.user_id === studentId).map((u) => u.request_id));

  return rows
    .filter((row) => row.student_id !== studentId)
    // Scheduled preventive tasks are not student reports - nobody can "me too" them.
    .filter((row) => !isPreventiveDescription(row.description))
    .filter(
      (row) =>
        !hostel ||
        row.hostel === hostel ||
        (counts.get(row.request_id) || 0) >= CAMPUS_WIDE_UPVOTE_THRESHOLD
    )
    .map((row) => ({
      requestId: row.request_id,
      description: row.description,
      status: row.status,
      hostel: row.hostel,
      priority: row.priority,
      createdAt: row.created_at,
      category: row.category ? { id: row.category.category_id, name: row.category.name } : null,
      upvoteCount: counts.get(row.request_id) || 0,
      campusWide: (counts.get(row.request_id) || 0) >= CAMPUS_WIDE_UPVOTE_THRESHOLD,
      hasUpvoted: mine.has(row.request_id),
    }))
    .sort(
      (a, b) => b.upvoteCount - a.upvoteCount || new Date(b.createdAt) - new Date(a.createdAt)
    )
    .slice(0, COMMUNITY_FEED_LIMIT);
}

// Student action: the feed of issues other students have already reported.
// With no explicit hostel, defaults to the hostel of the student's own most
// recent request — the best available signal for "where do they live".
export async function listCommunityRequests({ studentId, hostel }) {
  const [rows, upvoteRows] = await Promise.all([
    requestsRepository.findActiveRequestsForCommunity(),
    upvotesRepository.findAllUpvotes(),
  ]);

  let effectiveHostel = hostel || null;
  if (!effectiveHostel) {
    const own = await requestsRepository.findRequestsByStudentId(studentId);
    effectiveHostel = own.find((r) => r.hostel)?.hostel || null;
  }

  return {
    hostel: effectiveHostel,
    requests: rankCommunityRequests({ rows, upvoteRows, studentId, hostel: effectiveHostel }),
  };
}

async function loadUpvotableRequest({ requestId, studentId }) {
  const request = await requestsRepository.findRequestById(requestId);
  if (!request) {
    throw httpError('Request not found', 404);
  }
  if (request.student_id === studentId) {
    throw httpError('You cannot upvote your own request', 400);
  }
  if (!UPVOTABLE_STATUSES.includes(request.status)) {
    throw httpError('This request is already resolved, so it can no longer be upvoted', 400);
  }
  return request;
}

// Idempotent: upvoting twice is not an error, the second call is a no-op
// (the composite primary key is the backstop — Postgres 23505).
export async function addUpvote({ requestId, studentId }) {
  await loadUpvotableRequest({ requestId, studentId });

  try {
    await upvotesRepository.insertUpvote({ requestId, userId: studentId });
  } catch (err) {
    if (err.code !== '23505') throw err;
  }

  const upvoteCount = await upvotesRepository.countUpvotesForRequest(requestId);
  return { requestId, hasUpvoted: true, upvoteCount };
}

export async function removeUpvote({ requestId, studentId }) {
  await loadUpvotableRequest({ requestId, studentId });
  await upvotesRepository.deleteUpvote({ requestId, userId: studentId });

  const upvoteCount = await upvotesRepository.countUpvotesForRequest(requestId);
  return { requestId, hasUpvoted: false, upvoteCount };
}
