import { Router } from 'express';
import { getInstructorReport, getAdminReport } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);
router.get('/instructor', authorize('instructor', 'admin', 'super_admin'), getInstructorReport);
router.get('/admin', authorize('admin', 'super_admin'), getAdminReport);

export default router;
