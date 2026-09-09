// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as reportsService from '../services/reports.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

router.get('/analytics', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const analytics = await reportsService.getAnalytics();
    res.status(200).json({ status: 'ok', analytics });
  } catch (err) {
    next(err);
  }
});

export default router;
