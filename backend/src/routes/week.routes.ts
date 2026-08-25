import { Router } from 'express';
import { getWeeks, createWeek, updateWeek, deleteWeek } from '../controllers/curriculumHierarchy.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
router.get('/', optionalAuth, getWeeks);
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), createWeek);
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), updateWeek);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), deleteWeek);

export default router;
