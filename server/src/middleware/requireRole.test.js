// Unit tests for the role guard itself (CLAUDE.md checklist item 9). Every
// route's requireRole(...) call is only as trustworthy as this function.
import { describe, it, expect, vi } from 'vitest';
import { requireRole } from './requireRole.js';

function mockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() };
}

describe('requireRole', () => {
  it('calls next() when req.user.role is in the allowed list', () => {
    const req = { user: { role: 'administrator' } };
    const res = mockRes();
    const next = vi.fn();

    requireRole('administrator')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows a role that matches any one of several permitted roles', () => {
    const req = { user: { role: 'technician' } };
    const res = mockRes();
    const next = vi.fn();

    requireRole('technician', 'administrator')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects with 403 when req.user.role is not in the allowed list', () => {
    const req = { user: { role: 'student' } };
    const res = mockRes();
    const next = vi.fn();

    requireRole('administrator')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', message: expect.any(String) })
    );
  });

  it('rejects with 403 when req.user is missing entirely', () => {
    const req = {};
    const res = mockRes();
    const next = vi.fn();

    requireRole('student')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
