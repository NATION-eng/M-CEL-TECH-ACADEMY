import { Response } from 'express';
import Course from '../models/Course.model';
import BadgeLevel from '../models/BadgeLevel.model';
import Enrollment from '../models/Enrollment.model';
import Module from '../models/Module.model';
import Week from '../models/Week.model';
import Lesson from '../models/Lesson.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse';
import { generateSlug } from '../utils/generateId';

const isStaff = (req: AuthRequest) => ['admin', 'super_admin'].includes(req.user!.role);

export const getCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { department, isPublished, deliveryMode, search, instructor, status } = req.query;

    // Archived courses are invisible by default — only surfaced when an
    // admin/instructor explicitly asks for them via ?status=archived, so
    // there's still a way to find, restore, or permanently delete them
    // instead of them just disappearing forever once archived.
    const filter: Record<string, unknown> = { isArchived: status === 'archived' };
    if (department) filter.department = department;
    if (isPublished !== undefined) filter.isPublished = isPublished === 'true';
    if (deliveryMode) filter.deliveryMode = deliveryMode;
    if (search) filter.title = { $regex: search as string, $options: 'i' };
    if (instructor) filter.instructors = instructor;

    // Public (unauthenticated) requests only ever see published courses
    if (!req.user) filter.isPublished = true;

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('department', 'name slug')
        .populate('instructors', 'firstName lastName')
        .populate('archivedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Course.countDocuments(filter),
    ]);

    sendPaginated(res, courses, total, page, limit, 'Courses fetched.');
  } catch {
    sendError(res, 'Could not fetch courses.', 500);
  }
};

export const getCourseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('department', 'name slug school')
      .populate('instructors', 'firstName lastName email');
    if (!course) {
      sendError(res, 'Course not found.', 404);
      return;
    }
    const badgeLevels = await BadgeLevel.find({ course: course._id }).sort({ order: 1 });
    sendSuccess(res, { course, badgeLevels }, 'Course fetched.');
  } catch {
    sendError(res, 'Could not fetch course.', 500);
  }
};

export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, department, description, shortDescription, price,
      depositPercentage, duration, deliveryMode, classSchedule, tags, whatYouLearn, requirements,
    } = req.body;

    if (!title || !department || !description || !price) {
      sendError(res, 'Title, department, description, and price are required.', 400);
      return;
    }

    const pct = depositPercentage || 60;
    if (pct < 50) {
      sendError(res, 'Deposit percentage must be at least 50% per academy policy.', 400);
      return;
    }

    // Instructor-created courses start unpublished — admin/super_admin still
    // gets final say on what goes live and at what price, even though
    // instructors can now author the course content itself.
    const isInstructor = req.user!.role === 'instructor';

    const course = await Course.create({
      title,
      slug: generateSlug(title),
      department,
      description,
      shortDescription: shortDescription || description.slice(0, 140),
      price,
      depositPercentage: pct,
      depositAmount: Math.ceil((price * pct) / 100),
      duration: duration || 'TBD',
      deliveryMode: deliveryMode || 'hybrid',
      classSchedule: classSchedule || [],
      tags: tags || [],
      whatYouLearn: whatYouLearn || [],
      requirements: requirements || [],
      instructors: isInstructor ? [req.user!._id] : [],
      isPublished: false,
      createdBy: req.user!._id,
    });

    sendSuccess(res, course, 'Course created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create course.', 500);
  }
};

export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      sendError(res, 'Course not found.', 404);
      return;
    }

    const staff = isStaff(req);
    const isAssignedInstructor = course.instructors.some(i => String(i) === String(req.user!._id));
    if (!staff && !isAssignedInstructor) {
      sendError(res, 'You can only edit courses you teach.', 403);
      return;
    }

    // Field allowlist: instructors can shape course content, but pricing,
    // department, and who's assigned to teach it stay an admin decision —
    // an instructor changing their own course's price, or the roster of who
    // else can edit it, would be a real business-logic/security problem.
    const instructorFields = ['description', 'shortDescription', 'duration', 'deliveryMode', 'classSchedule', 'tags', 'whatYouLearn', 'requirements', 'isPublished'];
    const staffOnlyFields = ['title', 'department', 'price', 'depositPercentage', 'instructors'];
    const allowedFields = staff ? [...instructorFields, ...staffOnlyFields] : instructorFields;

    const update: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in req.body) update[field] = req.body[field];
    }
    if (typeof update.title === 'string') update.slug = generateSlug(update.title);
    if ('price' in update || 'depositPercentage' in update) {
      const price = (update.price as number) ?? course.price;
      const pct = (update.depositPercentage as number) ?? course.depositPercentage;
      if (pct < 50) {
        sendError(res, 'Deposit percentage must be at least 50% per academy policy.', 400);
        return;
      }
      update.depositAmount = Math.ceil((price * pct) / 100);
    }

    Object.assign(course, update);
    await course.save();
    sendSuccess(res, course, 'Course updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update course.', 500);
  }
};

export const archiveCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      sendError(res, 'Course not found.', 404);
      return;
    }
    const staff = isStaff(req);
    const isAssignedInstructor = course.instructors.some(i => String(i) === String(req.user!._id));
    if (!staff && !isAssignedInstructor) {
      sendError(res, 'You can only archive courses you teach.', 403);
      return;
    }
    course.isArchived = true;
    course.archivedAt = new Date();
    course.archivedBy = req.user!._id;
    course.archiveReason = req.body?.reason;
    await course.save();
    sendSuccess(res, course, 'Course archived.');
  } catch {
    sendError(res, 'Could not archive course.', 500);
  }
};

/** Restore an archived course — used by both the Restore action and the Undo toast. */
export const restoreCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      sendError(res, 'Course not found.', 404);
      return;
    }
    const staff = isStaff(req);
    const isAssignedInstructor = course.instructors.some(i => String(i) === String(req.user!._id));
    if (!staff && !isAssignedInstructor) {
      sendError(res, 'You can only restore courses you teach.', 403);
      return;
    }
    course.isArchived = false;
    course.archivedAt = undefined;
    course.archivedBy = undefined;
    course.archiveReason = undefined;
    await course.save();
    sendSuccess(res, course, 'Course restored.');
  } catch {
    sendError(res, 'Could not restore course.', 500);
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      sendError(res, 'Course not found.', 404);
      return;
    }

    if (!isStaff(req)) {
      // Instructors can only delete a course they personally created, and
      // only if no student has ever enrolled — deleting a course out from
      // under paying/enrolled students would corrupt their payment and
      // progress history. Admin/super_admin can always override.
      if (String(course.createdBy) !== String(req.user!._id)) {
        sendError(res, 'You can only delete courses you created.', 403);
        return;
      }
      const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
      if (enrollmentCount > 0) {
        sendError(res, `This course has ${enrollmentCount} enrolled student(s) and cannot be deleted. Archive it instead.`, 409);
        return;
      }
    }

    await Course.findByIdAndDelete(req.params.id);
    const badgeLevels = await BadgeLevel.find({ course: course._id }).select('_id');
    const badgeIds = badgeLevels.map(b => b._id);
    const modules = await Module.find({ badgeLevel: { $in: badgeIds } }).select('_id');
    const moduleIds = modules.map(m => m._id);
    const weeks = await Week.find({ module: { $in: moduleIds } }).select('_id');
    const weekIds = weeks.map(w => w._id);

    await Promise.all([
      BadgeLevel.deleteMany({ course: course._id }),
      Module.deleteMany({ badgeLevel: { $in: badgeIds } }),
      Week.deleteMany({ module: { $in: moduleIds } }),
      Lesson.deleteMany({ week: { $in: weekIds } }),
    ]);

    sendSuccess(res, null, 'Course and associated curriculum deleted.');
  } catch {
    sendError(res, 'Could not delete course.', 500);
  }
};
