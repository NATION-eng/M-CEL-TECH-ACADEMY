import mongoose, { Schema } from 'mongoose';
import { ICourse } from '../types';

const CourseSchema = new Schema<ICourse>({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  description: { type: String, required: true },
  shortDescription: { type: String, required: true },
  thumbnail: String,
  price: { type: Number, required: true, min: 0 },
  depositAmount: { type: Number, required: true, min: 0 },
  depositPercentage: { type: Number, required: true, min: 50, max: 100 },
  duration: { type: String, required: true },
  deliveryMode: { type: String, enum: ['physical', 'online', 'hybrid'], default: 'hybrid' },
  classSchedule: [{
    dayOfWeek: { type: String, enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    mode: { type: String, enum: ['physical', 'online'], required: true },
    location: String,
    meetingLink: String,
  }],
  instructors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isPublished: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  archivedAt: Date,
  archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  archiveReason: String,
  tags: { type: [String], default: [] },
  whatYouLearn: { type: [String], default: [] },
  requirements: { type: [String], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Enforce: deposit must be > 50% of price, matching academy policy
CourseSchema.pre('validate', function (next) {
  if (this.depositPercentage < 50) {
    return next(new Error('Deposit percentage must be at least 50% per academy policy.'));
  }
  if (!this.depositAmount && this.price) {
    this.depositAmount = Math.ceil((this.price * this.depositPercentage) / 100);
  }
  next();
});

// Catalog browsing filters heavily on these; department lookups join to it too.
CourseSchema.index({ department: 1 });
CourseSchema.index({ isPublished: 1, isArchived: 1 });

export default mongoose.model<ICourse>('Course', CourseSchema);
