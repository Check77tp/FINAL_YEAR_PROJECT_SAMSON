// Verifies the Supabase-issued JWT on protected routes and attaches the
// caller's profile (id, name, email, role) to req.user.
import { verifyToken } from '../services/auth.service.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Missing authorization token' });
  }

  try {
    req.user = await verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
}
