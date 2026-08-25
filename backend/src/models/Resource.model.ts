import mongoose, { Schema } from 'mongoose';
import { IResource } from '../types';

const ResourceSchema = new Schema<IResource>({
  title: { type: String, required: true, trim: true },
  description: String,
  type: {
    type: String,
    enum: ['pdf', 'word', 'excel', 'powerpoint', 'image', 'zip', 'video', 'audio', 'youtube', 'slide', 'cheatsheet', 'template', 'sourcecode', 'projectfile', 'other'],
    required: true,
  },
  url: { type: String, required: true },
  fileSize: Number,
  // Cloudinary asset id — needed to delete the underlying file when the
  // Resource doc is deleted, so storage doesn't accumulate orphaned files.
  // Absent for 'youtube' resources, which store no file of our own.
  publicId: String,
  youtubeVideoId: String,
  youtubeThumbnail: String,
  lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
  course: { type: Schema.Types.ObjectId, ref: 'Course' },
  week: { type: Schema.Types.ObjectId, ref: 'Week' },
  isPublic: { type: Boolean, default: false },
  downloadCount: { type: Number, default: 0 },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Students browsing "resources for this course/week" — the common read path.
ResourceSchema.index({ course: 1, week: 1 });

export default mongoose.model<IResource>('Resource', ResourceSchema);
