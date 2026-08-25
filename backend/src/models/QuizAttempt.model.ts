import mongoose, { Schema } from 'mongoose';
import { IQuizAttempt } from '../types';

const QuizAttemptSchema = new Schema<IQuizAttempt>({
  quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{
    questionId: Schema.Types.ObjectId,
    answer: String,
    isCorrect: Boolean,
    pointsEarned: Number,
  }],
  score: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  timeSpent: { type: Number, default: 0 },
  attemptNumber: { type: Number, default: 1 },
}, { timestamps: true });

QuizAttemptSchema.index({ quiz: 1, student: 1, attemptNumber: 1 });
export default mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);
