import { Router } from 'express';
import { getStudentDashboard, getInstructorDashboard, getAdminDashboard } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
router.use(authenticate);

router.get('/student', authorize('student'), getStudentDashboard);
router.get('/instructor', authorize('instructor', 'admin', 'super_admin'), getInstructorDashboard);
router.get('/admin', authorize('admin', 'super_admin'), getAdminDashboard);

export default router;
