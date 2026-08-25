import { Router } from 'express';
import {
  createEnrollment, getMyEnrollments, getEnrollmentById, updateProgress, getAllEnrollments,
} from '../controllers/enrollment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
router.use(authenticate);

router.get('/my-enrollments', authorize('student'), getMyEnrollments);
router.get('/', authorize('instructor', 'admin', 'super_admin'), getAllEnrollments);
router.post('/', authorize('student', 'admin', 'super_admin'), createEnrollment);
router.get('/:id', getEnrollmentById);
router.patch('/:id/progress', authorize('student'), updateProgress);

export default router;
