import { Router } from 'express';
import {
  getAssignments, getAssignmentById, createAssignment, updateAssignment, deleteAssignment,
} from '../controllers/assignment.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.get('/', optionalAuth, getAssignments);
router.get('/:id', optionalAuth, getAssignmentById);
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), createAssignment);
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), updateAssignment);
router.delete('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), deleteAssignment);

export default router;
