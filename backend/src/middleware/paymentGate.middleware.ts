import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import Payment from '../models/Payment.model';
import { AuthRequest } from '../types';

// Paths a student with an overdue balance can still reach. Everything else
// returns 402 before hitting its route handler — the dashboard, courses,
// assignments, quizzes, certificates, and profile never even query the DB.
const ALLOWED_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/payments',
  '/api/v1/notifications', // so they still see the "payment overdue" notice
  '/health',
];

/**
 * Global, defense-in-depth payment lockout. Runs before route-specific
 * `authenticate` middleware, so it does its own lightweight token decode —
 * this means it works no matter which route file eventually handles the
 * request, without having to thread it into every route file individually.
 *
 * Deliberately fails open on any auth error (missing/invalid/expired token,
 * non-student role): those cases are correctly rejected downstream by each
 * route's own `authenticate` middleware, which also returns a proper 401
 * with the right message — this middleware's only job is the payment check.
 */
export const paymentGate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    if (payload.role !== 'student') return next();

    if (ALLOWED_PREFIXES.some((p) => req.originalUrl.startsWith(p))) return next();

    const now = new Date();
    const overdue = await Payment.findOne({
      student: payload.id,
      balance: { $gt: 0 },
      $or: [{ dueDate: { $lt: now } }, { installmentDeadline: { $lt: now } }],
    })
      .select('balance dueDate installmentDeadline totalAmount amountPaid')
      .lean();

    if (overdue) {
      res.status(402).json({
        success: false,
        paymentRequired: true,
        message: 'Your payment deadline has passed. Please complete payment to regain access to your dashboard, courses, and other features.',
        balance: overdue.balance,
        totalAmount: overdue.totalAmount,
        amountPaid: overdue.amountPaid,
        dueDate: overdue.dueDate ?? overdue.installmentDeadline,
      });
      return;
    }

    next();
  } catch {
    // Invalid/expired token — let the route's own `authenticate` middleware
    // reject it properly rather than duplicating that error handling here.
    next();
  }
};
