import { describe, it, expect } from 'vitest';
import { computeTechnicianPerformance } from './performance.service.js';

const NOW = new Date('2026-09-20T12:00:00Z');
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600e3).toISOString();
const daysAgo = (d) => hoursAgo(d * 24);

const techs = [
  { user_id: 't1', name: 'John', availability_status: 'available' },
  { user_id: 't2', name: 'Bwalya', availability_status: 'on_job' },
];

// assignment helper: request created createdH hours ago, assigned assignedH hours ago
const assign = (id, tech, { priority = 'medium', createdH, assignedH, status = 'closed' }) => ({
  request_id: id,
  technician_id: tech,
  assigned_at: hoursAgo(assignedH),
  request: { status, priority, created_at: hoursAgo(createdH) },
});
const resolved = (id, h) => ({ request_id: id, new_status: 'resolved', changed_at: hoursAgo(h) });

describe('computeTechnicianPerformance', () => {
  it('counts resolutions, average time (from ASSIGNMENT) and on-time rate', () => {
    const assignmentRows = [
      // medium = 72h target. created 100h ago, assigned 90h ago, resolved 50h ago -> 40h with tech, 50h total: on time
      assign(1, 't1', { createdH: 100, assignedH: 90 }),
      // created 200h ago, assigned 190h ago, resolved 100h ago -> 90h with tech, 100h total: LATE (>72)
      assign(2, 't1', { createdH: 200, assignedH: 190 }),
    ];
    const historyRows = [resolved(1, 50), resolved(2, 100)];

    const [john] = computeTechnicianPerformance({ technicians: techs, assignmentRows, historyRows, ratingRows: [], now: NOW });

    expect(john).toMatchObject({ name: 'John', resolved: 2, avgResolutionHours: 65, onTimeRate: 50 });
  });

  it('only counts resolutions inside the window', () => {
    const assignmentRows = [assign(1, 't1', { createdH: 900, assignedH: 890 }), assign(2, 't1', { createdH: 100, assignedH: 90 })];
    const historyRows = [resolved(1, 800), resolved(2, 50)]; // #1 resolved ~33 days ago
    const thirty = computeTechnicianPerformance({ technicians: techs, assignmentRows, historyRows, ratingRows: [], now: NOW, days: 7 });
    expect(thirty.find((t) => t.name === 'John').resolved).toBe(1);
    const all = computeTechnicianPerformance({ technicians: techs, assignmentRows, historyRows, ratingRows: [], now: NOW, days: 0 });
    expect(all.find((t) => t.name === 'John').resolved).toBe(2);
  });

  it('counts active jobs and how many are overdue right now', () => {
    const assignmentRows = [
      assign(1, 't2', { priority: 'critical', createdH: 10, assignedH: 9, status: 'in_progress' }), // 4h target -> overdue
      assign(2, 't2', { priority: 'low', createdH: 10, assignedH: 9, status: 'assigned' }), // fine
      assign(3, 't2', { createdH: 100, assignedH: 90, status: 'closed' }),
    ];
    const [, bwalya] = computeTechnicianPerformance({ technicians: techs, assignmentRows, historyRows: [], ratingRows: [], now: NOW }).sort((a, b) => a.name.localeCompare(b.name)).reverse();
    expect(bwalya).toMatchObject({ name: 'Bwalya' });
    const b = computeTechnicianPerformance({ technicians: techs, assignmentRows, historyRows: [], ratingRows: [], now: NOW }).find((t) => t.name === 'Bwalya');
    expect(b).toMatchObject({ active: 2, overdueNow: 1 });
  });

  it("averages the students' ratings of their requests", () => {
    const assignmentRows = [assign(1, 't1', { createdH: 100, assignedH: 90 }), assign(2, 't1', { createdH: 100, assignedH: 90 })];
    const ratingRows = [{ request_id: 1, rating: 5 }, { request_id: 2, rating: 4 }, { request_id: 99, rating: 1 }];
    const john = computeTechnicianPerformance({ technicians: techs, assignmentRows, historyRows: [], ratingRows, now: NOW }).find((t) => t.name === 'John');
    expect(john).toMatchObject({ avgRating: 4.5, ratingCount: 2 });
  });

  it('a technician with no work has null averages, not zero or NaN', () => {
    const john = computeTechnicianPerformance({ technicians: techs, assignmentRows: [], historyRows: [], ratingRows: [], now: NOW }).find((t) => t.name === 'John');
    expect(john).toMatchObject({ resolved: 0, avgResolutionHours: null, onTimeRate: null, avgRating: null, active: 0 });
  });

  it('a reassigned request counts for the LATEST technician only', () => {
    const assignmentRows = [
      { ...assign(1, 't1', { createdH: 100, assignedH: 95 }) },
      { ...assign(1, 't2', { createdH: 100, assignedH: 60 }) },
    ];
    const result = computeTechnicianPerformance({ technicians: techs, assignmentRows, historyRows: [resolved(1, 20)], ratingRows: [], now: NOW });
    expect(result.find((t) => t.name === 'Bwalya').resolved).toBe(1);
    expect(result.find((t) => t.name === 'John').resolved).toBe(0);
  });

  it('ranks the most resolved first', () => {
    const assignmentRows = [
      assign(1, 't2', { createdH: 100, assignedH: 90 }),
      assign(2, 't2', { createdH: 100, assignedH: 90 }),
      assign(3, 't1', { createdH: 100, assignedH: 90 }),
    ];
    const historyRows = [resolved(1, 10), resolved(2, 10), resolved(3, 10)];
    const result = computeTechnicianPerformance({ technicians: techs, assignmentRows, historyRows, ratingRows: [], now: NOW });
    expect(result.map((t) => t.name)).toEqual(['Bwalya', 'John']);
  });
});
