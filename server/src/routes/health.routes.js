// Presentation layer: thin route, no business logic or direct DB access.
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'hostel-maintenance-api',
    timestamp: new Date().toISOString(),
  });
});

export default router;
