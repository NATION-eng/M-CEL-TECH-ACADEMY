import { Router } from 'express';
import { getResources, createResource, createYoutubeResource, uploadInlineImage, downloadResource, deleteResource } from '../controllers/resource.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { uploadSingle, uploadMediaSingle } from '../middleware/upload.middleware';

const router = Router();

router.get('/', optionalAuth, getResources);
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), uploadSingle, createResource);
// Separate route for video/audio — same handler, but multer is configured
// with a much higher size limit (see upload.middleware.ts) than documents.
router.post('/media', authenticate, authorize('instructor', 'admin', 'super_admin'), uploadMediaSingle, createResource);
router.post('/youtube', authenticate, authorize('instructor', 'admin', 'super_admin'), createYoutubeResource);
router.post('/inline-image', authenticate, authorize('instructor', 'admin', 'super_admin'), uploadSingle, uploadInlineImage);
router.get('/:id/download', authenticate, downloadResource);
router.delete('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), deleteResource);

export default router;
