// Business logic layer for maintenance requests. Framework-agnostic — no
// req/res objects here.
import * as requestsRepository from '../repositories/requests.repository.js';

export async function listStudentRequests(studentId) {
  const rows = await requestsRepository.findRequestsByStudentId(studentId);

  return rows.map((row) => {
    // A request is assigned once today, but technician_assignments is
    // modeled as one-to-many, so take the most recent row defensively.
    const assignments = row.technician_assignments || [];
    const latestAssignment = assignments
      .slice()
      .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at))[0];

    return {
      requestId: row.request_id,
      description: row.description,
      photoUrl: row.photo_url,
      status: row.status,
      createdAt: row.created_at,
      category: row.category ? { id: row.category.category_id, name: row.category.name } : null,
      technician: latestAssignment?.technician
        ? { id: latestAssignment.technician.user_id, name: latestAssignment.technician.name }
        : null,
    };
  });
}
