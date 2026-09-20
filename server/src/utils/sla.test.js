import { describe, it, expect } from 'vitest';
import { computeSla, SLA_TARGET_HOURS } from './sla.js';

const created = '2026-09-01T00:00:00Z';
const at = (hours) => new Date(new Date(created).getTime() + hours * 3600 * 1000);

describe('computeSla', () => {
  it('uses a shorter deadline for more urgent priorities', () => {
    expect(SLA_TARGET_HOURS.critical).toBeLessThan(SLA_TARGET_HOURS.high);
    expect(SLA_TARGET_HOURS.high).toBeLessThan(SLA_TARGET_HOURS.medium);
    expect(SLA_TARGET_HOURS.medium).toBeLessThan(SLA_TARGET_HOURS.low);
  });

  it('is on track early in the window', () => {
    const sla = computeSla({ priority: 'high', status: 'open', createdAt: created, now: at(2) });
    expect(sla.state).toBe('on_track');
    expect(sla.hoursRemaining).toBe(22);
  });

  it('is at risk in the last quarter of the window', () => {
    // high = 24h; 20h elapsed -> 4h left, under 25% (6h)
    expect(computeSla({ priority: 'high', status: 'assigned', createdAt: created, now: at(20) }).state).toBe('at_risk');
  });

  it('is overdue once the deadline passes, with negative hours remaining', () => {
    const sla = computeSla({ priority: 'critical', status: 'in_progress', createdAt: created, now: at(6) });
    expect(sla.state).toBe('overdue');
    expect(sla.hoursRemaining).toBe(-2);
  });

  it('never flags resolved or closed requests', () => {
    expect(computeSla({ priority: 'critical', status: 'resolved', createdAt: created, now: at(100) }).state).toBe('done');
    expect(computeSla({ priority: 'critical', status: 'closed', createdAt: created, now: at(100) }).hoursRemaining).toBeNull();
  });

  it('treats an unknown priority as medium', () => {
    expect(computeSla({ priority: undefined, status: 'open', createdAt: created, now: at(1) }).targetHours).toBe(72);
  });
});
