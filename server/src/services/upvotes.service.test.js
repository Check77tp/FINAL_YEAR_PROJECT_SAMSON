// Unit tests for the upvote business rules. Repositories are mocked, so no
// database is involved — this checks the rules themselves: who may upvote
// what, and how the community feed is filtered and ranked.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as upvotesRepository from '../repositories/upvotes.repository.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import { addUpvote, removeUpvote, rankCommunityRequests, listCommunityRequests } from './upvotes.service.js';

vi.mock('../repositories/upvotes.repository.js');
vi.mock('../repositories/requests.repository.js');

const row = (id, over = {}) => ({
  request_id: id,
  student_id: 'other',
  description: `issue ${id}`,
  status: 'open',
  hostel: 'Kalingalinga',
  priority: 'medium',
  created_at: `2026-09-0${id}T10:00:00Z`,
  category: { category_id: 1, name: 'Plumbing' },
  ...over,
});

describe('rankCommunityRequests', () => {
  it("excludes the student's own requests", () => {
    const result = rankCommunityRequests({
      rows: [row(1, { student_id: 'me' }), row(2)],
      upvoteRows: [],
      studentId: 'me',
      hostel: null,
    });
    expect(result.map((r) => r.requestId)).toEqual([2]);
  });

  it('limits to the given hostel', () => {
    const result = rankCommunityRequests({
      rows: [row(1), row(2, { hostel: 'Africa' })],
      upvoteRows: [],
      studentId: 'me',
      hostel: 'Africa',
    });
    expect(result.map((r) => r.requestId)).toEqual([2]);
  });

  it('ranks by upvote count, then newest first, and flags my own upvotes', () => {
    const result = rankCommunityRequests({
      rows: [row(1), row(2), row(3)],
      upvoteRows: [
        { request_id: 1, user_id: 'a' },
        { request_id: 1, user_id: 'me' },
        { request_id: 3, user_id: 'a' },
      ],
      studentId: 'me',
      hostel: null,
    });
    expect(result.map((r) => [r.requestId, r.upvoteCount])).toEqual([
      [1, 2],
      [3, 1],
      [2, 0],
    ]);
    expect(result[0].hasUpvoted).toBe(true);
    expect(result[1].hasUpvoted).toBe(false);
  });

  it("never exposes other students' identities", () => {
    const [item] = rankCommunityRequests({ rows: [row(1)], upvoteRows: [], studentId: 'me', hostel: null });
    expect(item).not.toHaveProperty('student_id');
    expect(item).not.toHaveProperty('student');
  });
});

describe('listCommunityRequests', () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults to the hostel of the student's own latest request", async () => {
    requestsRepository.findActiveRequestsForCommunity.mockResolvedValue([row(1), row(2, { hostel: 'Africa' })]);
    upvotesRepository.findAllUpvotes.mockResolvedValue([]);
    requestsRepository.findRequestsByStudentId.mockResolvedValue([{ hostel: 'Africa' }]);

    const feed = await listCommunityRequests({ studentId: 'me', hostel: null });

    expect(feed.hostel).toBe('Africa');
    expect(feed.requests.map((r) => r.requestId)).toEqual([2]);
  });
});

describe('addUpvote / removeUpvote', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects upvoting your own request', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, student_id: 'me', status: 'open' });
    await expect(addUpvote({ requestId: 1, studentId: 'me' })).rejects.toMatchObject({ statusCode: 400 });
    expect(upvotesRepository.insertUpvote).not.toHaveBeenCalled();
  });

  it('rejects upvoting a resolved request', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, student_id: 'x', status: 'resolved' });
    await expect(addUpvote({ requestId: 1, studentId: 'me' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('404s for an unknown request', async () => {
    requestsRepository.findRequestById.mockResolvedValue(null);
    await expect(addUpvote({ requestId: 9, studentId: 'me' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('treats a duplicate upvote as a no-op, not an error', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, student_id: 'x', status: 'open' });
    upvotesRepository.insertUpvote.mockRejectedValue({ code: '23505' });
    upvotesRepository.countUpvotesForRequest.mockResolvedValue(3);

    await expect(addUpvote({ requestId: 1, studentId: 'me' })).resolves.toEqual({
      requestId: 1,
      hasUpvoted: true,
      upvoteCount: 3,
    });
  });

  it('removes an upvote and returns the new count', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 1, student_id: 'x', status: 'open' });
    upvotesRepository.countUpvotesForRequest.mockResolvedValue(2);

    await expect(removeUpvote({ requestId: 1, studentId: 'me' })).resolves.toEqual({
      requestId: 1,
      hasUpvoted: false,
      upvoteCount: 2,
    });
    expect(upvotesRepository.deleteUpvote).toHaveBeenCalledWith({ requestId: 1, userId: 'me' });
  });
});
