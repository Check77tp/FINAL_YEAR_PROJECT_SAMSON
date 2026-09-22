import { describe, it, expect } from 'vitest';
import { detectRecurringIssues, normalizeRoom, ROOM_THRESHOLD, HOSTEL_THRESHOLD } from './recurrence.service.js';
import { PREVENTIVE_PREFIX } from '../utils/preventive.js';

const NOW = new Date('2026-09-20T12:00:00Z');
const daysAgo = (d) => new Date(NOW.getTime() - d * 86400e3).toISOString();
const plumbing = { category_id: 2, name: 'Plumbing' };
const electrical = { category_id: 3, name: 'Electrical' };

let id = 0;
const req = (over = {}) => ({
  request_id: ++id,
  hostel: 'Kalingalinga',
  room: 'Block C, Room 24',
  description: 'Tap leaks',
  status: 'closed',
  created_at: daysAgo(5),
  category: plumbing,
  ...over,
});

describe('normalizeRoom', () => {
  it('treats spacing and case differences as the same room', () => {
    expect(normalizeRoom('Block C , room 24')).toBe(normalizeRoom('block c,  Room 24'));
    expect(normalizeRoom(null)).toBe('');
  });
});

describe('room-level recurrence (3+ in 60 days)', () => {
  it('flags the same category from the same room', () => {
    const rows = [req({ created_at: daysAgo(40) }), req({ created_at: daysAgo(20) }), req({ created_at: daysAgo(2), status: 'open' })];
    const [issue] = detectRecurringIssues(rows, NOW);
    expect(issue).toMatchObject({
      scope: 'room', hostel: 'Kalingalinga', count: 3, openCount: 1, severity: 'watch',
      category: { name: 'Plumbing' },
    });
    expect(issue.suggestion).toMatch(/cause has probably not been fixed/);
  });

  it('matches rooms typed slightly differently', () => {
    const rows = [req({ room: 'Block C, Room 24' }), req({ room: 'block c,  room 24' }), req({ room: 'BLOCK C , ROOM 24' })];
    expect(detectRecurringIssues(rows, NOW)).toHaveLength(1);
  });

  it('two reports are not enough', () => {
    expect(ROOM_THRESHOLD).toBe(3);
    expect(detectRecurringIssues([req(), req()], NOW)).toEqual([]);
  });

  it('reports older than 60 days do not count', () => {
    const rows = [req({ created_at: daysAgo(90) }), req({ created_at: daysAgo(70) }), req({ created_at: daysAgo(5) })];
    expect(detectRecurringIssues(rows, NOW)).toEqual([]);
  });

  it('different categories or different rooms are counted separately', () => {
    const rows = [req(), req(), req({ category: electrical }), req({ room: 'Block D, Room 1' })];
    expect(detectRecurringIssues(rows, NOW)).toEqual([]);
  });

  it('marks it high severity at double the threshold', () => {
    const rows = Array.from({ length: 6 }, () => req());
    expect(detectRecurringIssues(rows, NOW).find((i) => i.scope === 'room').severity).toBe('high');
  });

  it('ignores requests with no room at room level', () => {
    const rows = [req({ room: null }), req({ room: '' }), req({ room: '  ' })];
    expect(detectRecurringIssues(rows, NOW).filter((i) => i.scope === 'room')).toEqual([]);
  });
});

describe('hostel-level recurrence (6+ in 30 days)', () => {
  it('flags a building-wide pattern even when the rooms differ', () => {
    expect(HOSTEL_THRESHOLD).toBe(6);
    const rows = Array.from({ length: 6 }, (_, i) => req({ room: `Room ${i}`, created_at: daysAgo(i + 1) }));
    const issues = detectRecurringIssues(rows, NOW);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ scope: 'hostel', room: null, count: 6, windowDays: 30 });
  });

  it('only counts the last 30 days', () => {
    const rows = Array.from({ length: 6 }, (_, i) => req({ room: `Room ${i}`, created_at: daysAgo(35 + i) }));
    expect(detectRecurringIssues(rows, NOW)).toEqual([]);
  });
});

describe('what is ignored', () => {
  it('preventive-maintenance requests are not "recurring faults"', () => {
    const rows = Array.from({ length: 4 }, () => req({ description: `${PREVENTIVE_PREFIX}Monthly geyser check` }));
    expect(detectRecurringIssues(rows, NOW)).toEqual([]);
  });

  it('sorts the most frequent first', () => {
    const rows = [
      ...Array.from({ length: 3 }, () => req({ room: 'Room A' })),
      ...Array.from({ length: 5 }, () => req({ room: 'Room B', category: electrical })),
    ];
    const issues = detectRecurringIssues(rows, NOW).filter((i) => i.scope === 'room');
    expect(issues.map((i) => i.count)).toEqual([5, 3]);
  });
});
