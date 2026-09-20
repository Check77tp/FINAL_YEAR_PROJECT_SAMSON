import { describe, it, expect, vi } from 'vitest';
import { computeWeeklyStats, renderDigestEmail, isDigestDue } from './digest.service.js';

vi.mock('../config/mailer.js', () => ({ mailEnabled: false, sendMail: vi.fn(), appUrl: 'https://app.example' }));

const NOW = new Date('2026-09-14T08:00:00Z'); // a Monday
const daysAgo = (d) => new Date(NOW.getTime() - d * 86400e3).toISOString();

describe('computeWeeklyStats', () => {
  const requestRows = [
    { request_id: 1, created_at: daysAgo(1), hostel: 'Kalingalinga', category: { name: 'Plumbing' } },
    { request_id: 2, created_at: daysAgo(2), hostel: 'Kalingalinga', category: { name: 'Plumbing' } },
    { request_id: 3, created_at: daysAgo(3), hostel: 'Soweto', category: { name: 'Electrical' } },
    { request_id: 4, created_at: daysAgo(9), hostel: 'Soweto', category: { name: 'Electrical' } }, // last week
    { request_id: 5, created_at: daysAgo(40), hostel: 'Soweto', category: { name: 'Electrical' } }, // long ago
  ];
  const historyRows = [
    { request_id: 1, new_status: 'open', changed_at: daysAgo(1) },
    { request_id: 1, new_status: 'resolved', changed_at: new Date(NOW.getTime() - 1 * 86400e3 + 2 * 3600e3).toISOString() },
    { request_id: 4, new_status: 'resolved', changed_at: daysAgo(8) }, // resolved last week: not counted
  ];
  const activeRows = [
    { priority: 'critical', status: 'open', created_at: daysAgo(2) }, // 4h target -> overdue
    { priority: 'low', status: 'open', created_at: daysAgo(1) }, // on track
  ];

  const stats = computeWeeklyStats({ requestRows, historyRows, activeRows, now: NOW });

  it('counts this week and last week separately', () => {
    expect(stats.newRequests).toBe(3);
    expect(stats.newRequestsLastWeek).toBe(1);
  });

  it('counts only resolutions inside the window, and their average time', () => {
    expect(stats.resolved).toBe(1);
    expect(stats.avgResolutionHours).toBeCloseTo(2, 5);
  });

  it('reports open and overdue counts', () => {
    expect(stats.openNow).toBe(2);
    expect(stats.overdueNow).toBe(1);
  });

  it('finds the busiest hostel and most common category among new requests', () => {
    expect(stats.topHostel).toEqual({ name: 'Kalingalinga', count: 2 });
    expect(stats.topCategory).toEqual({ name: 'Plumbing', count: 2 });
  });
});

describe('renderDigestEmail', () => {
  const stats = {
    periodStart: daysAgo(7), periodEnd: NOW.toISOString(), newRequests: 3, newRequestsLastWeek: 1,
    resolved: 1, avgResolutionHours: 2, openNow: 2, overdueNow: 1,
    topHostel: { name: 'Kalingalinga <b>', count: 2 }, topCategory: { name: 'Plumbing', count: 2 },
  };

  it('produces a subject, html and plain-text body with the numbers and a link', () => {
    const { subject, html, text } = renderDigestEmail(stats, { appUrl: 'https://app.example' });
    expect(subject).toMatch(/weekly summary/i);
    expect(html).toContain('https://app.example/reports');
    expect(text).toContain('New requests: 3');
    expect(text).toContain('+200% vs last week');
  });

  it('escapes user-controlled text (e.g. a hostel name) in the HTML', () => {
    const { html } = renderDigestEmail(stats, { appUrl: 'https://app.example' });
    expect(html).not.toContain('Kalingalinga <b>');
    expect(html).toContain('Kalingalinga &lt;b&gt;');
  });
});

describe('isDigestDue', () => {
  it('is not due before Monday 06:00 UTC when last week was already sent', () => {
    const sentLastMonday = new Date('2026-09-07T06:05:00Z');
    expect(isDigestDue(new Date('2026-09-14T05:59:00Z'), sentLastMonday)).toBe(false);
    expect(isDigestDue(new Date('2026-09-13T20:00:00Z'), sentLastMonday)).toBe(false); // Sunday
  });

  it('is due from Monday 06:00 UTC if it has not run this week', () => {
    expect(isDigestDue(new Date('2026-09-14T06:00:00Z'), new Date('2026-09-07T06:05:00Z'))).toBe(true);
    expect(isDigestDue(new Date('2026-09-16T12:00:00Z'), null)).toBe(true); // missed Monday: still catches up midweek
  });

  it('is not due again once it has run since this Monday 06:00', () => {
    expect(isDigestDue(new Date('2026-09-14T09:00:00Z'), new Date('2026-09-14T06:10:00Z'))).toBe(false);
  });
});
