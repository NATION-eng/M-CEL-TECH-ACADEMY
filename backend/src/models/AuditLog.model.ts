import mongoose, { Schema } from 'mongoose';
import { IAuditLog } from '../types';

const AuditLogSchema = new Schema<IAuditLog>({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: String,
  changes: Schema.Types.Mixed,
  ipAddress: { type: String, required: true },
  userAgent: String,
  status: { type: String, enum: ['success', 'failure'], default: 'success' },
  details: String,
}, { timestamps: true });

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });
export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
