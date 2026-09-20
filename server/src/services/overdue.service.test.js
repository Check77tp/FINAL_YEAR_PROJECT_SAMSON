import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as requestsRepository from '../repositories/requests.repository.js';
import { findRequestsDueForAlert, runOverdueCheck } from './overdue.service.js';
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

describe('findRequestsDueForAlert', () => {
  it('flags overdue requests that have never been alerted (first alert)', () => {
    const rows = [row(1, 'critical', 5), row(2, 'critical', 1), row(3, 'high', 30)];
    expect(findRequestsDueForAlert(rows, NOW).map((r) => r.request_id)).toEqual([1, 3]);
  });

  it('skips resolved requests', () => {
    expect(findRequestsDueForAlert([row(1, 'critical', 99, { status: 'resolved' })], NOW)).toEqual([]);
  });

  describe('reminders while still overdue', () => {
    it('critical/high: not before 4 hours since the last alert, then again', () => {
      const alerted = (h) => ({ overdue_notified_at: hoursAgo(h) });
      expect(findRequestsDueForAlert([row(1, 'critical', 20, alerted(3))], NOW)).toEqual([]);
      expect(findRequestsDueForAlert([row(1, 'critical', 20, alerted(4))], NOW)).toHaveLength(1);
      expect(findRequestsDueForAlert([row(2, 'high', 60, alerted(3.5))], NOW)).toEqual([]);
      expect(findRequestsDueForAlert([row(2, 'high', 60, alerted(5))], NOW)).toHaveLength(1);
    });

    it('medium/low: daily (24 hours), not sooner', () => {
      const alerted = (h) => ({ overdue_notified_at: hoursAgo(h) });
      expect(findRequestsDueForAlert([row(3, 'medium', 200, alerted(23))], NOW)).toEqual([]);
      expect(findRequestsDueForAlert([row(3, 'medium', 200, alerted(24))], NOW)).toHaveLength(1);
      expect(findRequestsDueForAlert([row(4, 'low', 400, alerted(12))], NOW)).toEqual([]);
      expect(findRequestsDueForAlert([row(4, 'low', 400, alerted(30))], NOW)).toHaveLength(1);
    });

    it('tolerates a few minutes of timer drift so a 4h reminder is not pushed to 5h', () => {
      // 3h58m since the last alert is close enough to "4 hours" for an hourly check
      const justUnder = { overdue_notified_at: new Date(NOW.getTime() - (4 * 60 - 2) * 60 * 1000).toISOString() };
      expect(findRequestsDueForAlert([row(1, 'critical', 20, justUnder)], NOW)).toHaveLength(1);
    });

    it('a request that stops being overdue (resolved) gets no more reminders', () => {
      const r = row(1, 'critical', 20, { status: 'closed', overdue_notified_at: hoursAgo(10) });
      expect(findRequestsDueForAlert([r], NOW)).toEqual([]);
    });
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
    expect(notifyAdministrators.mock.calls[0][0].title).toMatch(/5 overdue requests need attention/);
  });

  it('sends a "still overdue" reminder (not a first alert) and records the new alert time', async () => {
    requestsRepository.findActiveRequestsForSla.mockResolvedValue([
      row(9, 'critical', 20, {
        overdue_notified_at: hoursAgo(5),
        technician_assignments: [{ technician_id: 'tech-9', assigned_at: hoursAgo(10) }],
      }),
    ]);

    expect(await runOverdueCheck(NOW)).toBe(1);

    expect(requestsRepository.markOverdueNotified).toHaveBeenCalledWith([9]);
    expect(notifyAdministrators.mock.calls[0][0].title).toBe('Request still overdue');
    expect(notifyUser).toHaveBeenCalledWith('tech-9', expect.objectContaining({ title: 'Task still overdue' }));
  });

  it('does not re-alert a request that was alerted recently', async () => {
    requestsRepository.findActiveRequestsForSla.mockResolvedValue([
      row(9, 'critical', 20, { overdue_notified_at: hoursAgo(1) }),
    ]);
    expect(await runOverdueCheck(NOW)).toBe(0);
    expect(notifyAdministrators).not.toHaveBeenCalled();
  });
});
