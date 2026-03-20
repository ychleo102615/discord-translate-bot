import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface AuthUser {
  userId: string;
  username: string;
  avatar: string;
}

export interface AuthRequest extends Request {
  user: AuthUser;
}

export function createAuthMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }
    try {
      (req as AuthRequest).user = jwt.verify(token, jwtSecret) as AuthUser;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
