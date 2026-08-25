import { Response } from 'express';
import Announcement from '../models/Announcement.model';
import Course from '../models/Course.model';
import Enrollment from '../models/Enrollment.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse';
import { sanitizeRichText } from '../utils/sanitizeHtml';

const isStaff = (req: AuthRequest) => !!req.user && ['admin', 'super_admin'].includes(req.user.role);

/** Public/portal feed — only genuinely live announcements targeted at this user. */
export const getAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const filter: Record<string, unknown> = {
      isPublished: true,
      isArchived: false,
      $or: [{ scheduledFor: { $exists: false } }, { scheduledFor: { $lte: now } }],
      $and: [{ $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }] }],
    };
    // Role targeting: students only see announcements aimed at students, etc.
    if (req.user) {
      (filter.$and as unknown[]).push({ $or: [{ targetRoles: { $size: 0 } }, { targetRoles: req.user.role }] });
    }
    // Course targeting: an announcement scoped to specific courses (e.g. an
    // instructor's course-only update) should only reach students actually
    // enrolled in one of those courses.
    if (req.user?.role === 'student') {
      const enrollments = await Enrollment.find({ student: req.user._id }).select('course');
      const courseIds = enrollments.map(e => String(e.course));
      (filter.$and as unknown[]).push({ $or: [{ targetCourses: { $size: 0 } }, { targetCourses: { $in: courseIds } }] });
    }

    const announcements = await Announcement.find(filter)
      .populate('author', 'firstName lastName')
      .populate('targetCourses', 'title')
      .sort({ isPinned: -1, publishedAt: -1 });
    sendSuccess(res, announcements, 'Announcements fetched.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not fetch announcements.', 500);
  }
};

/** Staff content-management view: paginated, searchable, status-filterable. */
export const getAnnouncementsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 12);
    const filter: Record<string, unknown> = {};

    const status = req.query.status as string | undefined;
    if (status === 'draft') { filter.isPublished = false; filter.isArchived = false; }
    else if (status === 'scheduled') { filter.isPublished = true; filter.scheduledFor = { $gt: new Date() }; filter.isArchived = false; }
    else if (status === 'published') { filter.isPublished = true; filter.isArchived = false; filter.$or = [{ scheduledFor: { $exists: false } }, { scheduledFor: { $lte: new Date() } }]; }
    else if (status === 'archived') { filter.isArchived = true; }
    else { filter.isArchived = false; }

    if (req.query.search) {
      const textClause = { $text: { $search: String(req.query.search) } };
      if (filter.$or) { filter.$and = [{ $or: filter.$or }, textClause]; delete filter.$or; }
      else Object.assign(filter, textClause);
    }

    // Instructors only manage their own announcements in this view.
    if (req.user!.role === 'instructor') filter.author = req.user!._id;

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .populate('author', 'firstName lastName')
        .populate('targetCourses', 'title')
        .populate('archivedBy', 'firstName lastName')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Announcement.countDocuments(filter),
    ]);
    sendPaginated(res, announcements, total, page, limit, 'Announcements fetched.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not fetch announcements.', 500);
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, targetRoles, targetCourses, isPinned, expiresAt, isPublished, scheduledFor } = req.body;
    if (!title || !content) {
      sendError(res, 'Title and content are required.', 400);
      return;
    }

    let finalTargetRoles = targetRoles || [];
    let finalTargetCourses = targetCourses || [];

    if (req.user!.role === 'instructor') {
      // Instructors can only reach students, and only in courses they
      // actually teach — not an open broadcast to the whole platform.
      finalTargetRoles = ['student'];
      if (!Array.isArray(finalTargetCourses) || finalTargetCourses.length === 0) {
        sendError(res, 'Select at least one of your courses to announce to.', 400);
        return;
      }
      const myCourses = await Course.find({ _id: { $in: finalTargetCourses }, instructors: req.user!._id }).select('_id');
      if (myCourses.length !== finalTargetCourses.length) {
        sendError(res, 'You can only announce to courses you teach.', 403);
        return;
      }
    }

    const willPublish = isPublished !== false; // default true, preserving old always-publish behavior unless explicitly drafted
    const isFutureScheduled = scheduledFor && new Date(scheduledFor) > new Date();

    const announcement = await Announcement.create({
      title, content: sanitizeRichText(content),
      targetRoles: finalTargetRoles,
      targetCourses: finalTargetCourses,
      isPinned: !!isPinned,
      isPublished: willPublish,
      publishedAt: willPublish ? (isFutureScheduled ? new Date(scheduledFor) : new Date()) : undefined,
      scheduledFor: isFutureScheduled ? new Date(scheduledFor) : undefined,
      expiresAt,
      author: req.user!._id,
    });
    sendSuccess(res, announcement, willPublish ? 'Announcement published.' : 'Draft saved.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create announcement.', 500);
  }
};

export const updateAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await Announcement.findById(req.params.id);
    if (!existing) {
      sendError(res, 'Announcement not found.', 404);
      return;
    }
    if (req.user!.role === 'instructor' && String(existing.author) !== String(req.user!._id)) {
      sendError(res, 'You can only edit your own announcements.', 403);
      return;
    }

    const body = { ...req.body };
    if (body.content) body.content = sanitizeRichText(body.content);
    if (req.user!.role === 'instructor') {
      // Same guardrails as creation apply to edits.
      body.targetRoles = ['student'];
      if (body.targetCourses) {
        const myCourses = await Course.find({ _id: { $in: body.targetCourses }, instructors: req.user!._id }).select('_id');
        if (myCourses.length !== body.targetCourses.length) {
          sendError(res, 'You can only announce to courses you teach.', 403);
          return;
        }
      }
    }
    if (body.isPublished && !body.publishedAt && !existing.publishedAt) body.publishedAt = new Date();
    if (body.scheduledFor) {
      body.scheduledFor = new Date(body.scheduledFor) > new Date() ? new Date(body.scheduledFor) : undefined;
    }

    const announcement = await Announcement.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    sendSuccess(res, announcement, 'Announcement updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update announcement.', 500);
  }
};

const canManage = (req: AuthRequest, authorId: unknown) =>
  isStaff(req) || String(authorId) === String(req.user!._id);

export const archiveAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await Announcement.findById(req.params.id);
    if (!existing) { sendError(res, 'Announcement not found.', 404); return; }
    if (!canManage(req, existing.author)) { sendError(res, 'You can only archive your own announcements.', 403); return; }

    existing.isArchived = true;
    existing.archivedAt = new Date();
    existing.archivedBy = req.user!._id;
    existing.archiveReason = req.body?.reason;
    await existing.save();
    sendSuccess(res, existing, 'Announcement archived.');
  } catch {
    sendError(res, 'Could not archive announcement.', 500);
  }
};

export const restoreAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await Announcement.findById(req.params.id);
    if (!existing) { sendError(res, 'Announcement not found.', 404); return; }
    if (!canManage(req, existing.author)) { sendError(res, 'You can only restore your own announcements.', 403); return; }

    existing.isArchived = false;
    existing.archivedAt = undefined;
    existing.archivedBy = undefined;
    existing.archiveReason = undefined;
    await existing.save();
    sendSuccess(res, existing, 'Announcement restored.');
  } catch {
    sendError(res, 'Could not restore announcement.', 500);
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await Announcement.findById(req.params.id);
    if (!existing) {
      sendError(res, 'Announcement not found.', 404);
      return;
    }
    if (!canManage(req, existing.author)) {
      sendError(res, 'You can only delete your own announcements.', 403);
      return;
    }
    await Announcement.findByIdAndDelete(req.params.id);
    sendSuccess(res, null, 'Announcement permanently deleted.');
  } catch {
    sendError(res, 'Could not delete announcement.', 500);
  }
};
