// Business logic layer for administrator analytics. Framework-agnostic —
// no req/res objects here. The calculations are exported individually so
// they're unit-testable in isolation on plain arrays, per CLAUDE.md's
// testing expectations.
import * as reportsRepository from '../repositories/reports.repository.js';
import * as usersRepository from '../repositories/users.repository.js';

const ACTIVE_STATUSES = ['assigned', 'in_progress'];

// Pairs each request's 'open' and 'resolved' status_history timestamps and
// averages the gap, in hours. Requests never resolved (no 'resolved' row
// yet) are excluded rather than counted as zero.
export function computeAverageResolutionHours(historyRows) {
  const byRequest = new Map();

  for (const row of historyRows) {
    if (!byRequest.has(row.request_id)) {
      byRequest.set(row.request_id, {});
    }
    byRequest.get(row.request_id)[row.new_status] = new Date(row.changed_at);
  }

  const durationsMs = [];
  for (const { open, resolved } of byRequest.values()) {
    if (open && resolved) {
      durationsMs.push(resolved.getTime() - open.getTime());
    }
  }

  if (durationsMs.length === 0) return null;

  const averageMs = durationsMs.reduce((sum, ms) => sum + ms, 0) / durationsMs.length;
  return averageMs / (1000 * 60 * 60);
}

// Current workload: requests each technician has that are still active
// (assigned or in_progress) — resolved/closed work no longer counts. Every
// technician appears, even at 0, so the roster is complete.
export function computeWorkloadByTechnician(assignmentRows, technicians) {
  // A request is assigned once today, but the schema allows one-to-many, so
  // only the most recent assignment row per request counts.
  const latestByRequest = new Map();
  for (const row of assignmentRows) {
    const existing = latestByRequest.get(row.request_id);
    if (!existing || new Date(row.assigned_at) > new Date(existing.assigned_at)) {
      latestByRequest.set(row.request_id, row);
    }
  }

  const counts = new Map(technicians.map((t) => [t.user_id, 0]));
  for (const row of latestByRequest.values()) {
    const status = row.maintenance_requests?.status;
    if (ACTIVE_STATUSES.includes(status) && counts.has(row.technician_id)) {
      counts.set(row.technician_id, counts.get(row.technician_id) + 1);
    }
  }

  return technicians.map((t) => ({
    id: t.user_id,
    name: t.name,
    activeRequests: counts.get(t.user_id) || 0,
  }));
}

export function computeRequestsByCategory(requestRows) {
  const counts = new Map();
  for (const row of requestRows) {
    const name = row.category?.name || 'Uncategorized';
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return Array.from(counts, ([name, count]) => ({ name, count }));
}

// "This month" = the current calendar month so far, in server local time.
export function computeThisMonth(historyRows, requestRows, now = new Date()) {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalRequests = requestRows.filter((r) => new Date(r.created_at) >= startOfMonth).length;
  const resolved = historyRows.filter(
    (r) => r.new_status === 'resolved' && new Date(r.changed_at) >= startOfMonth
  ).length;

  return { totalRequests, resolved };
}

export async function getAnalytics() {
  const [historyRows, requestRows, assignmentRows, technicians] = await Promise.all([
    reportsRepository.findOpenAndResolvedHistory(),
    reportsRepository.findRequestsForCategoryAndMonthMetrics(),
    reportsRepository.findAllAssignmentsWithRequestStatus(),
    usersRepository.findUsersByRole('technician'),
  ]);

  return {
    averageResolutionHours: computeAverageResolutionHours(historyRows),
    workloadByTechnician: computeWorkloadByTechnician(assignmentRows, technicians),
    requestsByCategory: computeRequestsByCategory(requestRows),
    thisMonth: computeThisMonth(historyRows, requestRows),
  };
}
