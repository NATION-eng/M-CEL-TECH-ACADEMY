import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import User from '../models/User.model';
import { AuthRequest } from '../types';
import { sendError } from '../utils/apiResponse';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Access denied. No token provided.', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.id);
    if (!user || !user.isActive) {
      sendError(res, 'User not found or inactive.', 401);
      return;
    }
    if (user.isSuspended) {
      sendError(res, 'Your account has been suspended. Contact support.', 403);
      return;
    }

    req.user = user;
    next();
  } catch {
    sendError(res, 'Invalid or expired token.', 401);
  }
};

/**
 * Optional auth — attaches user if a valid token is present, but does not
 * block the request if missing. Useful for public endpoints that behave
 * differently for logged-in users (none currently, but kept for extensibility).
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.id);
    if (user && user.isActive && !user.isSuspended) req.user = user;
    next();
  } catch {
    next();
  }
};
