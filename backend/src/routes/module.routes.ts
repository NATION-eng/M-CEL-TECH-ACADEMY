import { Router } from 'express';
import { getModules, createModule, updateModule, deleteModule } from '../controllers/curriculumHierarchy.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
router.get('/', optionalAuth, getModules);
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), createModule);
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), updateModule);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), deleteModule);

export default router;
