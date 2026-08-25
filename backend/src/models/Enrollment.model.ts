import mongoose, { Schema } from 'mongoose';
import { IEnrollment } from '../types';

const EnrollmentSchema = new Schema<IEnrollment>({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'active', 'completed', 'suspended', 'dropped'], default: 'pending' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  currentBadge: { type: Schema.Types.ObjectId, ref: 'BadgeLevel' },
  completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
  completedWeeks: [{ type: Schema.Types.ObjectId, ref: 'Week' }],
  completedBadges: [{ type: Schema.Types.ObjectId, ref: 'BadgeLevel' }],
  lastAccessedAt: Date,
  completedAt: Date,
  payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
  cohort: String,
  deliveryMode: { type: String, enum: ['physical', 'online'], default: 'physical' },
}, { timestamps: true });

EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
EnrollmentSchema.index({ status: 1 });
export default mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
