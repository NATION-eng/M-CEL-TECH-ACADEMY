import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  initializePaystack, verifyPaystack, initializeFlutterwave, verifyFlutterwave,
  paystackWebhook, flutterwaveWebhook,
  getMyPayments, getAllPayments, getFinancialSummary, getReceipt, exportPaymentsCsv,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

// Payment initialization is expensive (hits an external gateway) and a prime
// target for abuse — cap it separately from the general API rate limit.
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'Too many payment attempts. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public webhooks — verified via gateway signature inside the controller, not JWT
router.post('/webhooks/paystack', paystackWebhook);
router.post('/webhooks/flutterwave', flutterwaveWebhook);

router.use(authenticate);
router.post('/paystack/initialize', paymentLimiter, initializePaystack);
router.get('/paystack/verify/:reference', verifyPaystack);
router.post('/flutterwave/initialize', paymentLimiter, initializeFlutterwave);
router.get('/flutterwave/verify/:transactionId', verifyFlutterwave);
router.get('/my-payments', getMyPayments);
router.get('/:paymentId/receipt/:txRef', getReceipt);

router.get('/financial-summary', authorize('admin', 'super_admin'), getFinancialSummary);
router.get('/export', authorize('admin', 'super_admin'), exportPaymentsCsv);
router.get('/', authorize('admin', 'super_admin'), getAllPayments);

export default router;
