// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as requestsService from '../services/requests.service.js';
import * as ratingsService from '../services/ratings.service.js';
import * as upvotesService from '../services/upvotes.service.js';
import * as triageService from '../services/triage.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_VALUES = ['in_progress', 'resolved', 'closed'];
const PRIORITY_VALUES = ['low', 'medium', 'high', 'critical'];

function parseRequestId(rawId, res) {
  const requestId = Number(rawId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    res.status(400).json({ status: 'error', message: 'Invalid request id' });
    return null;
  }
  return requestId;
}

// Student: submit a new request (category, description, optional photo).
router.post('/', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const { categoryId, description, photo, hostel, room, priority } = req.body;

    const parsedCategoryId = Number(categoryId);
    if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
      return res.status(400).json({ status: 'error', message: 'A valid categoryId is required' });
    }
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ status: 'error', message: 'Description is required' });
    }
    if (photo !== undefined && typeof photo !== 'string') {
      return res.status(400).json({ status: 'error', message: 'Photo must be a data URL string' });
    }
    if (typeof hostel !== 'string' || !hostel.trim()) {
      return res.status(400).json({ status: 'error', message: 'Hostel is required' });
    }
    if (room !== undefined && typeof room !== 'string') {
      return res.status(400).json({ status: 'error', message: 'Room must be a string' });
    }
    if (priority !== undefined && !PRIORITY_VALUES.includes(priority)) {
      return res
        .status(400)
        .json({ status: 'error', message: `priority must be one of: ${PRIORITY_VALUES.join(', ')}` });
    }

    const request = await requestsService.createRequest({
      studentId: req.user.user_id,
      categoryId: parsedCategoryId,
      description: description.trim(),
      photoDataUrl: photo || null,
      hostel: hostel.trim(),
      room: room?.trim() || null,
      priority: priority || undefined,
    });
    res.status(201).json({ status: 'ok', request });
  } catch (err) {
    next(err);
  }
});

// Student: suggest a category + priority from a description (AI when an API
// key is configured, keyword rules otherwise). Advisory only - nothing is saved.
router.post('/triage', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    triageService.assertWithinRateLimit(req.user.user_id);
    const suggestion = await triageService.suggestTriage({ description: req.body.description });
    res.status(200).json({ status: 'ok', suggestion });
  } catch (err) {
    next(err);
  }
});

// A student's own requests only — see CLAUDE.md's role rules.
router.get('/mine', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const requests = await requestsService.listStudentRequests(req.user.user_id);
    res.status(200).json({ status: 'ok', requests });
  } catch (err) {
    next(err);
  }
});

// Administrator: every request, any status, with student details attached
// (CLAUDE.md: "administrator... views all requests").
router.get('/', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const requests = await requestsService.listAllRequests();
    res.status(200).json({ status: 'ok', requests });
  } catch (err) {
    next(err);
  }
});

// Student: other students' active requests (no names), most-upvoted first -
// the "already reported? upvote instead" feed. Must stay above /:requestId.
router.get('/community', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const hostel = typeof req.query.hostel === 'string' ? req.query.hostel.trim() : '';
    const feed = await upvotesService.listCommunityRequests({
      studentId: req.user.user_id,
      hostel: hostel || null,
    });
    res.status(200).json({ status: 'ok', ...feed });
  } catch (err) {
    next(err);
  }
});

// A technician's own assigned requests only.
router.get('/assigned-to-me', authenticate, requireRole('technician'), async (req, res, next) => {
  try {
    const requests = await requestsService.listAssignedRequests(req.user.user_id);
    res.status(200).json({ status: 'ok', requests });
  } catch (err) {
    next(err);
  }
});

// Single-request detail + status_history timeline. Access is enforced in the
// service layer (student: own only, technician: assigned only, admin: any) —
// this literal-path route must stay above it, or Express would try to match
// "assigned-to-me" as a :requestId.
router.get('/:requestId', authenticate, async (req, res, next) => {
  try {
    const requestId = parseRequestId(req.params.requestId, res);
    if (requestId === null) return;

    const request = await requestsService.getRequestDetail({ requestId, actingUser: req.user });
    res.status(200).json({ status: 'ok', request });
  } catch (err) {
    next(err);
  }
});

// Administrator: assign a technician to an open request (Open -> Assigned).
router.post('/:requestId/assign', authenticate, requireRole('administrator'), async (req, res, next) => {
  try {
    const requestId = parseRequestId(req.params.requestId, res);
    if (requestId === null) return;

    const { technicianId } = req.body;
    if (typeof technicianId !== 'string' || !UUID_PATTERN.test(technicianId)) {
      return res.status(400).json({ status: 'error', message: 'A valid technicianId is required' });
    }

    const result = await requestsService.assignTechnician({ requestId, technicianId });
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

// Technician (only on requests assigned to them) or administrator: advance
// a request's status (Assigned -> In Progress -> Resolved -> Closed).
router.patch(
  '/:requestId/status',
  authenticate,
  requireRole('technician', 'administrator'),
  async (req, res, next) => {
    try {
      const requestId = parseRequestId(req.params.requestId, res);
      if (requestId === null) return;

      const { status } = req.body;
      if (!STATUS_VALUES.includes(status)) {
        return res
          .status(400)
          .json({ status: 'error', message: `status must be one of: ${STATUS_VALUES.join(', ')}` });
      }

      const result = await requestsService.updateRequestStatus({
        requestId,
        newStatus: status,
        actingUser: req.user,
      });
      res.status(200).json({ status: 'ok', ...result });
    } catch (err) {
      next(err);
    }
  }
);

// Administrator: re-triage a request's priority — allowed at any point in
// the lifecycle, not just at submission (see requests.service.js).
router.patch(
  '/:requestId/priority',
  authenticate,
  requireRole('administrator'),
  async (req, res, next) => {
    try {
      const requestId = parseRequestId(req.params.requestId, res);
      if (requestId === null) return;

      const { priority } = req.body;
      if (!PRIORITY_VALUES.includes(priority)) {
        return res
          .status(400)
          .json({ status: 'error', message: `priority must be one of: ${PRIORITY_VALUES.join(', ')}` });
      }

      const result = await requestsService.updatePriority({ requestId, priority });
      res.status(200).json({ status: 'ok', ...result });
    } catch (err) {
      next(err);
    }
  }
);

// Student: rate their own request once it's resolved/closed (one rating,
// enforced in the service layer).
router.post('/:requestId/rating', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const requestId = parseRequestId(req.params.requestId, res);
    if (requestId === null) return;

    const { rating, comment } = req.body;
    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ status: 'error', message: 'rating must be an integer from 1 to 5' });
    }
    if (comment !== undefined && typeof comment !== 'string') {
      return res.status(400).json({ status: 'error', message: 'comment must be a string' });
    }

    const result = await ratingsService.submitRating({
      requestId,
      studentId: req.user.user_id,
      rating: parsedRating,
      comment: comment?.trim() || null,
    });
    res.status(201).json({ status: 'ok', rating: result });
  } catch (err) {
    next(err);
  }
});

// Student: "me too" on someone else's active request, and undo it.
router.post('/:requestId/upvote', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const requestId = parseRequestId(req.params.requestId, res);
    if (requestId === null) return;

    const result = await upvotesService.addUpvote({ requestId, studentId: req.user.user_id });
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

router.delete('/:requestId/upvote', authenticate, requireRole('student'), async (req, res, next) => {
  try {
    const requestId = parseRequestId(req.params.requestId, res);
    if (requestId === null) return;

    const result = await upvotesService.removeUpvote({ requestId, studentId: req.user.user_id });
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
