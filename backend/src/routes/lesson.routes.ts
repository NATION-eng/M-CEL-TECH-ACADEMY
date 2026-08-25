import { Router } from 'express';
import {
  getLessons, getLessonById, createLesson, updateLesson, deleteLesson, addLessonDownload,
} from '../controllers/lesson.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();
router.get('/', optionalAuth, getLessons);
router.get('/:id', optionalAuth, getLessonById);
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), createLesson);
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), updateLesson);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), deleteLesson);
router.post('/:id/downloads', authenticate, authorize('instructor', 'admin', 'super_admin'), uploadSingle, addLessonDownload);

export default router;
