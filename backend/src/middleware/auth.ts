import { Request, Response, NextFunction } from 'express';
import { db } from '../lib/store';
import { User } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: any;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Check custom header (for easy API testing / E2E / tokens)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Support test tokens or userId directly
    const user = db.findUserById(token) || db.findUserByEmail(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // 2. Check session
  if (req.session && req.session.userId) {
    const user = db.findUserById(req.session.userId);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // 3. Fallback cookie
  const cookieUserId = req.cookies?.['vestinex_uid'];
  if (cookieUserId) {
    const user = db.findUserById(cookieUserId);
    if (user) {
      req.user = user;
      return next();
    }
  }

  res.status(401).json({
    success: false,
    error: 'Authentication required. Please log in to continue.',
  });
};

export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = db.findUserById(token) || db.findUserByEmail(token);
    if (user) req.user = user;
  } else if (req.session?.userId) {
    const user = db.findUserById(req.session.userId);
    if (user) req.user = user;
  } else if (req.cookies?.['vestinex_uid']) {
    const user = db.findUserById(req.cookies['vestinex_uid']);
    if (user) req.user = user;
  }
  next();
};
