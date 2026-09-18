// Unit tests for the JWT-verification gate every protected route sits
// behind. auth.service.js's verifyToken() is mocked — its own correctness
// (real Supabase calls) is exercised elsewhere; this tests that the
// middleware wires the Authorization header, req.user, and error path
// together correctly.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticate } from './authenticate.js';
import { verifyToken } from '../services/auth.service.js';

vi.mock('../services/auth.service.js');

function mockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() };
}

describe('authenticate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects with 401 when there is no Authorization header at all', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(verifyToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 when the header does not use the Bearer scheme', async () => {
    const req = { headers: { authorization: 'Basic somecreds' } };
    const res = mockRes();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('attaches the resolved profile to req.user and calls next() on a valid token', async () => {
    const profile = { user_id: 'u1', role: 'student', name: 'Ada' };
    verifyToken.mockResolvedValue(profile);

    const req = { headers: { authorization: 'Bearer good-token' } };
    const res = mockRes();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(verifyToken).toHaveBeenCalledWith('good-token');
    expect(req.user).toEqual(profile);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('forwards a verification failure to the error-handling middleware rather than responding itself', async () => {
    const authError = Object.assign(new Error('Invalid or expired token'), { statusCode: 401 });
    verifyToken.mockRejectedValue(authError);

    const req = { headers: { authorization: 'Bearer bad-token' } };
    const res = mockRes();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(authError);
    expect(res.status).not.toHaveBeenCalled();
  });
});
