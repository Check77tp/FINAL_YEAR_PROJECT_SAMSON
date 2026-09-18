// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as activityService from '../services/activity.service.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Any authenticated role — the service layer scopes results to what that
// role is allowed to see (own requests, assigned requests, or everything).
router.get('/recent', authenticate, async (req, res, next) => {
  try {
    const activity = await activityService.getRecentActivity(req.user);
    res.status(200).json({ status: 'ok', activity });
  } catch (err) {
    next(err);
  }
});

export default router;
