import mongoose, { Schema } from 'mongoose';
import { IBlogPost } from '../types';

const BlogPostSchema = new Schema<IBlogPost>({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  content: { type: String, required: true },
  excerpt: { type: String, required: true },
  thumbnail: String,
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tags: { type: [String], default: [] },
  category: { type: String, required: true },
  isPublished: { type: Boolean, default: false },
  publishedAt: Date,
  // A post can be isPublished=true but still not yet visible if scheduledFor
  // is in the future — see blog.controller.ts's "effectively published" check.
  scheduledFor: Date,
  views: { type: Number, default: 0 },
  readTime: { type: Number, default: 5 },
  isArchived: { type: Boolean, default: false },
  archivedAt: Date,
  archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  archiveReason: String,
}, { timestamps: true });

// Matches the public listing query: filter by isPublished (+ optional category),
// sorted by publishedAt — an index here avoids a full collection scan as posts grow.
BlogPostSchema.index({ isPublished: 1, isArchived: 1, publishedAt: -1 });
BlogPostSchema.index({ category: 1 });
BlogPostSchema.index({ title: 'text', content: 'text', excerpt: 'text' });

export default mongoose.model<IBlogPost>('BlogPost', BlogPostSchema);
