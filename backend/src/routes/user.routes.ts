import { Router } from 'express';
import {
  getAllUsers, getUserById, updateUser, suspendUser, activateUser, deleteUser, createUser,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, ownerOrRoles } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'super_admin'), getAllUsers);
router.post('/', authorize('admin', 'super_admin'), createUser);
router.get('/:id', ownerOrRoles('id', 'admin', 'super_admin'), getUserById);
router.put('/:id', ownerOrRoles('id', 'admin', 'super_admin'), updateUser);
router.patch('/:id/suspend', authorize('admin', 'super_admin'), suspendUser);
router.patch('/:id/activate', authorize('admin', 'super_admin'), activateUser);
router.delete('/:id', authorize('super_admin'), deleteUser);

export default router;
