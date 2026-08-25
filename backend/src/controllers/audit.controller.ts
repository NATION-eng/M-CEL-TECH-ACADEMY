import { Response } from 'express';
import AuditLog from '../models/AuditLog.model';
import { AuthRequest } from '../types';
import { sendPaginated, sendError } from '../utils/apiResponse';

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filter: Record<string, unknown> = {};
    if (req.query.user) filter.user = req.query.user;
    if (req.query.entity) filter.entity = req.query.entity;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.action) filter.action = { $regex: req.query.action as string, $options: 'i' };

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    sendPaginated(res, logs, total, page, limit, 'Audit logs fetched.');
  } catch {
    sendError(res, 'Could not fetch audit logs.', 500);
  }
};
