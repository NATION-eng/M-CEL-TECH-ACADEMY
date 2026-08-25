import { Response } from 'express';
import Lesson from '../models/Lesson.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { uploadBufferToCloudinary } from '../config/cloudinary';

export const getLessons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.week) filter.week = req.query.week;
    // Students/visitors only see published lessons; instructors/admins see everything
    if (!req.user || req.user.role === 'student') filter.isPublished = true;
    const lessons = await Lesson.find(filter).sort({ order: 1 });
    sendSuccess(res, lessons, 'Lessons fetched.');
  } catch {
    sendError(res, 'Could not fetch lessons.', 500);
  }
};

export const getLessonById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      sendError(res, 'Lesson not found.', 404);
      return;
    }
    if (!lesson.isPublished && req.user?.role === 'student') {
      sendError(res, 'This lesson is not yet available.', 403);
      return;
    }
    sendSuccess(res, lesson, 'Lesson fetched.');
  } catch {
    sendError(res, 'Could not fetch lesson.', 500);
  }
};

export const createLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, week, description, videoUrl, notes, slides, codeSnippets, isFree, isPublished, order } = req.body;
    if (!title || !week) {
      sendError(res, 'Lesson title and week are required.', 400);
      return;
    }
    const existingCount = await Lesson.countDocuments({ week });
    const lesson = await Lesson.create({
      title, week, description, videoUrl, notes, slides, codeSnippets,
      isFree: !!isFree,
      isPublished: !!isPublished,
      order: order ?? existingCount + 1,
      createdBy: req.user!._id,
    });
    sendSuccess(res, lesson, 'Lesson created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create lesson.', 500);
  }
};

export const updateLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!lesson) {
      sendError(res, 'Lesson not found.', 404);
      return;
    }
    sendSuccess(res, lesson, 'Lesson updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update lesson.', 500);
  }
};

export const deleteLesson = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!lesson) {
      sendError(res, 'Lesson not found.', 404);
      return;
    }
    sendSuccess(res, null, 'Lesson deleted.');
  } catch {
    sendError(res, 'Could not delete lesson.', 500);
  }
};

/** Uploads a downloadable resource file (PDF, ZIP, etc) and attaches it to the lesson's downloads array. */
export const addLessonDownload = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      sendError(res, 'No file uploaded.', 400);
      return;
    }
    const { url } = await uploadBufferToCloudinary(file.buffer, 'lesson-downloads', 'raw');
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { $push: { downloads: { name: file.originalname, url, type: file.mimetype } } },
      { new: true }
    );
    if (!lesson) {
      sendError(res, 'Lesson not found.', 404);
      return;
    }
    sendSuccess(res, lesson, 'File uploaded and attached to lesson.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Upload failed.', 500);
  }
};
