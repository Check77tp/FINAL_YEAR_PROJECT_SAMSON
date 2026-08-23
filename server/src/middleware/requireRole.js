// Role-based access guard. Use after `authenticate` on routes restricted to
// specific roles, e.g. router.get('/admin-only', authenticate, requireRole('administrator'), handler).
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: insufficient role' });
    }
    next();
  };
}
