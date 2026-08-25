import { Router } from 'express';
import { getEvents, getEventById, createEvent, updateEvent, deleteEvent } from '../controllers/event.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
router.get('/', optionalAuth, getEvents);
router.get('/:id', optionalAuth, getEventById);
router.post('/', authenticate, authorize('admin', 'super_admin'), createEvent);
router.put('/:id', authenticate, authorize('admin', 'super_admin'), updateEvent);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), deleteEvent);

export default router;
