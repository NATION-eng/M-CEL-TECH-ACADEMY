import mongoose, { Schema } from 'mongoose';
import { IStudent } from '../types';

const StudentSchema = new Schema<IStudent>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  studentId: { type: String, required: true, unique: true },
  bio: String,
  skills: { type: [String], default: [] },
  githubUrl: String,
  linkedinUrl: String,
  portfolioUrl: String,
  dateOfBirth: Date,
  address: String,
}, { timestamps: true });

export default mongoose.model<IStudent>('Student', StudentSchema);
