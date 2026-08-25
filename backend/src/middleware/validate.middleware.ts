import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../types';
import { sendError } from '../utils/apiResponse';

/**
 * Runs after express-validator chain middlewares (e.g. body('email').isEmail()).
 * If validation failed, responds with 400 and the list of errors; otherwise continues.
 */
export const validate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendError(res, 'Validation failed.', 422, errors.array());
    return;
  }
  next();
};
