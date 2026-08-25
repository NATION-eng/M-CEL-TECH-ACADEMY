import { Router } from 'express';
import {
  getCourses, getCourseById, createCourse, updateCourse, archiveCourse, restoreCourse, deleteCourse,
} from '../controllers/course.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.get('/', optionalAuth, getCourses);
router.get('/:id', optionalAuth, getCourseById);
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), createCourse);
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), updateCourse);
router.patch('/:id/archive', authenticate, authorize('instructor', 'admin', 'super_admin'), archiveCourse);
router.patch('/:id/restore', authenticate, authorize('instructor', 'admin', 'super_admin'), restoreCourse);
router.delete('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), deleteCourse);

export default router;
