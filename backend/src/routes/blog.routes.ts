import { Router } from 'express';
import {
  getBlogPosts, getBlogPostBySlug, createBlogPost, updateBlogPost,
  archiveBlogPost, restoreBlogPost, deleteBlogPost,
} from '../controllers/blog.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();
router.get('/', optionalAuth, getBlogPosts);
router.get('/:slug', getBlogPostBySlug);
router.post('/', authenticate, authorize('admin', 'super_admin'), createBlogPost);
router.put('/:id', authenticate, authorize('admin', 'super_admin'), updateBlogPost);
router.patch('/:id/archive', authenticate, authorize('admin', 'super_admin'), archiveBlogPost);
router.patch('/:id/restore', authenticate, authorize('admin', 'super_admin'), restoreBlogPost);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), deleteBlogPost);

export default router;
