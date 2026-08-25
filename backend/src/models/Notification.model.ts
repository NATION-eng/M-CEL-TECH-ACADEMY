import mongoose, { Schema } from 'mongoose';
import { INotification } from '../types';

const NotificationSchema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['assignment', 'announcement', 'payment', 'certificate', 'grade', 'system', 'reminder'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: String,
  isRead: { type: Boolean, default: false },
  readAt: Date,
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
export default mongoose.model<INotification>('Notification', NotificationSchema);
