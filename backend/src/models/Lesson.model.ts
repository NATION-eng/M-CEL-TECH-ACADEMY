import mongoose, { Schema } from 'mongoose';
import { ILesson } from '../types';

const LessonSchema = new Schema<ILesson>({
  title: { type: String, required: true, trim: true },
  week: { type: Schema.Types.ObjectId, ref: 'Week', required: true },
  order: { type: Number, required: true },
  description: String,
  videoUrl: String,
  videoDuration: Number,
  notes: String,
  slides: String,
  codeSnippets: String,
  downloads: [{ name: String, url: String, type: String }],
  isPublished: { type: Boolean, default: false },
  isFree: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Every lesson list — student course view, curriculum tree, lesson editor —
// filters by week.
LessonSchema.index({ week: 1, order: 1 });

export default mongoose.model<ILesson>('Lesson', LessonSchema);
