import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as announcementsRepository from '../repositories/announcements.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import { notifyUsers } from './push.service.js';
import {
  createAnnouncement,
  listForUser,
  selectForStudent,
  selectForTechnician,
  resolveRecipients,
} from './announcements.service.js';

vi.mock('../repositories/announcements.repository.js');
vi.mock('../repositories/users.repository.js');
vi.mock('../repositories/requests.repository.js');
vi.mock('./push.service.js');

const NOW = new Date('2026-09-10T12:00:00Z');
const row = (id, over = {}) => ({
  announcement_id: id,
  title: `Notice ${id}`,
  message: 'Water will be off',
  hostel: null,
  created_by: 'admin',
  created_at: NOW.toISOString(),
  expires_at: null,
  ...over,
});

describe('selectForStudent (who sees what)', () => {
  it("shows all-hostel notices plus the student's own hostel, hides other hostels", () => {
    const rows = [row(1), row(2, { hostel: 'Kalingalinga' }), row(3, { hostel: 'Soweto' })];
    expect(selectForStudent(rows, 'Kalingalinga', NOW).map((r) => r.announcement_id)).toEqual([1, 2]);
  });

  it('a student with no known hostel only sees all-hostel notices', () => {
    const rows = [row(1), row(2, { hostel: 'Kalingalinga' })];
    expect(selectForStudent(rows, null, NOW).map((r) => r.announcement_id)).toEqual([1]);
  });

  it('hides expired notices', () => {
    const rows = [row(1, { expires_at: '2026-09-09T00:00:00Z' }), row(2, { expires_at: '2026-09-11T00:00:00Z' })];
    expect(selectForStudent(rows, null, NOW).map((r) => r.announcement_id)).toEqual([2]);
  });
});

describe('selectForTechnician (who sees what)', () => {
  it('shows every active notice regardless of hostel', () => {
    const rows = [row(1), row(2, { hostel: 'Kalingalinga' }), row(3, { hostel: 'Soweto' })];
    expect(selectForTechnician(rows, NOW).map((r) => r.announcement_id)).toEqual([1, 2, 3]);
  });

  it('hides expired notices', () => {
    const rows = [row(1, { expires_at: '2026-09-09T00:00:00Z' }), row(2, { expires_at: '2026-09-11T00:00:00Z' })];
    expect(selectForTechnician(rows, NOW).map((r) => r.announcement_id)).toEqual([2]);
  });
});

describe('resolveRecipients', () => {
  beforeEach(() => vi.clearAllMocks());

  it('all hostels -> every student', async () => {
    usersRepository.findAllStudentIds.mockResolvedValue(['a', 'b']);
    expect(await resolveRecipients(null)).toEqual(['a', 'b']);
  });

  it('one hostel -> students who chose it PLUS students whose latest request was there, without duplicates', async () => {
    usersRepository.findStudentIdsByHostel.mockResolvedValue(['a', 'b']);
    requestsRepository.findLatestHostelPerStudent.mockResolvedValue(
      new Map([
        ['b', 'Soweto'],
        ['c', 'Soweto'],
        ['d', 'Goma Hall'],
      ])
    );
    expect((await resolveRecipients('Soweto')).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('createAnnouncement', () => {
  const valid = { adminId: 'admin-1', title: 'Water cut', message: 'No water 10:00-12:00', hostel: 'Soweto' };

  beforeEach(() => {
    vi.clearAllMocks();
    announcementsRepository.insertAnnouncement.mockResolvedValue(row(5, { hostel: 'Soweto' }));
    usersRepository.findStudentIdsByHostel.mockResolvedValue(['s1', 's2']);
    requestsRepository.findLatestHostelPerStudent.mockResolvedValue(new Map());
  });

  it('stores the notice and pushes it to the targeted hostel', async () => {
    const result = await createAnnouncement(valid);
    expect(announcementsRepository.insertAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Water cut', hostel: 'Soweto', createdBy: 'admin-1' })
    );
    expect(notifyUsers).toHaveBeenCalledWith(['s1', 's2'], expect.objectContaining({ title: 'Water cut (Soweto)' }));
    expect(result.recipients).toBe(2);
  });

  it.each([
    ['title too short', { title: 'ab' }],
    ['message too short', { message: 'ok' }],
    ['message too long', { message: 'x'.repeat(501) }],
    ['expiry in the past', { expiresAt: '2020-01-01T00:00:00Z' }],
    ['expiry not a date', { expiresAt: 'soon' }],
  ])('rejects: %s', async (_label, patch) => {
    await expect(createAnnouncement({ ...valid, hostel: null, ...patch })).rejects.toMatchObject({ statusCode: 400 });
    expect(announcementsRepository.insertAnnouncement).not.toHaveBeenCalled();
  });

  it('still succeeds if the push side effect fails', async () => {
    usersRepository.findStudentIdsByHostel.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await createAnnouncement(valid);
    expect(result.announcement.id).toBe(5);
  });
});

describe('listForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    announcementsRepository.findRecentAnnouncements.mockResolvedValue([
      row(1),
      row(2, { hostel: 'Soweto' }),
      row(3, { hostel: 'Goma Hall' }),
      row(4, { expires_at: '2020-01-01T00:00:00Z' }),
    ]);
  });

  it('a student gets only the active notices that apply to their hostel', async () => {
    usersRepository.findHostelByUserId.mockResolvedValue('Soweto');
    const list = await listForUser({ user_id: 's1', role: 'student' }, NOW);
    expect(list.map((a) => a.id)).toEqual([1, 2]);
  });

  it("falls back to the hostel of the student's latest request", async () => {
    usersRepository.findHostelByUserId.mockResolvedValue(null);
    requestsRepository.findRequestsByStudentId.mockResolvedValue([{ hostel: 'Goma Hall' }]);
    const list = await listForUser({ user_id: 's1', role: 'student' }, NOW);
    expect(list.map((a) => a.id)).toEqual([1, 3]);
  });

  it('an administrator sees everything, marked active or expired', async () => {
    const list = await listForUser({ user_id: 'a', role: 'administrator' }, NOW);
    expect(list).toHaveLength(4);
    expect(list.find((a) => a.id === 4).active).toBe(false);
  });

  it('a technician sees every active notice, regardless of hostel', async () => {
    const list = await listForUser({ user_id: 't', role: 'technician' }, NOW);
    expect(list.map((a) => a.id)).toEqual([1, 2, 3]);
  });

  it('other roles see none', async () => {
    expect(await listForUser({ user_id: 'x', role: 'someone-else' }, NOW)).toEqual([]);
  });
});
