import { Router } from 'express';
import {
  markAttendance, getAttendanceForCourse, getMyAttendance, getAttendanceReport,
} from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
router.use(authenticate);

router.get('/my-attendance', authorize('student'), getMyAttendance);
router.get('/report/:courseId', authorize('instructor', 'admin', 'super_admin'), getAttendanceReport);
router.post('/', authorize('instructor', 'admin', 'super_admin'), markAttendance);
router.get('/', authorize('instructor', 'admin', 'super_admin'), getAttendanceForCourse);

export default router;
