// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as requestsService from '../services/requests.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_VALUES = ['in_progress', 'resolved', 'closed'];

function parseRequestId(rawId, res) {
  const requestId = Number(rawId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    res.status(400).json({ status: 'error', message: 'Invalid request id' });
    return null;
  }
  return requestId;
}

// A student's own requests only — see CLAUDE.md's role rules. Technician
// and administrator views need different queries (assigned-to-me / all) and
// aren't built yet.
router.get('/mine', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const requests = await requestsService.listStudentRequests(req.user.user_id);
    res.status(200).json({ status: 'ok', requests });
  } catch (err) {
    next(err);
  }
});

// Administrator: assign a technician to an open request (Open -> Assigned).
router.post('/:requestId/assign', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const requestId = parseRequestId(req.params.requestId, res);
    if (requestId === null) return;

    const { technicianId } = req.body;
    if (typeof technicianId !== 'string' || !UUID_PATTERN.test(technicianId)) {
      return res.status(400).json({ status: 'error', message: 'A valid technicianId is required' });
    }

    const result = await requestsService.assignTechnician({ requestId, technicianId });
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

// Technician (only on requests assigned to them) or administrator: advance
// a request's status (Assigned -> In Progress -> Resolved -> Closed).
router.patch(
  '/:requestId/status',
  authenticate,
  requireRole('technician', 'administrator'),
  async (req, res, next) => {
    try {
      const requestId = parseRequestId(req.params.requestId, res);
      if (requestId === null) return;

      const { status } = req.body;
      if (!STATUS_VALUES.includes(status)) {
        return res
          .status(400)
          .json({ status: 'error', message: `status must be one of: ${STATUS_VALUES.join(', ')}` });
      }

      const result = await requestsService.updateRequestStatus({
        requestId,
        newStatus: status,
        actingUser: req.user,
      });
      res.status(200).json({ status: 'ok', ...result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
