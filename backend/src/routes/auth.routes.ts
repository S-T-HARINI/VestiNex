import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators';

const router = Router();

// Register
router.post('/register', authLimiter, validate(registerSchema), async (req: Request, res: Response, next) => {
  try {
    const user = await authService.register(req.body);
    if (req.session) {
      req.session.userId = user.id;
    }
    res.cookie('vestinex_uid', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response, next) => {
  try {
    const user = await authService.login(req.body);
    if (req.session) {
      req.session.userId = user.id;
    }
    res.cookie('vestinex_uid', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  if (req.session) {
    req.session.destroy(() => {});
  }
  res.clearCookie('vestinex_uid');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Current user profile
router.get('/me', authenticate, async (req: Request, res: Response, next) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// Update profile
router.patch('/profile', authenticate, validate(updateProfileSchema), async (req: Request, res: Response, next) => {
  try {
    const user = await authService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// List all users (for assignment & membership pickers)
router.get('/users', authenticate, async (req: Request, res: Response, next) => {
  try {
    const users = await authService.listUsers();
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

export default router;
