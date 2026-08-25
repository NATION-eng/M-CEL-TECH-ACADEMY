import mongoose, { Schema } from 'mongoose';
import { IWeek } from '../types';

const WeekSchema = new Schema<IWeek>({
  title: { type: String, required: true, trim: true },
  weekNumber: { type: Number, required: true },
  module: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
  description: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

WeekSchema.index({ module: 1, weekNumber: 1 });

export default mongoose.model<IWeek>('Week', WeekSchema);
