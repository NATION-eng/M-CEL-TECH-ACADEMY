import mongoose, { Schema } from 'mongoose';
import { IDepartment } from '../types';

const DepartmentSchema = new Schema<IDepartment>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, lowercase: true },
  school: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  description: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

DepartmentSchema.index({ school: 1, slug: 1 }, { unique: true });
export default mongoose.model<IDepartment>('Department', DepartmentSchema);
