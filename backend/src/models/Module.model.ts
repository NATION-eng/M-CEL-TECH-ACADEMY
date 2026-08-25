import mongoose, { Schema } from 'mongoose';
import { IModule } from '../types';

const ModuleSchema = new Schema<IModule>({
  name: { type: String, required: true, trim: true },
  badgeLevel: { type: Schema.Types.ObjectId, ref: 'BadgeLevel', required: true },
  description: String,
  order: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

ModuleSchema.index({ badgeLevel: 1, order: 1 });

export default mongoose.model<IModule>('Module', ModuleSchema);
