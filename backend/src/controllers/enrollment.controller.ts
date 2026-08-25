import { Response } from 'express';
import Enrollment from '../models/Enrollment.model';
import Course from '../models/Course.model';
import BadgeLevel from '../models/BadgeLevel.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse';

export const createEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { course, deliveryMode, cohort, studentId } = req.body;
    if (!course) {
      sendError(res, 'Course is required.', 400);
      return;
    }

    // Students can only enroll themselves; admins/super_admins may enroll on
    // a student's behalf (e.g. right after creating their account) by
    // passing studentId — but never impersonate a different role's target.
    let student = req.user!._id;
    if (studentId && ['admin', 'super_admin'].includes(req.user!.role)) {
      student = studentId;
    }

    const courseDoc = await Course.findById(course);
    if (!courseDoc || !courseDoc.isPublished) {
      sendError(res, 'Course not found or not currently open for enrollment.', 404);
      return;
    }

    const existing = await Enrollment.findOne({ student, course });
    if (existing) {
      sendError(res, 'This student is already enrolled in this course.', 409);
      return;
    }

    const firstBadge = await BadgeLevel.findOne({ course }).sort({ order: 1 });

    const enrollment = await Enrollment.create({
      student,
      course,
      deliveryMode: deliveryMode || 'physical',
      cohort,
      currentBadge: firstBadge?._id,
      status: 'pending', // becomes 'active' once the deposit payment clears — see payment.controller
    });

    sendSuccess(res, enrollment, 'Enrollment created. Complete payment to activate full access.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create enrollment.', 500);
  }
};

export const getMyEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enrollments = await Enrollment.find({ student: req.user!._id })
      .populate('course', 'title thumbnail price deliveryMode classSchedule')
      .populate('currentBadge', 'title level')
      .sort({ enrolledAt: -1 });
    sendSuccess(res, enrollments, 'Your enrollments fetched.');
  } catch {
    sendError(res, 'Could not fetch your enrollments.', 500);
  }
};

export const getEnrollmentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate('course')
      .populate('currentBadge')
      .populate('payment');
    if (!enrollment) {
      sendError(res, 'Enrollment not found.', 404);
      return;
    }

    const isOwner = enrollment.student.toString() === req.user!._id.toString();
    const isElevated = ['instructor', 'admin', 'super_admin'].includes(req.user!.role);
    if (!isOwner && !isElevated) {
      sendError(res, 'You do not have permission to view this enrollment.', 403);
      return;
    }

    sendSuccess(res, enrollment, 'Enrollment fetched.');
  } catch {
    sendError(res, 'Could not fetch enrollment.', 500);
  }
};

/**
 * Updates progress when a student completes a lesson/week/badge.
 * Body: { completedLessonId?, completedWeekId?, completedBadgeId? }
 * Recomputes the progress percentage from completed lessons vs. total lessons in the course,
 * and marks the enrollment 'completed' once the final badge is reached.
 */
export const updateProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { completedLessonId, completedWeekId, completedBadgeId, nextBadgeId } = req.body;

    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      sendError(res, 'Enrollment not found.', 404);
      return;
    }
    if (enrollment.student.toString() !== req.user!._id.toString()) {
      sendError(res, 'This enrollment does not belong to you.', 403);
      return;
    }

    if (completedLessonId && !enrollment.completedLessons.some((id) => id.toString() === completedLessonId)) {
      enrollment.completedLessons.push(completedLessonId);
    }
    if (completedWeekId && !enrollment.completedWeeks.some((id) => id.toString() === completedWeekId)) {
      enrollment.completedWeeks.push(completedWeekId);
    }
    if (completedBadgeId && !enrollment.completedBadges.some((id) => id.toString() === completedBadgeId)) {
      enrollment.completedBadges.push(completedBadgeId);
    }
    if (nextBadgeId) {
      enrollment.currentBadge = nextBadgeId;
    }

    const totalBadges = await BadgeLevel.countDocuments({ course: enrollment.course });
    if (totalBadges > 0) {
      enrollment.progress = Math.min(100, Math.round((enrollment.completedBadges.length / totalBadges) * 100));
    }
    if (enrollment.progress >= 100) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
    }

    enrollment.lastAccessedAt = new Date();
    await enrollment.save();

    sendSuccess(res, enrollment, 'Progress updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update progress.', 500);
  }
};

export const getAllEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filter: Record<string, unknown> = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.student) filter.student = req.query.student;

    const [enrollments, total] = await Promise.all([
      Enrollment.find(filter)
        .populate('student', 'firstName lastName email')
        .populate('course', 'title')
        .sort({ enrolledAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Enrollment.countDocuments(filter),
    ]);

    sendPaginated(res, enrollments, total, page, limit, 'Enrollments fetched.');
  } catch {
    sendError(res, 'Could not fetch enrollments.', 500);
  }
};
