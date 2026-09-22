// Business logic layer for app feedback. Framework-agnostic — no req/res
// objects here.
//
// This is a review of the SITE ITSELF (a star rating + optional comment),
// not of one technician's work on one request — that is the separate
// `ratings` table/flow. It exists so a student who has no direct line to the
// developer still has a channel to be heard; an administrator can read what
// comes in.
import * as feedbackRepository from '../repositories/feedback.repository.js';
import { notifyAdministrators } from './push.service.js';
import { httpError } from '../utils/httpError.js';

const MESSAGE_MAX = 1000;
export const CATEGORIES = ['bug', 'suggestion', 'general'];

// Simple per-user flood guard (in memory), same pattern as comments.service.js.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 5;
const recentSubmissions = new Map();

export function assertWithinRateLimit(userId, now = Date.now()) {
  const posts = (recentSubmissions.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (posts.length >= RATE_MAX) {
    throw httpError('You have sent a lot of feedback recently - please try again later', 429);
  }
  posts.push(now);
  recentSubmissions.set(userId, posts);
}

export function mapFeedback(row) {
  return {
    id: row.feedback_id,
    rating: row.rating,
    category: row.category,
    message: row.message,
    createdAt: row.created_at,
    author: row.author ? { name: row.author.name, role: row.author.role } : undefined,
  };
}

export async function submitFeedback({ userId, rating, category, message }) {
  const cleanRating = Number(rating);
  if (!Number.isInteger(cleanRating) || cleanRating < 1 || cleanRating > 5) {
    throw httpError('Rating must be a whole number from 1 to 5', 400);
  }

  const cleanCategory = CATEGORIES.includes(category) ? category : 'general';

  const cleanMessage = typeof message === 'string' && message.trim() ? message.trim() : null;
  if (cleanMessage && cleanMessage.length > MESSAGE_MAX) {
    throw httpError(`Feedback is limited to ${MESSAGE_MAX} characters`, 400);
  }

  assertWithinRateLimit(userId);

  const row = await feedbackRepository.insertFeedback({
    userId,
    rating: cleanRating,
    category: cleanCategory,
    message: cleanMessage,
  });

  // Side effect only — never blocks or fails the submission.
  void notifyAdministrators({
    title: `New app feedback (${cleanRating}★)`,
    body: cleanMessage ? cleanMessage.slice(0, 100) : `${CATEGORIES.includes(cleanCategory) ? cleanCategory : 'general'} feedback, no comment`,
    url: '/app-feedback',
    tag: 'app-feedback',
  });

  return mapFeedback(row);
}

// Administrator: everything, plus the average rating so far.
export async function listAllFeedback() {
  const rows = await feedbackRepository.findAllFeedback();
  const items = rows.map(mapFeedback);
  const averageRating = items.length
    ? Math.round((items.reduce((sum, f) => sum + f.rating, 0) / items.length) * 10) / 10
    : null;
  return { items, averageRating, count: items.length };
}

// A user's own submission history.
export async function listMyFeedback(userId) {
  const rows = await feedbackRepository.findFeedbackByUserId(userId);
  return rows.map(mapFeedback);
}
