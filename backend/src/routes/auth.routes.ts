import { Router } from 'express';
import {
  register, login, googleAuth, refreshTokenHandler, logout, getMe, changePassword,
  forgotPassword, resetPassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Note: the whole /api/v1/auth prefix already sits behind `authLimiter`
// (see server.ts), so no extra per-route rate limiting is needed here.
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/refresh', refreshTokenHandler);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.patch('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
