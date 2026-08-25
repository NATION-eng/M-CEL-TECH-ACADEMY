import AuditLog from '../models/AuditLog.model';
import { getPlatformSettings } from './platformSettings';

interface AuditLogInput {
  user?: unknown;
  action: string;
  entity: string;
  entityId?: unknown;
  changes?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  status?: 'success' | 'failure';
  details?: string;
}

/**
 * Writes an audit log entry unless the admin has turned audit logging off
 * via Platform Settings. Failure to check settings (e.g. a transient DB
 * hiccup) fails open toward *logging* — losing a log entry is cheap;
 * silently disabling the audit trail because of an unrelated error is not
 * something this function should ever cause.
 */
export async function writeAuditLog(entry: AuditLogInput): Promise<void> {
  try {
    const settings = await getPlatformSettings();
    if (settings.security.enableAuditLogs === false) return;
  } catch {
    // fall through and log anyway
  }
  await AuditLog.create(entry as never).catch(() => {});
}
