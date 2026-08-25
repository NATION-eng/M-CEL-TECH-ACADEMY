import mongoose, { Schema } from 'mongoose';
import { IInstructor } from '../types';

const InstructorSchema = new Schema<IInstructor>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  instructorId: { type: String, required: true, unique: true },
  bio: String,
  specializations: { type: [String], default: [] },
  experience: Number,
  linkedinUrl: String,
}, { timestamps: true });

export default mongoose.model<IInstructor>('Instructor', InstructorSchema);
