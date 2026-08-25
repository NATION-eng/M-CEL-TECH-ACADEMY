import { Router } from 'express';
import {
  issueCertificate, verifyCertificate, revokeCertificate, getMyCertificates, getAllCertificates,
  getCertificateEligibility, downloadCertificatePdf,
} from '../controllers/certificate.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

// Public — certificate verification must work without login
router.get('/verify/:certNumber', verifyCertificate);

router.use(authenticate);
router.get('/eligibility/:courseId', authorize('student', 'admin', 'super_admin', 'instructor'), getCertificateEligibility);
router.get('/my-certificates', authorize('student'), getMyCertificates);
router.get('/:id/download', downloadCertificatePdf);
router.post('/', authorize('admin', 'super_admin'), issueCertificate);
router.get('/', authorize('admin', 'super_admin', 'instructor'), getAllCertificates);
router.patch('/:id/revoke', authorize('admin', 'super_admin'), revokeCertificate);

export default router;
