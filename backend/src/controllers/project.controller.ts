import { Response } from 'express';
import Project from '../models/Project.model';
import Course from '../models/Course.model';
import Notification from '../models/Notification.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, type, course, teamMembers, githubUrl, liveUrl, thumbnailUrl, technologies } = req.body;
    if (!title || !description || !type) {
      sendError(res, 'Title, description, and type are required.', 400);
      return;
    }

    const project = await Project.create({
      title, description, type, course, githubUrl, liveUrl, thumbnailUrl,
      teamMembers: type === 'team' ? teamMembers || [] : [],
      technologies: technologies || [],
      student: req.user!._id,
    });

    sendSuccess(res, project, 'Project created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create project.', 500);
  }
};

export const getMyProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await Project.find({
      $or: [{ student: req.user!._id }, { teamMembers: req.user!._id }],
    })
      .populate('course', 'title')
      .sort({ createdAt: -1 });
    sendSuccess(res, projects, 'Your projects fetched.');
  } catch {
    sendError(res, 'Could not fetch your projects.', 500);
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      sendError(res, 'Project not found.', 404);
      return;
    }
    const isOwner = project.student.toString() === req.user!._id.toString();
    const isElevated = ['instructor', 'admin', 'super_admin'].includes(req.user!.role);
    if (!isOwner && !isElevated) {
      sendError(res, 'You do not have permission to edit this project.', 403);
      return;
    }

    // Field allowlist by role — without this, Object.assign(project, req.body)
    // would let a student set their own status to 'completed', or set their
    // own grade/feedback, directly undermining the certificate eligibility
    // engine (which trusts project.status) and grading integrity generally.
    const studentEditableFields = ['title', 'description', 'githubUrl', 'liveUrl', 'thumbnailUrl', 'technologies', 'teamMembers'];
    const staffOnlyFields = ['status', 'feedback', 'grade', 'reviewedBy'];
    const allowedFields = isElevated ? [...studentEditableFields, ...staffOnlyFields] : studentEditableFields;

    for (const field of allowedFields) {
      if (field in req.body) {
        (project as unknown as Record<string, unknown>)[field] = req.body[field];
      }
    }
    if (isElevated && 'status' in req.body) {
      project.reviewedBy = req.user!._id;
    }

    await project.save();
    sendSuccess(res, project, 'Project updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update project.', 500);
  }
};

export const getAllProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.course) filter.course = req.query.course;

    if (req.user!.role === 'instructor') {
      // Without this an instructor could see every project on the platform,
      // not just their own students' — same scoping every other instructor
      // list (submissions, roster, courses) needed.
      const myCourses = await Course.find({ instructors: req.user!._id }).select('_id');
      const myCourseIds = myCourses.map(c => String(c._id));
      filter.course = filter.course
        ? (myCourseIds.includes(String(filter.course)) ? filter.course : null) // requested a course they don't teach -> no results
        : { $in: myCourseIds };
    }

    const projects = await Project.find(filter)
      .populate('student', 'firstName lastName')
      .populate('course', 'title')
      .sort({ createdAt: -1 });
    sendSuccess(res, projects, 'Projects fetched.');
  } catch {
    sendError(res, 'Could not fetch projects.', 500);
  }
};

export const reviewProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await Project.findById(req.params.id);
    if (!existing) {
      sendError(res, 'Project not found.', 404);
      return;
    }
    if (req.user!.role === 'instructor' && existing.course) {
      const course = await Course.findById(existing.course);
      const teaches = course?.instructors.some(i => String(i) === String(req.user!._id));
      if (!teaches) {
        sendError(res, 'You can only review projects from courses you teach.', 403);
        return;
      }
    }

    const { feedback, grade, status } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { feedback, grade, status: status || 'completed', reviewedBy: req.user!._id },
      { new: true }
    );
    if (!project) {
      sendError(res, 'Project not found.', 404);
      return;
    }

    await Notification.create({
      recipient: project.student,
      type: 'grade',
      title: 'Project Reviewed',
      message: `Your project "${project.title}" has been reviewed.`,
      link: '/student/projects',
    });

    sendSuccess(res, project, 'Project reviewed.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not review project.', 500);
  }
};
