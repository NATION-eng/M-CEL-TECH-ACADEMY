import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { writeAuditLog } from '../utils/auditLog';

interface AppError extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, string>;
}

export const errorHandler = (
  err: AppError,
  _req: AuthRequest,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format.';
  }
  if (err.code === 11000 && err.keyValue) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `A record with this ${field} already exists.`;
  }
  if (err.name === 'ValidationError') {
    statusCode = 400;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${statusCode}: ${message}`);
    if (statusCode === 500) console.error(err.stack);
  }

  res.status(statusCode).json({ success: false, message });
};

/**
 * Logs a successful mutating action to the AuditLog collection.
 * Attach after the route handler list: router.post('/x', authenticate, handler, auditLog('CREATE_X', 'Entity'))
 * NOTE: Express runs middleware in order before the response is sent, so in practice
 * we wrap res.json inside the handler-preceding middleware instead — see usage in routes.
 */
export const auditLog = (action: string, entity: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode < 400) {
        writeAuditLog({
          user: req.user?._id,
          action,
          entity,
          entityId: req.params.id,
          ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
          userAgent: req.get('user-agent'),
          status: 'success',
        }).catch((e) => console.error('Audit log error:', e));
      }
      return originalJson(body);
    };
    next();
  };
};

/** Wraps an async route handler so rejected promises reach the error handler. */
export const asyncHandler = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
