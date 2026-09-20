import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as requestsRepository from '../repositories/requests.repository.js';
import { findNewlyOverdue, runOverdueCheck } from './overdue.service.js';
import { notifyUser, notifyAdministrators } from './push.service.js';

vi.mock('../repositories/requests.repository.js');
vi.mock('./push.service.js');

const NOW = new Date('2026-09-10T12:00:00Z');
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600e3).toISOString();
const row = (id, priority, ageHours, extra = {}) => ({
  request_id: id,
  priority,
  status: 'open',
  created_at: hoursAgo(ageHours),
  hostel: 'Kalingalinga',
  overdue_notified_at: null,
  technician_assignments: [],
  ...extra,
});

describe('findNewlyOverdue', () => {
  it('flags requests past their deadline that have not been alerted', () => {
    const rows = [row(1, 'critical', 5), row(2, 'critical', 1), row(3, 'high', 30)];
    expect(findNewlyOverdue(rows, NOW).map((r) => r.request_id)).toEqual([1, 3]);
  });

  it('skips requests already alerted', () => {
    expect(findNewlyOverdue([row(1, 'critical', 9, { overdue_notified_at: hoursAgo(1) })], NOW)).toEqual([]);
  });

  it('skips resolved requests', () => {
    expect(findNewlyOverdue([row(1, 'critical', 99, { status: 'resolved' })], NOW)).toEqual([]);
  });
});

describe('runOverdueCheck', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does nothing when nothing is overdue', async () => {
    requestsRepository.findActiveRequestsForSla.mockResolvedValue([row(1, 'low', 2)]);
    expect(await runOverdueCheck(NOW)).toBe(0);
    expect(requestsRepository.markOverdueNotified).not.toHaveBeenCalled();
  });

  it('marks requests as alerted, then notifies admins and the assigned technician', async () => {
    requestsRepository.findActiveRequestsForSla.mockResolvedValue([
      row(7, 'critical', 6, {
        technician_assignments: [{ technician_id: 'tech-1', assigned_at: hoursAgo(5) }],
      }),
    ]);

    expect(await runOverdueCheck(NOW)).toBe(1);

    expect(requestsRepository.markOverdueNotified).toHaveBeenCalledWith([7]);
    expect(notifyAdministrators).toHaveBeenCalledTimes(1);
    expect(notifyUser).toHaveBeenCalledWith('tech-1', expect.objectContaining({ url: '/tasks/7' }));
  });

  it('sends one summary instead of many alerts when a lot go overdue at once', async () => {
    requestsRepository.findActiveRequestsForSla.mockResolvedValue(
      [1, 2, 3, 4, 5].map((id) => row(id, 'critical', 10))
    );

    expect(await runOverdueCheck(NOW)).toBe(5);

    expect(notifyAdministrators).toHaveBeenCalledTimes(1);
    expect(notifyAdministrators.mock.calls[0][0].title).toMatch(/5 requests are overdue/);
  });
});
