// Business logic layer for comments on a request. Framework-agnostic — no
// req/res objects here.
//
// Who may take part: the student who reported the request, the technician it
// is assigned to, and administrators — nobody else, exactly like reading the
// request itself. Posting also notifies the other people involved.
import * as commentsRepository from '../repositories/comments.repository.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import { notifyUser, notifyAdministrators } from './push.service.js';
import { announceRequestChange } from './events.service.js';
import { httpError } from '../utils/httpError.js';

const MAX_BODY_CHARS = 1000;

// Simple per-user flood guard (in memory): 15 comments a minute is far more
// than a real conversation needs.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 15;
const recentPosts = new Map();

export function assertWithinRateLimit(userId, now = Date.now()) {
  const posts = (recentPosts.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (posts.length >= RATE_MAX) {
    throw httpError('You are commenting too quickly - please wait a moment', 429);
  }
  posts.push(now);
  recentPosts.set(userId, posts);
}

export function mapComment(row) {
  return {
    id: row.comment_id,
    body: row.body,
    createdAt: row.created_at,
    author: row.author
      ? { id: row.author.user_id, name: row.author.name, role: row.author.role }
      : null,
  };
}

// Loads the request and checks the acting user belongs to its conversation.
// Returns the request plus the current technician (if any).
async function loadConversation({ requestId, actingUser }) {
  const request = await requestsRepository.findRequestById(requestId);
  if (!request) {
    throw httpError('Request not found', 404);
  }

  const assignment = await requestsRepository.findCurrentAssignment(requestId);
  const technicianId = assignment?.technician_id ?? null;

  const isOwner = actingUser.role === 'student' && request.student_id === actingUser.user_id;
  const isAssigned = actingUser.role === 'technician' && technicianId === actingUser.user_id;
  const isAdmin = actingUser.role === 'administrator';

  if (!isOwner && !isAssigned && !isAdmin) {
    throw httpError('You are not part of this request', 403);
  }
  return { request, technicianId };
}

export async function listComments({ requestId, actingUser }) {
  await loadConversation({ requestId, actingUser });
  const rows = await commentsRepository.findCommentsByRequestId(requestId);
  return rows.map(mapComment);
}

export async function addComment({ requestId, actingUser, body }) {
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) {
    throw httpError('Write something before sending', 400);
  }
  if (text.length > MAX_BODY_CHARS) {
    throw httpError(`Comments are limited to ${MAX_BODY_CHARS} characters`, 400);
  }

  const { request, technicianId } = await loadConversation({ requestId, actingUser });
  if (request.status === 'closed') {
    throw httpError('This request is closed, so it can no longer be commented on', 400);
  }
  assertWithinRateLimit(actingUser.user_id);

  const row = await commentsRepository.insertComment({
    requestId,
    authorId: actingUser.user_id,
    body: text,
  });

  // Tell everyone else in the conversation (never the author).
  const preview = text.length > 90 ? `${text.slice(0, 87)}...` : text;
  const payload = (url) => ({
    title: `New comment on request #${requestId}`,
    body: `${actingUser.name}: ${preview}`,
    url,
    tag: `comment-${requestId}`,
  });

  if (request.student_id !== actingUser.user_id) {
    void notifyUser(request.student_id, payload(`/requests/${requestId}`));
  }
  if (technicianId && technicianId !== actingUser.user_id) {
    void notifyUser(technicianId, payload(`/tasks/${requestId}`));
  }
  if (actingUser.role !== 'administrator') {
    void notifyAdministrators(payload(`/manage-requests/${requestId}`));
  }

  // Open pages of the people involved refresh themselves.
  announceRequestChange({
    requestId,
    userIds: [request.student_id, technicianId],
    actorId: actingUser.user_id,
    message: `New comment on request #${requestId}`,
  });

  return mapComment(row);
}
