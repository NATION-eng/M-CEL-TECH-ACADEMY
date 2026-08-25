import mongoose, { Schema } from 'mongoose';
import { ISchool } from '../types';

const SchoolSchema = new Schema<ISchool>({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: String,
  icon: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model<ISchool>('School', SchoolSchema);
