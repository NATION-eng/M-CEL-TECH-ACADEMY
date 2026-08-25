import { Router } from 'express';
import {
  submitAssignment, getSubmissions, getMySubmissions, gradeSubmission,
} from '../controllers/assignment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { uploadMultiple } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

// Static path MUST be registered before the dynamic '/:assignmentId' route,
// otherwise Express would match 'my-submissions' as an assignmentId.
router.get('/my-submissions', getMySubmissions);
router.get('/', authorize('instructor', 'admin', 'super_admin'), getSubmissions);
router.post('/:assignmentId', authorize('student'), uploadMultiple, submitAssignment);
router.patch('/:id/grade', authorize('instructor', 'admin', 'super_admin'), gradeSubmission);

export default router;
