import { Response } from 'express';
import Assignment from '../models/Assignment.model';
import Submission from '../models/Submission.model';
import Course from '../models/Course.model';
import Enrollment from '../models/Enrollment.model';
import Notification from '../models/Notification.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { uploadBufferToCloudinary } from '../config/cloudinary';

// ─── Assignments ────────────────────────────────────────────────────────────
export const getAssignments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.week) filter.week = req.query.week;
    if (!req.user || req.user.role === 'student') filter.isPublished = true;

    const assignments = await Assignment.find(filter).sort({ dueDate: 1 });
    sendSuccess(res, assignments, 'Assignments fetched.');
  } catch {
    sendError(res, 'Could not fetch assignments.', 500);
  }
};

export const getAssignmentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      sendError(res, 'Assignment not found.', 404);
      return;
    }
    sendSuccess(res, assignment, 'Assignment fetched.');
  } catch {
    sendError(res, 'Could not fetch assignment.', 500);
  }
};

export const createAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, course, description, instructions, dueDate, maxScore, submissionTypes, week, lesson, isPublished } = req.body;
    if (!title || !course || !description || !instructions || !dueDate) {
      sendError(res, 'Title, course, description, instructions, and due date are required.', 400);
      return;
    }
    const assignment = await Assignment.create({
      title, course, description, instructions, dueDate, week, lesson,
      maxScore: maxScore || 100,
      submissionTypes: submissionTypes?.length ? submissionTypes : ['file'],
      isPublished: !!isPublished,
      createdBy: req.user!._id,
    });
    sendSuccess(res, assignment, 'Assignment created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create assignment.', 500);
  }
};

export const updateAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!assignment) {
      sendError(res, 'Assignment not found.', 404);
      return;
    }
    sendSuccess(res, assignment, 'Assignment updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update assignment.', 500);
  }
};

export const deleteAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      sendError(res, 'Assignment not found.', 404);
      return;
    }
    sendSuccess(res, null, 'Assignment deleted.');
  } catch {
    sendError(res, 'Could not delete assignment.', 500);
  }
};

// ─── Submissions ────────────────────────────────────────────────────────────
// Frontend calls: POST /submissions/:assignmentId  (multipart/form-data)
export const submitAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assignmentId = req.params.assignmentId;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      sendError(res, 'Assignment not found.', 404);
      return;
    }

    const { githubUrl, portfolioUrl, liveUrl, textContent } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];

    const fileUrls: string[] = [];
    for (const file of files) {
      const { url } = await uploadBufferToCloudinary(file.buffer, 'submissions', 'raw');
      fileUrls.push(url);
    }

    const isLate = new Date() > new Date(assignment.dueDate);

    const submission = await Submission.findOneAndUpdate(
      { assignment: assignmentId, student: req.user!._id },
      {
        assignment: assignmentId,
        student: req.user!._id,
        submittedAt: new Date(),
        fileUrls,
        githubUrl,
        portfolioUrl,
        liveUrl,
        textContent,
        status: isLate ? 'late' : 'submitted',
      },
      { new: true, upsert: true, runValidators: true }
    );

    sendSuccess(res, submission, 'Assignment submitted successfully.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Submission failed.', 500);
  }
};

export const getSubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.assignment) filter.assignment = req.query.assignment;

    if (req.query.course || req.user!.role === 'instructor') {
      // Instructors only ever see submissions for courses they actually teach —
      // without this an instructor could grade (and see) every submission on
      // the platform, not just their own students'.
      const courseFilter: Record<string, unknown> = req.query.course
        ? { _id: req.query.course }
        : { instructors: req.user!._id };
      const myCourses = await Course.find(courseFilter).select('_id');
      const myAssignments = await Assignment.find({ course: { $in: myCourses.map(c => c._id) } }).select('_id');
      const allowedIds = myAssignments.map(a => a._id);

      filter.assignment = req.query.assignment
        ? { $in: allowedIds.filter(id => String(id) === req.query.assignment) }
        : { $in: allowedIds };
    }

    const submissions = await Submission.find(filter)
      .populate('student', 'firstName lastName email')
      .populate({ path: 'assignment', select: 'title maxScore dueDate course', populate: { path: 'course', select: 'title' } })
      .sort({ submittedAt: -1 });
    sendSuccess(res, submissions, 'Submissions fetched.');
  } catch {
    sendError(res, 'Could not fetch submissions.', 500);
  }
};

/**
 * The student's full assignment list — every published assignment across
 * their enrolled courses, merged with their submission if one exists.
 * Previously this only queried Submission documents, which meant an
 * assignment the student hadn't submitted yet (i.e. no Submission row exists)
 * never appeared at all — the "pending" state was completely unreachable.
 */
export const getMySubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enrollments = await Enrollment.find({ student: req.user!._id }).select('course');
    const courseIds = enrollments.map((e) => e.course);

    const assignments = await Assignment.find({ course: { $in: courseIds }, isPublished: true })
      .populate('course', 'title')
      .sort({ dueDate: 1 });

    const submissions = await Submission.find({
      student: req.user!._id,
      assignment: { $in: assignments.map((a) => a._id) },
    });
    const byAssignmentId = new Map<string, typeof submissions[number]>(
      submissions.map((s) => [String(s.assignment), s] as const)
    );

    const merged = assignments.map((a) => {
      const sub = byAssignmentId.get(String(a._id));
      const isOverdue = new Date() > new Date(a.dueDate);
      return {
        _id: sub?._id ?? a._id,
        assignmentId: a._id,
        title: a.title,
        description: a.description,
        instructions: a.instructions,
        course: a.course,
        dueDate: a.dueDate,
        maxScore: a.maxScore,
        submissionTypes: a.submissionTypes,
        status: sub?.status ?? (isOverdue ? 'late' : 'pending'),
        score: sub?.score,
        feedback: sub?.feedback,
        submittedAt: sub?.submittedAt,
        fileUrls: sub?.fileUrls ?? [],
        githubUrl: sub?.githubUrl,
        liveUrl: sub?.liveUrl,
      };
    });

    sendSuccess(res, merged, 'Your assignments fetched.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not fetch your assignments.', 500);
  }
};

// Frontend calls: PATCH /submissions/:id/grade
export const gradeSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { score, feedback } = req.body;
    if (score === undefined) {
      sendError(res, 'Score is required.', 400);
      return;
    }

    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { score, feedback, status: 'graded', gradedBy: req.user!._id, gradedAt: new Date() },
      { new: true }
    );
    if (!submission) {
      sendError(res, 'Submission not found.', 404);
      return;
    }

    await Notification.create({
      recipient: submission.student,
      type: 'grade',
      title: 'Assignment Graded',
      message: `Your assignment has been graded. Score: ${score}.`,
      link: '/student/assignments',
    });

    sendSuccess(res, submission, 'Submission graded.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not grade submission.', 500);
  }
};
