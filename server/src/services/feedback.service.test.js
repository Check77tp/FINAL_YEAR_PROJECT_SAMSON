import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as feedbackRepository from '../repositories/feedback.repository.js';
import { notifyAdministrators } from './push.service.js';
import { submitFeedback, listAllFeedback, listMyFeedback, assertWithinRateLimit, mapFeedback } from './feedback.service.js';

vi.mock('../repositories/feedback.repository.js');
vi.mock('./push.service.js');

const row = (id, over = {}) => ({
  feedback_id: id,
  user_id: 'u1',
  rating: 4,
  category: 'general',
  message: 'Works well overall',
  created_at: '2026-09-10T12:00:00Z',
  ...over,
});

describe('submitFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    feedbackRepository.insertFeedback.mockResolvedValue(row(1));
  });

  it('stores a valid submission and notifies administrators', async () => {
    const result = await submitFeedback({ userId: 'u1', rating: 4, category: 'suggestion', message: 'Add dark mode' });
    expect(feedbackRepository.insertFeedback).toHaveBeenCalledWith({
      userId: 'u1',
      rating: 4,
      category: 'suggestion',
      message: 'Add dark mode',
    });
    expect(notifyAdministrators).toHaveBeenCalledWith(expect.objectContaining({ url: '/app-feedback' }));
    expect(result.id).toBe(1);
  });

  it('an unrecognized category falls back to "general" rather than failing', async () => {
    await submitFeedback({ userId: 'u1', rating: 3, category: 'nonsense', message: null });
    expect(feedbackRepository.insertFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'general' })
    );
  });

  it('a blank/whitespace-only message is stored as null, not an empty string', async () => {
    await submitFeedback({ userId: 'u1', rating: 5, message: '   ' });
    expect(feedbackRepository.insertFeedback).toHaveBeenCalledWith(expect.objectContaining({ message: null }));
  });

  it.each([
    ['rating missing', { rating: undefined }],
    ['rating 0', { rating: 0 }],
    ['rating 6', { rating: 6 }],
    ['rating not a whole number', { rating: 3.5 }],
    ['message too long', { rating: 3, message: 'x'.repeat(1001) }],
  ])('rejects: %s', async (_label, patch) => {
    await expect(submitFeedback({ userId: 'u1', rating: 4, ...patch })).rejects.toMatchObject({ statusCode: 400 });
    expect(feedbackRepository.insertFeedback).not.toHaveBeenCalled();
  });

  it('rate-limits a user sending a lot of feedback in a short time', () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) assertWithinRateLimit('flooder', now);
    expect(() => assertWithinRateLimit('flooder', now)).toThrow(expect.objectContaining({ statusCode: 429 }));
  });
});

describe('listAllFeedback', () => {
  it('computes the average rating, rounded to one decimal', async () => {
    feedbackRepository.findAllFeedback.mockResolvedValue([row(1, { rating: 5 }), row(2, { rating: 3 }), row(3, { rating: 4 })]);
    const result = await listAllFeedback();
    expect(result.count).toBe(3);
    expect(result.averageRating).toBe(4);
  });

  it('averageRating is null (not NaN) when there is no feedback yet', async () => {
    feedbackRepository.findAllFeedback.mockResolvedValue([]);
    const result = await listAllFeedback();
    expect(result.averageRating).toBeNull();
    expect(result.items).toEqual([]);
  });
});

describe('listMyFeedback', () => {
  it("returns the user's own submissions, mapped", async () => {
    feedbackRepository.findFeedbackByUserId.mockResolvedValue([row(1), row(2)]);
    const result = await listMyFeedback('u1');
    expect(result).toHaveLength(2);
    expect(feedbackRepository.findFeedbackByUserId).toHaveBeenCalledWith('u1');
  });
});

describe('mapFeedback', () => {
  it('includes the author only when the row carries one (admin listing vs. own history)', () => {
    expect(mapFeedback(row(1)).author).toBeUndefined();
    expect(mapFeedback(row(1, { author: { name: 'Jane', role: 'student' } })).author).toEqual({
      name: 'Jane',
      role: 'student',
    });
  });
});
