import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types';
import { sendSuccess } from '../utils/apiResponse';

/**
 * Real subsystem status for the Super Admin "Platform Status" panel — this
 * used to be a hardcoded "All Systems Operational" message with a
 * permanently-green dot, completely disconnected from whether anything was
 * actually configured or working. Kept behind auth (super_admin only) since
 * it reveals which third-party integrations are/aren't configured.
 */
export const getSystemStatus = async (_req: AuthRequest, res: Response): Promise<void> => {
  const dbConnected = mongoose.connection.readyState === 1;
  const services = [
    { name: 'Database', status: dbConnected ? 'operational' : 'down' as const },
    { name: 'Email', status: (process.env.EMAIL_USER && process.env.EMAIL_PASS) ? 'operational' : 'not configured' as const },
    { name: 'Payment Gateway', status: (process.env.PAYSTACK_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY) ? 'operational' : 'not configured' as const },
    { name: 'File Storage', status: process.env.CLOUDINARY_CLOUD_NAME ? 'operational' : 'not configured' as const },
  ];
  const allOperational = services.every((s) => s.status === 'operational');

  sendSuccess(res, {
    allOperational,
    services,
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV,
    checkedAt: new Date().toISOString(),
  }, 'System status fetched.');
};
