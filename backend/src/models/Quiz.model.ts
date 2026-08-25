import mongoose, { Schema } from 'mongoose';
import { IQuiz } from '../types';

const QuestionSchema = new Schema({
  type: { type: String, enum: ['mcq', 'true_false', 'short_answer'], required: true },
  question: { type: String, required: true },
  options: { type: [String], default: [] },
  correctAnswer: { type: String, required: true },
  points: { type: Number, default: 1 },
  explanation: String,
});

const QuizSchema = new Schema<IQuiz>({
  title: { type: String, required: true, trim: true },
  lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
  week: { type: Schema.Types.ObjectId, ref: 'Week' },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  description: String,
  questions: { type: [QuestionSchema], default: [] },
  duration: { type: Number, default: 30 },
  passingScore: { type: Number, default: 70 },
  maxAttempts: { type: Number, default: 3 },
  isPublished: { type: Boolean, default: false },
  availableFrom: Date,
  availableUntil: Date,
  randomizeQuestions: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

QuizSchema.index({ course: 1, isPublished: 1 });

export default mongoose.model<IQuiz>('Quiz', QuizSchema);
