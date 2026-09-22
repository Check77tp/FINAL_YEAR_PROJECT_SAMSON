// Presentation layer: thin routes, no business logic or direct DB access.
// Preventive maintenance schedules are administrator-only.
import { Router } from 'express';
import * as schedulesService from '../services/schedules.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(authenticate, requireRole('administrator'));

function parseId(raw, res) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ status: 'error', message: 'Invalid schedule id' });
    return null;
  }
  return id;
}

router.get('/', async (req, res, next) => {
  try {
    const schedules = await schedulesService.listSchedules();
    res.status(200).json({ status: 'ok', schedules, frequencies: schedulesService.FREQUENCY_DAYS });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const schedule = await schedulesService.createSchedule({ adminId: req.user.user_id, ...req.body });
    res.status(201).json({ status: 'ok', schedule });
  } catch (err) {
    next(err);
  }
});

// Pause / resume.
router.patch('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id, res);
    if (id === null) return;
    const result = await schedulesService.setScheduleActive({ scheduleId: id, active: req.body.active });
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id, res);
    if (id === null) return;
    const result = await schedulesService.removeSchedule(id);
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

// Create this schedule's task right now.
router.post('/:id/run-now', async (req, res, next) => {
  try {
    const id = parseId(req.params.id, res);
    if (id === null) return;
    const result = await schedulesService.runScheduleNow({ scheduleId: id });
    res.status(201).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
