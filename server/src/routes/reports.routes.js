// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as reportsService from '../services/reports.service.js';
import * as digestService from '../services/digest.service.js';
import * as recurrenceService from '../services/recurrence.service.js';
import * as performanceService from '../services/performance.service.js';
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

// Administrator: how each technician is performing over a window
// (?days=7|30|90|365, or 0 for all time; default 30).
router.get('/technician-performance', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const result = await performanceService.getTechnicianPerformance({ days: req.query.days });
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

// Technician: their own numbers (and rank among colleagues).
router.get('/my-performance', authenticate, requireRole('technician'), async (req, res, next) => {
  try {
    const result = await performanceService.getMyPerformance({
      technicianId: req.user.user_id,
      days: req.query.days,
    });
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

// Administrator: faults that keep coming back (same room / same building),
// with a suggestion to fix the cause instead of patching it again.
router.get('/recurring', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const issues = await recurrenceService.getRecurringIssues();
    res.status(200).json({ status: 'ok', issues });
  } catch (err) {
    next(err);
  }
});

// Administrator: email the weekly summary to themselves right now (preview /
// on-demand). The scheduled weekly send to all administrators is separate.
router.post('/digest/send', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const result = await digestService.sendDigestToUser({ email: req.user.email });
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
