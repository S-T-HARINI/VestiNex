import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { User } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: any;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Check custom header (for easy API testing / E2E / tokens)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await authService.findByIdOrEmail(token);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // 2. Check session
    if (req.session && req.session.userId) {
      const user = await authService.findByIdOrEmail(req.session.userId);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // 3. Fallback cookie
    const cookieUserId = req.cookies?.['vestinex_uid'];
    if (cookieUserId) {
      const user = await authService.findByIdOrEmail(cookieUserId);
      if (user) {
        req.user = user;
        return next();
      }
    }

    res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in to continue.',
    });
  } catch (err) {
    next(err);
  }
};

export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await authService.findByIdOrEmail(token);
      if (user) req.user = user;
    } else if (req.session?.userId) {
      const user = await authService.findByIdOrEmail(req.session.userId);
      if (user) req.user = user;
    } else if (req.cookies?.['vestinex_uid']) {
      const user = await authService.findByIdOrEmail(req.cookies['vestinex_uid']);
      if (user) req.user = user;
    }
  } catch (err) {
    // Optional auth, proceed without error
  }
  next();
};
