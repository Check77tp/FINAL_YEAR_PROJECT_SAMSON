// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as announcementsService from '../services/announcements.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// Administrator: post an announcement to one hostel or all hostels.
router.post('/', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const { title, message, hostel, expiresAt } = req.body;
    const result = await announcementsService.createAnnouncement({
      adminId: req.user.user_id,
      title,
      message,
      hostel,
      expiresAt,
    });
    res.status(201).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

// Students: the announcements that apply to them. Administrators: all of them.
router.get('/', authenticate, async (req, res, next) => {
  try {
    const announcements = await announcementsService.listForUser(req.user);
    res.status(200).json({ status: 'ok', announcements });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid announcement id' });
    }
    const result = await announcementsService.removeAnnouncement(id);
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

// A student's own hostel (used to target announcements).
router.get('/hostel/me', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const result = await announcementsService.getMyHostel(req.user.user_id);
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

router.put('/hostel/me', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const result = await announcementsService.setMyHostel(req.user.user_id, req.body.hostel);
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
