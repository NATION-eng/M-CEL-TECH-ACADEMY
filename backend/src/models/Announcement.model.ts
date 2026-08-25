import mongoose, { Schema } from 'mongoose';
import { IAnnouncement } from '../types';

const AnnouncementSchema = new Schema<IAnnouncement>({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetRoles: [{ type: String, enum: ['student', 'instructor', 'admin', 'super_admin'] }],
  targetCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  isPinned: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
  publishedAt: Date,
  scheduledFor: Date,
  expiresAt: Date,
  isArchived: { type: Boolean, default: false },
  archivedAt: Date,
  archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  archiveReason: String,
}, { timestamps: true });

// Feed queries filter by publish state (and often target role), sorted with
// pinned items first then newest — this compound index covers that directly.
AnnouncementSchema.index({ isPublished: 1, isArchived: 1, isPinned: -1, publishedAt: -1 });
AnnouncementSchema.index({ targetRoles: 1 });
AnnouncementSchema.index({ title: 'text', content: 'text' });

export default mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
