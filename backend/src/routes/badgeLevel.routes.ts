import { Router } from 'express';
import { getBadgeLevels, createBadgeLevel, updateBadgeLevel, deleteBadgeLevel } from '../controllers/curriculumHierarchy.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
router.get('/', optionalAuth, getBadgeLevels);
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), createBadgeLevel);
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), updateBadgeLevel);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), deleteBadgeLevel);

export default router;
