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
  } else if (err.code === 11000 && err.keyValue) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `A record with this ${field} already exists.`;
  } else if (err.name === 'ValidationError' && (err as any).errors) {
    statusCode = 400;
    const messages = Object.values((err as any).errors).map((e: any) => e.message);
    message = messages.join(', ') || 'Validation error.';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please sign in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please sign in again.';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    if ((err as any).code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file is too large. Documents must be ≤15MB and media files ≤500MB.';
    } else if ((err as any).code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field encountered during upload.';
    } else {
      message = (err as any).message || 'File upload error.';
    }
  } else if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON in request body.';
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
