import { Router } from 'express';
import { getSystemStatus } from '../controllers/system.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
router.get('/status', authenticate, authorize('super_admin'), getSystemStatus);

export default router;
