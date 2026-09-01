// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as usersService from '../services/users.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// For the administrator's technician-assignment control on Manage Requests.
router.get('/technicians', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const technicians = await usersService.listTechnicians();
    res.status(200).json({ status: 'ok', technicians });
  } catch (err) {
    next(err);
  }
});

export default router;
