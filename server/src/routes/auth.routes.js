// Presentation layer: validates input, calls the auth service, formats the
// response. No business logic or direct Supabase access here.
import { Router } from 'express';
import * as authService from '../services/auth.service.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, id_number: idNumber } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }
    if (!idNumber || !String(idNumber).trim()) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Student or Staff ID is required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ status: 'error', message: 'A valid email is required' });
    }
    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Password must be at least 8 characters' });
    }

    const profile = await authService.registerStudent({
      name: name.trim(),
      email,
      idNumber: String(idNumber).trim(),
      password,
    });
    res.status(201).json({ status: 'ok', user: profile });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { id_number: idNumber, email, password } = req.body;

    if (!password) {
      return res.status(400).json({ status: 'error', message: 'Password is required' });
    }
    if (!idNumber && !email) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Student/Staff ID or email is required' });
    }
    // Email format is only validated on the fallback path — the ID number
    // path doesn't require (or receive) an email from the client at all.
    if (!idNumber && !isValidEmail(email)) {
      return res.status(400).json({ status: 'error', message: 'A valid email is required' });
    }

    const result = await authService.login({ idNumber, email, password });
    res.status(200).json({ status: 'ok', ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, (req, res) => {
  res.status(200).json({ status: 'ok', user: req.user });
});

export default router;
