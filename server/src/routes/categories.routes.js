// Presentation layer: thin routes, no business logic or direct DB access.
import { Router } from 'express';
import * as categoriesService from '../services/categories.service.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Any authenticated role can list categories (needed for the student's
// request submission form, and useful elsewhere later).
router.get('/', authenticate, async (req, res, next) => {
  try {
    const categories = await categoriesService.listCategories();
    res.status(200).json({ status: 'ok', categories });
  } catch (err) {
    next(err);
  }
});

export default router;
