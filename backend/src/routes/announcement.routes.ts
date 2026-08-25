import { Router } from 'express';
import {
  getAnnouncements, getAnnouncementsAdmin, createAnnouncement, updateAnnouncement,
  archiveAnnouncement, restoreAnnouncement, deleteAnnouncement,
} from '../controllers/announcement.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
router.get('/', optionalAuth, getAnnouncements);
router.get('/manage', authenticate, authorize('instructor', 'admin', 'super_admin'), getAnnouncementsAdmin);
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), createAnnouncement);
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), updateAnnouncement);
router.patch('/:id/archive', authenticate, authorize('instructor', 'admin', 'super_admin'), archiveAnnouncement);
router.patch('/:id/restore', authenticate, authorize('instructor', 'admin', 'super_admin'), restoreAnnouncement);
router.delete('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), deleteAnnouncement);

export default router;
