// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as feedbackService from '../services/feedback.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// Any authenticated user can leave a review of the app itself.
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { rating, category, message } = req.body;
    const feedback = await feedbackService.submitFeedback({
      userId: req.user.user_id,
      rating,
      category,
      message,
    });
    res.status(201).json({ status: 'ok', feedback });
  } catch (err) {
    next(err);
  }
});

// A user's own past submissions.
router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const items = await feedbackService.listMyFeedback(req.user.user_id);
    res.status(200).json({ status: 'ok', items });
  } catch (err) {
    next(err);
  }
});

// Administrator: everything, with the average rating.
router.get('/', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const result = await feedbackService.listAllFeedback();
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
