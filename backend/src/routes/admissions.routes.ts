import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  submitApplication, initializeAdmissionPayment, verifyAdmissionPayment, devBypassAdmission,
} from '../controllers/admissions.controller';

const router = Router();

const admissionsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many applications from this IP. Please wait before reapplying.' },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'Too many payment attempts. Please try again in a few minutes.' },
});

router.post('/', admissionsLimiter, submitApplication);
router.post('/:applicationRef/pay/initialize', paymentLimiter, initializeAdmissionPayment);
router.get('/verify/:reference', verifyAdmissionPayment);

// Not documented, not linked from any UI — gated by env flag + shared secret,
// see admissions.controller.ts::devBypassAdmission for the full guard.
router.post('/:applicationRef/dev-bypass', devBypassAdmission);

export default router;
