import { Router } from 'express';
import { getSchools, createSchool, updateSchool, deleteSchool } from '../controllers/curriculum.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.get('/', optionalAuth, getSchools);
router.post('/', authenticate, authorize('admin', 'super_admin'), createSchool);
router.put('/:id', authenticate, authorize('admin', 'super_admin'), updateSchool);
router.delete('/:id', authenticate, authorize('super_admin'), deleteSchool);

export default router;
