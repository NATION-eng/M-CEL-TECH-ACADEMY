import { Router } from 'express';
import { getSettings, updateSettings, getPublicSettings } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/error.middleware';

const router = Router();

// Any logged-in user can read the payment-provider toggles (checkout needs
// to know which options to show) — everything else stays super_admin-only.
router.get('/public', authenticate, getPublicSettings);

// Platform settings include payment gateway toggles and security policy —
// exclusively a Super Admin concern, even regular Admins cannot touch this.
router.use(authenticate, authorize('super_admin'));

router.get('/', getSettings);
router.put('/', auditLog('UPDATE_SETTINGS', 'Settings'), updateSettings);

export default router;
