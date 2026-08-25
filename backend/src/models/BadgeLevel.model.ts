import mongoose, { Schema } from 'mongoose';
import { IBadgeLevel } from '../types';

const BadgeLevelSchema = new Schema<IBadgeLevel>({
  title: { type: String, required: true, trim: true },
  level: { type: Number, required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  description: String,
  badgeIcon: String,
  isActive: { type: Boolean, default: true },
  order: { type: Number, required: true },
}, { timestamps: true });

BadgeLevelSchema.index({ course: 1, level: 1 }, { unique: true });
export default mongoose.model<IBadgeLevel>('BadgeLevel', BadgeLevelSchema);
