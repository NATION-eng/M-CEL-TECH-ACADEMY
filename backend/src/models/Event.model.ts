import mongoose, { Schema } from 'mongoose';
import { IEvent } from '../types';

const EventSchema = new Schema<IEvent>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: String,
  isOnline: { type: Boolean, default: false },
  meetingUrl: String,
  thumbnail: String,
  isPublished: { type: Boolean, default: false },
  registrationLink: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Public/portal event listings filter by isPublished and sort chronologically.
EventSchema.index({ isPublished: 1, startDate: 1 });

export default mongoose.model<IEvent>('Event', EventSchema);
