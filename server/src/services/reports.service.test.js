// Unit tests for the analytics calculations (CLAUDE.md checklist item 8).
// These are pure functions over plain arrays — no repository mocking needed,
// matching CLAUDE.md's note that services should be testable in isolation.
import { describe, it, expect } from 'vitest';
import {
  computeAverageResolutionHours,
  computeWorkloadByTechnician,
  computeRequestsByCategory,
  computeRequestsByHostel,
  computeResolutionTrend,
  computeAverageRating,
  computeThisMonth,
} from './reports.service.js';

describe('computeAverageResolutionHours', () => {
  it('averages the open->resolved gap across requests that have both', () => {
    const historyRows = [
      { request_id: 1, new_status: 'open', changed_at: '2026-01-01T00:00:00Z' },
      { request_id: 1, new_status: 'resolved', changed_at: '2026-01-01T02:00:00Z' }, // 2h
      { request_id: 2, new_status: 'open', changed_at: '2026-01-01T00:00:00Z' },
      { request_id: 2, new_status: 'resolved', changed_at: '2026-01-01T06:00:00Z' }, // 6h
    ];

    expect(computeAverageResolutionHours(historyRows)).toBe(4);
  });

  it('excludes requests that are open but not yet resolved', () => {
    const historyRows = [
      { request_id: 1, new_status: 'open', changed_at: '2026-01-01T00:00:00Z' },
      { request_id: 1, new_status: 'resolved', changed_at: '2026-01-01T04:00:00Z' }, // 4h
      { request_id: 2, new_status: 'open', changed_at: '2026-01-01T00:00:00Z' }, // still open
    ];

    expect(computeAverageResolutionHours(historyRows)).toBe(4);
  });

  it('returns null when nothing has been resolved yet', () => {
    const historyRows = [{ request_id: 1, new_status: 'open', changed_at: '2026-01-01T00:00:00Z' }];
    expect(computeAverageResolutionHours(historyRows)).toBeNull();
  });

  it('returns null for an empty dataset', () => {
    expect(computeAverageResolutionHours([])).toBeNull();
  });
});

describe('computeWorkloadByTechnician', () => {
  const technicians = [
    { user_id: 'tech-1', name: 'Alice' },
    { user_id: 'tech-2', name: 'Bob' },
  ];

  it('counts only assigned/in_progress requests as active workload', () => {
    const assignmentRows = [
      { request_id: 1, technician_id: 'tech-1', assigned_at: '2026-01-01T00:00:00Z', maintenance_requests: { status: 'assigned' } },
      { request_id: 2, technician_id: 'tech-1', assigned_at: '2026-01-01T00:00:00Z', maintenance_requests: { status: 'in_progress' } },
      { request_id: 3, technician_id: 'tech-1', assigned_at: '2026-01-01T00:00:00Z', maintenance_requests: { status: 'resolved' } },
      { request_id: 4, technician_id: 'tech-2', assigned_at: '2026-01-01T00:00:00Z', maintenance_requests: { status: 'closed' } },
    ];

    const result = computeWorkloadByTechnician(assignmentRows, technicians);

    expect(result).toEqual([
      { id: 'tech-1', name: 'Alice', activeRequests: 2 },
      { id: 'tech-2', name: 'Bob', activeRequests: 0 },
    ]);
  });

  it('includes technicians with zero current workload', () => {
    const result = computeWorkloadByTechnician([], technicians);
    expect(result).toEqual([
      { id: 'tech-1', name: 'Alice', activeRequests: 0 },
      { id: 'tech-2', name: 'Bob', activeRequests: 0 },
    ]);
  });

  it('only counts the most recent assignment when a request has more than one row', () => {
    const assignmentRows = [
      { request_id: 1, technician_id: 'tech-1', assigned_at: '2026-01-01T00:00:00Z', maintenance_requests: { status: 'assigned' } },
      { request_id: 1, technician_id: 'tech-2', assigned_at: '2026-01-02T00:00:00Z', maintenance_requests: { status: 'assigned' } },
    ];

    const result = computeWorkloadByTechnician(assignmentRows, technicians);

    expect(result).toEqual([
      { id: 'tech-1', name: 'Alice', activeRequests: 0 },
      { id: 'tech-2', name: 'Bob', activeRequests: 1 },
    ]);
  });
});

describe('computeRequestsByCategory', () => {
  it('groups and counts requests by category name', () => {
    const requestRows = [
      { category: { name: 'Plumbing' } },
      { category: { name: 'Plumbing' } },
      { category: { name: 'Electrical' } },
    ];

    expect(computeRequestsByCategory(requestRows)).toEqual([
      { name: 'Plumbing', count: 2 },
      { name: 'Electrical', count: 1 },
    ]);
  });

  it('falls back to "Uncategorized" for a null category', () => {
    expect(computeRequestsByCategory([{ category: null }])).toEqual([{ name: 'Uncategorized', count: 1 }]);
  });
});

describe('computeRequestsByHostel', () => {
  it('groups and counts requests by hostel', () => {
    const requestRows = [{ hostel: 'Goma Hall' }, { hostel: 'Goma Hall' }, { hostel: 'Ridgeway' }];

    expect(computeRequestsByHostel(requestRows)).toEqual([
      { name: 'Goma Hall', count: 2 },
      { name: 'Ridgeway', count: 1 },
    ]);
  });

  it('groups requests with no hostel under "Unspecified"', () => {
    expect(computeRequestsByHostel([{ hostel: null }])).toEqual([{ name: 'Unspecified', count: 1 }]);
  });
});

describe('computeResolutionTrend', () => {
  const now = new Date('2026-03-15T12:00:00Z');

  it('returns 7 days ending today, counting resolved transitions per day', () => {
    const historyRows = [
      { new_status: 'resolved', changed_at: '2026-03-15T09:00:00Z' },
      { new_status: 'resolved', changed_at: '2026-03-15T10:00:00Z' },
      { new_status: 'resolved', changed_at: '2026-03-13T09:00:00Z' },
      { new_status: 'open', changed_at: '2026-03-15T08:00:00Z' }, // wrong status
    ];

    const trend = computeResolutionTrend(historyRows, now);

    expect(trend).toHaveLength(7);
    expect(trend[6]).toEqual({ date: '2026-03-15', resolvedCount: 2 });
    expect(trend[4]).toEqual({ date: '2026-03-13', resolvedCount: 1 });
    expect(trend[0]).toEqual({ date: '2026-03-09', resolvedCount: 0 });
  });

  it('returns all-zero days for an empty dataset', () => {
    const trend = computeResolutionTrend([], now);
    expect(trend.every((d) => d.resolvedCount === 0)).toBe(true);
  });
});

describe('computeAverageRating', () => {
  it('averages submitted ratings', () => {
    expect(computeAverageRating([{ rating: 5 }, { rating: 3 }, { rating: 4 }])).toBe(4);
  });

  it('returns null when nothing has been rated yet', () => {
    expect(computeAverageRating([])).toBeNull();
  });
});

describe('computeThisMonth', () => {
  const now = new Date('2026-03-15T12:00:00Z');

  it('counts requests created this month and resolutions logged this month separately', () => {
    const requestRows = [
      { created_at: '2026-03-01T00:00:00Z' }, // this month
      { created_at: '2026-03-10T00:00:00Z' }, // this month
      { created_at: '2026-02-20T00:00:00Z' }, // last month
    ];
    const historyRows = [
      { new_status: 'resolved', changed_at: '2026-03-05T00:00:00Z' }, // this month
      { new_status: 'resolved', changed_at: '2026-02-28T00:00:00Z' }, // last month
      { new_status: 'open', changed_at: '2026-03-06T00:00:00Z' }, // wrong status
    ];

    expect(computeThisMonth(historyRows, requestRows, now)).toEqual({ totalRequests: 2, resolved: 1 });
  });

  it('returns zeros when nothing happened this month', () => {
    expect(computeThisMonth([], [], now)).toEqual({ totalRequests: 0, resolved: 0 });
  });
});
