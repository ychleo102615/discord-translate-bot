import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createAuthMiddleware } from '../../../src/api/auth/middleware.js';

function mockReqResNext(token?: string) {
  const req: any = { headers: { authorization: token ? `Bearer ${token}` : undefined } };
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  return { req, res, next };
}

describe('auth middleware', () => {
  const secret = 'test-secret';
  const middleware = createAuthMiddleware(secret);

  it('passes with valid JWT and sets req.user', () => {
    const token = jwt.sign({ userId: '123', username: 'test' }, secret);
    const { req, res, next } = mockReqResNext(token);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.userId).toBe('123');
  });

  it('rejects missing token with 401', () => {
    const { req, res, next } = mockReqResNext();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid token with 401', () => {
    const { req, res, next } = mockReqResNext('invalid.token.here');
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects expired token with 401', () => {
    const token = jwt.sign({ userId: '123' }, secret, { expiresIn: -1 });
    const { req, res, next } = mockReqResNext(token);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
