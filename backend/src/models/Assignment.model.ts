import mongoose, { Schema } from 'mongoose';
import { IAssignment } from '../types';

const AssignmentSchema = new Schema<IAssignment>({
  title: { type: String, required: true, trim: true },
  lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
  week: { type: Schema.Types.ObjectId, ref: 'Week' },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  description: { type: String, required: true },
  instructions: { type: String, required: true },
  dueDate: { type: Date, required: true },
  maxScore: { type: Number, default: 100 },
  submissionTypes: [{ type: String, enum: ['file', 'github', 'portfolio', 'liveUrl', 'text'] }],
  resources: { type: [String], default: [] },
  isPublished: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Every assignment list is filtered by course (and often isPublished); the
// certificate eligibility engine and instructor grading views both hit this.
AssignmentSchema.index({ course: 1, isPublished: 1 });
AssignmentSchema.index({ week: 1 });

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
