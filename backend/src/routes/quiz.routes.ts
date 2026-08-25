import { Router } from 'express';
import {
  getQuizzes, getQuizById, createQuiz, updateQuiz, deleteQuiz,
  startAttempt, submitAttempt, getMyAttempts,
} from '../controllers/quiz.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.get('/', optionalAuth, getQuizzes);
router.get('/my-attempts', authenticate, getMyAttempts);
// '/attempts/:attemptId/submit' must be registered before '/:id' to avoid 'attempts' being parsed as an id
router.post('/attempts/:attemptId/submit', authenticate, authorize('student'), submitAttempt);
router.get('/:id', optionalAuth, getQuizById);
router.post('/:id/attempt', authenticate, authorize('student'), startAttempt);
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), createQuiz);
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), updateQuiz);
router.delete('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), deleteQuiz);

export default router;
