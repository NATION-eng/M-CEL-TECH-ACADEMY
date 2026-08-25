import { Router } from 'express';
import { createProject, getMyProjects, updateProject, getAllProjects, reviewProject } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
router.use(authenticate);

router.get('/my-projects', authorize('student'), getMyProjects);
router.get('/', authorize('instructor', 'admin', 'super_admin'), getAllProjects);
router.post('/', authorize('student'), createProject);
router.put('/:id', updateProject);
router.patch('/:id/review', authorize('instructor', 'admin', 'super_admin'), reviewProject);

export default router;
