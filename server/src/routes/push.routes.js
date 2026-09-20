// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as pushService from '../services/push.service.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// The VAPID public key is not a secret (browsers need it to subscribe), so
// this is unauthenticated. `publicKey: null` means push is disabled.
router.get('/public-key', (req, res) => {
  res.status(200).json({ status: 'ok', publicKey: pushService.getPublicKey() });
});

// Any signed-in user can register the current device for their own account.
router.post('/subscribe', authenticate, async (req, res, next) => {
  try {
    const result = await pushService.subscribe({
      userId: req.user.user_id,
      subscription: req.body.subscription,
    });
    res.status(201).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/unsubscribe', authenticate, async (req, res, next) => {
  try {
    const result = await pushService.unsubscribe({
      userId: req.user.user_id,
      endpoint: req.body.endpoint,
    });
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
