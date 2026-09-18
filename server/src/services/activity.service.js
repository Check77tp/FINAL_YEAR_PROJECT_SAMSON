// Business logic layer for the recent-activity feed. Framework-agnostic —
// no req/res objects here. Scopes status_history to what each role is
// allowed to see, mirroring the same student/technician/admin visibility
// rules already enforced elsewhere (see requests.service.js).
import * as activityRepository from '../repositories/activity.repository.js';

const DEFAULT_LIMIT = 10;

function formatEntry(row) {
  return {
    historyId: row.history_id,
    requestId: row.request_id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    changedAt: row.changed_at,
    description: row.request?.description ?? null,
    category: row.request?.category?.name ?? null,
    studentName: row.request?.student?.name ?? null,
  };
}

export async function getRecentActivity(actingUser, limit = DEFAULT_LIMIT) {
  let rows;

  if (actingUser.role === 'student') {
    const requestIds = await activityRepository.findRequestIdsForStudent(actingUser.user_id);
    rows = await activityRepository.findRecentHistoryForRequestIds(requestIds, limit);
  } else if (actingUser.role === 'technician') {
    const requestIds = await activityRepository.findRequestIdsForTechnician(actingUser.user_id);
    rows = await activityRepository.findRecentHistoryForRequestIds(requestIds, limit);
  } else {
    rows = await activityRepository.findRecentHistoryAll(limit);
  }

  return rows.map(formatEntry);
}
