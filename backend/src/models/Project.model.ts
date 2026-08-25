import mongoose, { Schema } from 'mongoose';
import { IProject } from '../types';

const ProjectSchema = new Schema<IProject>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['personal', 'team', 'capstone'], required: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course' },
  teamMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  githubUrl: String,
  liveUrl: String,
  thumbnailUrl: String,
  technologies: { type: [String], default: [] },
  status: { type: String, enum: ['in_progress', 'completed', 'under_review'], default: 'in_progress' },
  feedback: String,
  grade: Number,
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// The certificate eligibility engine queries exactly this combination on
// every eligibility check; student's own project list filters by student alone.
ProjectSchema.index({ course: 1, student: 1 });
ProjectSchema.index({ student: 1 });

export default mongoose.model<IProject>('Project', ProjectSchema);
