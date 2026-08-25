import mongoose, { Schema } from 'mongoose';
import { ISubmission } from '../types';

const SubmissionSchema = new Schema<ISubmission>({
  assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  submittedAt: { type: Date, default: Date.now },
  fileUrls: { type: [String], default: [] },
  githubUrl: String,
  portfolioUrl: String,
  liveUrl: String,
  textContent: String,
  score: Number,
  feedback: String,
  status: { type: String, enum: ['submitted', 'graded', 'returned', 'late'], default: 'submitted' },
  gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  gradedAt: Date,
}, { timestamps: true });

SubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
