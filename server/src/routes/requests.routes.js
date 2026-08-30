// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as requestsService from '../services/requests.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

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

export default router;
