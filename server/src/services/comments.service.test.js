import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as commentsRepository from '../repositories/comments.repository.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import { notifyUser, notifyAdministrators } from './push.service.js';
import { listComments, addComment, assertWithinRateLimit } from './comments.service.js';

vi.mock('../repositories/comments.repository.js');
vi.mock('../repositories/requests.repository.js');
vi.mock('./push.service.js');

const student = { user_id: 'stu', name: 'Student', role: 'student' };
const otherStudent = { user_id: 'stu2', name: 'Other', role: 'student' };
const tech = { user_id: 'tech', name: 'Tech', role: 'technician' };
const otherTech = { user_id: 'tech2', name: 'Tech2', role: 'technician' };
const admin = { user_id: 'adm', name: 'Admin', role: 'administrator' };

const commentRow = (over = {}) => ({
  comment_id: 1,
  request_id: 7,
  body: 'Which tap is it?',
  created_at: '2026-09-10T10:00:00Z',
  author: { user_id: 'adm', name: 'Admin', role: 'administrator' },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  requestsRepository.findRequestById.mockResolvedValue({ request_id: 7, student_id: 'stu', status: 'in_progress' });
  requestsRepository.findCurrentAssignment.mockResolvedValue({ technician_id: 'tech' });
  commentsRepository.insertComment.mockResolvedValue(commentRow());
  commentsRepository.findCommentsByRequestId.mockResolvedValue([commentRow()]);
});

describe('who can take part in the conversation', () => {
  it.each([
    ['the student who reported it', student],
    ['the assigned technician', tech],
    ['an administrator', admin],
  ])('%s can read it', async (_label, user) => {
    const list = await listComments({ requestId: 7, actingUser: user });
    expect(list[0]).toMatchObject({ id: 1, body: 'Which tap is it?', author: { name: 'Admin', role: 'administrator' } });
  });

  it.each([
    ['another student', otherStudent],
    ['a technician who is not assigned', otherTech],
  ])('%s is refused (403)', async (_label, user) => {
    await expect(listComments({ requestId: 7, actingUser: user })).rejects.toMatchObject({ statusCode: 403 });
    await expect(addComment({ requestId: 7, actingUser: user, body: 'hi' })).rejects.toMatchObject({ statusCode: 403 });
    expect(commentsRepository.insertComment).not.toHaveBeenCalled();
  });

  it('404 for an unknown request', async () => {
    requestsRepository.findRequestById.mockResolvedValue(null);
    await expect(listComments({ requestId: 99, actingUser: admin })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('addComment', () => {
  it('trims the text, stores it with the author, and returns it', async () => {
    await addComment({ requestId: 7, actingUser: student, body: '  It is the shower tap  ' });
    expect(commentsRepository.insertComment).toHaveBeenCalledWith({
      requestId: 7,
      authorId: 'stu',
      body: 'It is the shower tap',
    });
  });

  it.each([
    ['empty', '   '],
    ['not a string', 42],
    ['too long', 'x'.repeat(1001)],
  ])('rejects a comment that is %s (400)', async (_label, body) => {
    await expect(addComment({ requestId: 7, actingUser: student, body })).rejects.toMatchObject({ statusCode: 400 });
    expect(commentsRepository.insertComment).not.toHaveBeenCalled();
  });

  it('rejects commenting on a closed request', async () => {
    requestsRepository.findRequestById.mockResolvedValue({ request_id: 7, student_id: 'stu', status: 'closed' });
    await expect(addComment({ requestId: 7, actingUser: student, body: 'thanks' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('a student comment notifies the technician and the administrators, not the student', async () => {
    await addComment({ requestId: 7, actingUser: student, body: 'It is the shower tap' });
    expect(notifyUser).toHaveBeenCalledWith('tech', expect.objectContaining({ url: '/tasks/7' }));
    expect(notifyUser).not.toHaveBeenCalledWith('stu', expect.anything());
    expect(notifyAdministrators).toHaveBeenCalledTimes(1);
  });

  it('an administrator comment notifies the student and the technician, not other admins', async () => {
    await addComment({ requestId: 7, actingUser: admin, body: 'Please check the shower' });
    expect(notifyUser).toHaveBeenCalledWith('stu', expect.objectContaining({ url: '/requests/7' }));
    expect(notifyUser).toHaveBeenCalledWith('tech', expect.anything());
    expect(notifyAdministrators).not.toHaveBeenCalled();
  });
});

describe('assertWithinRateLimit', () => {
  it('allows 15 a minute, then 429, then recovers', () => {
    const now = 5_000_000;
    for (let i = 0; i < 15; i += 1) assertWithinRateLimit('flooder', now + i);
    expect(() => assertWithinRateLimit('flooder', now + 20)).toThrow(/too quickly/);
    expect(() => assertWithinRateLimit('flooder', now + 61_000)).not.toThrow();
  });
});
