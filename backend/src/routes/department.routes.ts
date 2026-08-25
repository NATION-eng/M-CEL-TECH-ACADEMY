import { Router } from 'express';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/curriculum.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.get('/', optionalAuth, getDepartments);
router.post('/', authenticate, authorize('admin', 'super_admin'), createDepartment);
router.put('/:id', authenticate, authorize('admin', 'super_admin'), updateDepartment);
router.delete('/:id', authenticate, authorize('super_admin'), deleteDepartment);

export default router;
