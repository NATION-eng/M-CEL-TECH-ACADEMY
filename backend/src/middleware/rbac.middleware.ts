import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import { sendError } from '../utils/apiResponse';

/**
 * Restricts a route to one or more roles. Must run after `authenticate`.
 * Usage: router.get('/admin-only', authenticate, authorize('admin', 'super_admin'), handler)
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required.', 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, 'You do not have permission to perform this action.', 403);
      return;
    }
    next();
  };
};

/**
 * Allows access if the requester is the resource owner (matched by a param,
 * typically a user/student ID) OR holds one of the given elevated roles.
 * Usage: router.get('/users/:id', authenticate, ownerOrRoles('id', 'admin', 'super_admin'), handler)
 */
export const ownerOrRoles = (paramName: string, ...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required.', 401);
      return;
    }
    const isOwner = req.params[paramName] === req.user._id.toString();
    const isElevated = roles.includes(req.user.role);
    if (!isOwner && !isElevated) {
      sendError(res, 'You do not have permission to access this resource.', 403);
      return;
    }
    next();
  };
};
