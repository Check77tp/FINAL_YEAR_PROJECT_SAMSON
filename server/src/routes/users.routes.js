// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as usersService from '../services/users.service.js';
import * as authService from '../services/auth.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Administrator (User Management page): every account, any role.
router.get('/', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const users = await usersService.listAllUsers();
    res.status(200).json({ status: 'ok', users });
  } catch (err) {
    next(err);
  }
});

// Administrator (User Management page): provision a technician or
// administrator account — the only way either role comes into existence,
// since public /api/auth/register is student-only.
router.post('/', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const { name, email, password, id_number: idNumber, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }
    if (!idNumber || !String(idNumber).trim()) {
      return res.status(400).json({ status: 'error', message: 'Staff ID is required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ status: 'error', message: 'A valid email is required' });
    }
    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Password must be at least 8 characters' });
    }

    const profile = await authService.provisionStaffAccount({
      name: name.trim(),
      email,
      idNumber: String(idNumber).trim(),
      password,
      role,
    });
    res.status(201).json({ status: 'ok', user: profile });
  } catch (err) {
    next(err);
  }
});

// For the administrator's technician-assignment control on Manage Requests.
router.get('/technicians', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const technicians = await usersService.listTechnicians();
    res.status(200).json({ status: 'ok', technicians });
  } catch (err) {
    next(err);
  }
});

// Technician: set their own availability status.
router.patch(
  '/me/availability',
  authenticate,
  requireRole('technician'),
  async (req, res, next) => {
    try {
      const result = await usersService.setOwnAvailability(req.user.user_id, req.body.availabilityStatus);
      res.status(200).json({ status: 'ok', ...result });
    } catch (err) {
      next(err);
    }
  }
);

// Any authenticated role: view/edit their own profile (name + avatar).
router.get('/me', authenticate, (req, res) => {
  res.status(200).json({ status: 'ok', user: req.user });
});

router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const { name, photo } = req.body;
    if (name !== undefined && typeof name !== 'string') {
      return res.status(400).json({ status: 'error', message: 'name must be a string' });
    }
    if (photo !== undefined && typeof photo !== 'string') {
      return res.status(400).json({ status: 'error', message: 'Photo must be a data URL string' });
    }

    const user = await usersService.updateOwnProfile(req.user.user_id, {
      name,
      photoDataUrl: photo || undefined,
    });
    res.status(200).json({ status: 'ok', user });
  } catch (err) {
    next(err);
  }
});

export default router;
