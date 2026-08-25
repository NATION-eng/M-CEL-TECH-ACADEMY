import { Response } from 'express';
import QRCode from 'qrcode';
import Certificate from '../models/Certificate.model';
import Enrollment from '../models/Enrollment.model';
import Notification from '../models/Notification.model';
import User from '../models/User.model';
import Course from '../models/Course.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { generateCertificateNumber } from '../utils/generateId';
import { sendEmail, emailTemplates } from '../utils/email';
import { checkCertificateEligibility } from '../utils/certificateEligibility';
import { streamCertificatePdf } from '../utils/certificatePdf';
import { writeAuditLog } from '../utils/auditLog';

export const issueCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId, courseId, badgeLevelId, override, overrideReason } = req.body;
    if (!studentId || !courseId) {
      sendError(res, 'Student and course are required.', 400);
      return;
    }

    const [student, course] = await Promise.all([
      User.findById(studentId),
      Course.findById(courseId),
    ]);
    if (!student) {
      sendError(res, 'Student not found.', 404);
      return;
    }
    if (!course) {
      sendError(res, 'Course not found.', 404);
      return;
    }

    // Certificates are never available by default — this is the gate.
    // Only a super_admin can force-issue past it, and only with a reason,
    // which gets audit-logged so there's a record of who overrode what.
    const eligibility = await checkCertificateEligibility(studentId, courseId);
    if (!eligibility.eligible) {
      if (!(override && req.user!.role === 'super_admin')) {
        sendError(
          res,
          `Student is not yet eligible for this certificate: ${eligibility.reasons.join(' ')}`,
          403
        );
        return;
      }
      if (!overrideReason) {
        sendError(res, 'An override reason is required to force-issue an ineligible certificate.', 400);
        return;
      }
    }

    const existing = await Certificate.findOne({
      student: studentId,
      course: courseId,
      ...(badgeLevelId ? { badgeLevel: badgeLevelId } : {}),
      isRevoked: false,
    });
    if (existing) {
      sendError(res, 'A certificate has already been issued for this student/course/badge.', 409);
      return;
    }

    const certNumber = generateCertificateNumber();
    const verificationUrl = `${process.env.FRONTEND_URL}/verify/${certNumber}`;
    const qrCode = await QRCode.toDataURL(verificationUrl);

    const certificate = await Certificate.create({
      certificateNumber: certNumber,
      student: studentId,
      course: courseId,
      badgeLevel: badgeLevelId || undefined,
      qrCode,
      verificationUrl,
      issuedBy: req.user!._id,
    });

    if (!eligibility.eligible) {
      await writeAuditLog({
        user: req.user!._id,
        action: 'CERTIFICATE_FORCE_ISSUED',
        entity: 'Certificate',
        entityId: String(certificate._id),
        ipAddress: req.ip || 'unknown',
        status: 'success',
        details: `Force-issued despite unmet criteria: ${eligibility.reasons.join(' ')} Reason given: ${overrideReason}`,
      });
    }

    await Notification.create({
      recipient: studentId,
      type: 'certificate',
      title: '🏆 Certificate Issued!',
      message: `Congratulations! Your certificate for ${course.title} is ready to download.`,
      link: '/student/certificates',
    });

    const tmpl = emailTemplates.certificateIssued(student.firstName, course.title, verificationUrl);
    sendEmail({ to: student.email, ...tmpl }).catch(() => {});

    sendSuccess(res, certificate, 'Certificate issued successfully.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not issue certificate.', 500);
  }
};

/** Streams the certificate PDF. Students can only download their own; staff can download anyone's. */
export const downloadCertificatePdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('student', 'firstName lastName')
      .populate('course', 'title')
      .populate('badgeLevel', 'title');

    if (!certificate) {
      sendError(res, 'Certificate not found.', 404);
      return;
    }
    if (certificate.isRevoked) {
      sendError(res, 'This certificate has been revoked and cannot be downloaded.', 410);
      return;
    }
    const isOwner = String((certificate.student as any)._id ?? certificate.student) === String(req.user!._id);
    if (req.user!.role === 'student' && !isOwner) {
      sendError(res, 'You can only download your own certificates.', 403);
      return;
    }

    const student = certificate.student as any;
    const course = certificate.course as any;
    const badge = certificate.badgeLevel as any;

    streamCertificatePdf(res, {
      certificateNumber: certificate.certificateNumber,
      studentName: `${student.firstName} ${student.lastName}`,
      courseTitle: course?.title ?? 'Course',
      badgeLevelTitle: badge?.title,
      issuedAt: certificate.issuedAt,
      verificationUrl: certificate.verificationUrl,
      qrCodeDataUrl: certificate.qrCode,
    });
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not generate certificate PDF.', 500);
  }
};

/** Eligibility breakdown for a student/course pair — powers the "why can't I download my certificate yet" UI. */
export const getCertificateEligibility = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    // Students can only check their own eligibility; staff can check anyone's via ?studentId=.
    const studentId = req.user!.role === 'student' ? String(req.user!._id) : (req.query.studentId as string);
    if (!studentId) {
      sendError(res, 'studentId is required.', 400);
      return;
    }
    const result = await checkCertificateEligibility(studentId, courseId);
    sendSuccess(res, result, 'Eligibility calculated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not calculate eligibility.', 500);
  }
};

/** Public endpoint — no auth required, used by the /verify/:certNumber page. */
export const verifyCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { certNumber } = req.params;
    const certificate = await Certificate.findOne({ certificateNumber: certNumber })
      .populate('student', 'firstName lastName')
      .populate('course', 'title')
      .populate('badgeLevel', 'title level');

    if (!certificate) {
      sendError(res, 'No certificate found with this number.', 404);
      return;
    }

    sendSuccess(
      res,
      {
        valid: !certificate.isRevoked,
        certificate: certificate.isRevoked
          ? { isRevoked: true, revokedAt: certificate.revokedAt, certificateNumber: certificate.certificateNumber }
          : certificate,
      },
      certificate.isRevoked ? 'This certificate has been revoked.' : 'Certificate is valid.'
    );
  } catch {
    sendError(res, 'Verification failed.', 500);
  }
};

export const revokeCertificate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    const certificate = await Certificate.findByIdAndUpdate(
      req.params.id,
      { isRevoked: true, revokedAt: new Date(), revokedBy: req.user!._id, revokeReason: reason },
      { new: true }
    );
    if (!certificate) {
      sendError(res, 'Certificate not found.', 404);
      return;
    }
    sendSuccess(res, certificate, 'Certificate revoked.');
  } catch {
    sendError(res, 'Could not revoke certificate.', 500);
  }
};

export const getMyCertificates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const certs = await Certificate.find({ student: req.user!._id, isRevoked: false })
      .populate('course', 'title thumbnail')
      .populate('badgeLevel', 'title level')
      .sort({ issuedAt: -1 });
    sendSuccess(res, certs, 'Certificates fetched.');
  } catch {
    sendError(res, 'Could not fetch certificates.', 500);
  }
};

export const getAllCertificates = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const certs = await Certificate.find()
      .populate('student', 'firstName lastName email')
      .populate('course', 'title')
      .sort({ issuedAt: -1 });
    sendSuccess(res, certs, 'All certificates fetched.');
  } catch {
    sendError(res, 'Could not fetch certificates.', 500);
  }
};
