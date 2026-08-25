import { Response } from 'express';
import BlogPost from '../models/BlogPost.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse';
import { generateSlug } from '../utils/generateId';
import { sanitizeRichText } from '../utils/sanitizeHtml';

const isStaff = (req: AuthRequest) => !!req.user && ['admin', 'super_admin'].includes(req.user.role);

export const getBlogPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 12);
    const filter: Record<string, unknown> = {};

    if (isStaff(req)) {
      // Staff content-management view: explicit status filter drives what's
      // shown (draft/scheduled/published/archived); default excludes archived.
      const status = req.query.status as string | undefined;
      if (status === 'draft') { filter.isPublished = false; filter.isArchived = false; }
      else if (status === 'scheduled') { filter.isPublished = true; filter.scheduledFor = { $gt: new Date() }; filter.isArchived = false; }
      else if (status === 'published') { filter.isPublished = true; filter.isArchived = false; filter.$or = [{ scheduledFor: { $exists: false } }, { scheduledFor: { $lte: new Date() } }]; }
      else if (status === 'archived') { filter.isArchived = true; }
      else { filter.isArchived = false; } // "all" (minus archived, which needs its own tab)
    } else {
      // Public: only genuinely, currently visible posts.
      filter.isPublished = true;
      filter.isArchived = false;
      filter.$or = [{ scheduledFor: { $exists: false } }, { scheduledFor: { $lte: new Date() } }];
    }

    if (req.query.category) filter.category = req.query.category;
    if (req.query.tag) filter.tags = req.query.tag;
    if (req.query.search) {
      // $text requires its own $or slot; combine safely by wrapping any
      // existing $or (scheduling window) into $and alongside the text match.
      const textClause = { $text: { $search: String(req.query.search) } };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, textClause];
        delete filter.$or;
      } else {
        Object.assign(filter, textClause);
      }
    }

    const [posts, total] = await Promise.all([
      BlogPost.find(filter)
        .populate('author', 'firstName lastName')
        .populate('archivedBy', 'firstName lastName')
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      BlogPost.countDocuments(filter),
    ]);
    sendPaginated(res, posts, total, page, limit, 'Blog posts fetched.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not fetch blog posts.', 500);
  }
};

export const getBlogPostBySlug = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await BlogPost.findOneAndUpdate(
      { slug: req.params.slug },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'firstName lastName');
    if (!post) {
      sendError(res, 'Blog post not found.', 404);
      return;
    }
    sendSuccess(res, post, 'Blog post fetched.');
  } catch {
    sendError(res, 'Could not fetch blog post.', 500);
  }
};

export const createBlogPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, excerpt, thumbnail, tags, category, isPublished, scheduledFor } = req.body;
    if (!title || !content || !excerpt || !category) {
      sendError(res, 'Title, content, excerpt, and category are required.', 400);
      return;
    }
    const cleanContent = sanitizeRichText(content);
    const wordCount = cleanContent.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const isFutureScheduled = scheduledFor && new Date(scheduledFor) > new Date();

    const post = await BlogPost.create({
      title,
      slug: generateSlug(title),
      content: cleanContent, excerpt, thumbnail, category,
      tags: tags || [],
      isPublished: !!isPublished,
      // A scheduled post is "published" in the sense that it's committed to
      // go live, but publishedAt reflects the actual/intended go-live time,
      // not creation time, so the timeline shown to readers is accurate.
      publishedAt: isPublished ? (isFutureScheduled ? new Date(scheduledFor) : new Date()) : undefined,
      scheduledFor: isFutureScheduled ? new Date(scheduledFor) : undefined,
      readTime: Math.max(1, Math.round(wordCount / 200)),
      author: req.user!._id,
    });
    sendSuccess(res, post, 'Blog post created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create blog post.', 500);
  }
};

export const updateBlogPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const update = { ...req.body };
    if (update.title) update.slug = generateSlug(update.title);
    if (update.content) update.content = sanitizeRichText(update.content);
    if (update.isPublished && !update.publishedAt) update.publishedAt = new Date();
    if (update.scheduledFor) {
      update.scheduledFor = new Date(update.scheduledFor) > new Date() ? new Date(update.scheduledFor) : undefined;
    }

    const post = await BlogPost.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!post) {
      sendError(res, 'Blog post not found.', 404);
      return;
    }
    sendSuccess(res, post, 'Blog post updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update blog post.', 500);
  }
};

/** Soft-delete: moves the post out of every normal view but keeps it recoverable. */
export const archiveBlogPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { isArchived: true, archivedAt: new Date(), archivedBy: req.user!._id, archiveReason: req.body?.reason },
      { new: true }
    );
    if (!post) {
      sendError(res, 'Blog post not found.', 404);
      return;
    }
    sendSuccess(res, post, 'Blog post archived.');
  } catch {
    sendError(res, 'Could not archive blog post.', 500);
  }
};

/** Restore from archive — used by both the Restore action and the Undo toast. */
export const restoreBlogPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { isArchived: false, $unset: { archivedAt: '', archivedBy: '', archiveReason: '' } },
      { new: true }
    );
    if (!post) {
      sendError(res, 'Blog post not found.', 404);
      return;
    }
    sendSuccess(res, post, 'Blog post restored.');
  } catch {
    sendError(res, 'Could not restore blog post.', 500);
  }
};

/** Permanent delete — only ever reachable from the Archive view, never the main list. */
export const deleteBlogPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) {
      sendError(res, 'Blog post not found.', 404);
      return;
    }
    sendSuccess(res, null, 'Blog post permanently deleted.');
  } catch {
    sendError(res, 'Could not delete blog post.', 500);
  }
};
