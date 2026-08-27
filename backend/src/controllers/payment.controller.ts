import { Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import Payment from '../models/Payment.model';
import Enrollment from '../models/Enrollment.model';
import Course from '../models/Course.model';
import Notification from '../models/Notification.model';
import User from '../models/User.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse';
import { generatePaymentRef } from '../utils/generateId';
import { sendEmail, emailTemplates } from '../utils/email';
import { streamReceiptPdf } from '../utils/receipt';
import { getPlatformSettings } from '../utils/platformSettings';
import { getMonthlyRevenue } from '../utils/monthlyRevenue';
import Admission from '../models/Admission.model';
import { completeAdmission } from '../utils/admissionCompletion';

/** Finds or creates the Payment record backing an enrollment, seeded from the course's pricing. */
const getOrCreatePayment = async (enrollmentId: string, studentId: string) => {
  let payment = await Payment.findOne({ enrollment: enrollmentId });
  if (payment) return payment;

  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) throw new Error('Enrollment not found.');
  const course = await Course.findById(enrollment.course);
  if (!course) throw new Error('Course not found.');

  payment = await Payment.create({
    paymentRef: generatePaymentRef(),
    student: studentId,
    enrollment: enrollmentId,
    course: course._id,
    totalAmount: course.price,
    depositAmount: course.depositAmount,
    amountPaid: 0,
    balance: course.price,
    status: 'pending',
  });
  return payment;
};

// ─── Paystack ───────────────────────────────────────────────────────────────
export const initializePaystack = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await getPlatformSettings();
    if (!settings.payment.paystackEnabled) {
      sendError(res, 'Paystack payments are currently disabled. Please use another payment method.', 403);
      return;
    }

    const { enrollmentId, amount } = req.body;
    if (!enrollmentId || !amount) {
      sendError(res, 'Enrollment and amount are required.', 400);
      return;
    }

    const payment = await getOrCreatePayment(enrollmentId, req.user!._id.toString());

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: req.user!.email,
        amount: Math.round(amount * 100), // kobo
        reference: `${payment.paymentRef}-${Date.now()}`,
        callback_url: `${process.env.FRONTEND_URL}/payment/verify`,
        metadata: { paymentId: payment._id.toString(), enrollmentId, studentId: req.user!._id.toString() },
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    sendSuccess(res, {
      authorizationUrl: response.data.data.authorization_url,
      reference: response.data.data.reference,
      paymentId: payment._id,
    }, 'Payment initialized.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Payment initialization failed.', 500);
  }
};

export const verifyPaystack = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reference } = req.params;
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const data = response.data.data;
    if (data.status !== 'success') {
      sendError(res, 'Payment was not successful.', 400);
      return;
    }

    const { paymentId, enrollmentId, studentId } = data.metadata;
    // Defense in depth: the transaction is genuinely successful per Paystack's
    // own server, but only the student who initiated it (or an admin) should
    // be able to trigger crediting it via this client-facing endpoint.
    if (studentId && studentId !== req.user!._id.toString() && !['admin', 'super_admin'].includes(req.user!.role)) {
      sendError(res, 'You do not have permission to verify this payment.', 403);
      return;
    }
    await applyPaymentToRecord(paymentId, enrollmentId, data.amount / 100, 'paystack', reference);

    sendSuccess(res, { verified: true, amountPaid: data.amount / 100 }, 'Payment verified successfully.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Verification failed.', 500);
  }
};

// ─── Flutterwave ────────────────────────────────────────────────────────────
export const initializeFlutterwave = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await getPlatformSettings();
    if (!settings.payment.flutterwaveEnabled) {
      sendError(res, 'Flutterwave payments are currently disabled. Please use another payment method.', 403);
      return;
    }

    const { enrollmentId, amount } = req.body;
    if (!enrollmentId || !amount) {
      sendError(res, 'Enrollment and amount are required.', 400);
      return;
    }

    const payment = await getOrCreatePayment(enrollmentId, req.user!._id.toString());
    const course = await Course.findById(payment.course);
    const txRef = `${payment.paymentRef}-FLW-${Date.now()}`;

    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref: txRef,
        amount,
        currency: 'NGN',
        redirect_url: `${process.env.FRONTEND_URL}/payment/flw-verify`,
        customer: { email: req.user!.email, name: req.user!.fullName },
        meta: { paymentId: payment._id.toString(), enrollmentId, studentId: req.user!._id.toString() },
        customizations: {
          title: 'M-CEL TECH ACADEMY',
          description: `Payment for ${course?.title ?? 'course'}`,
        },
      },
      { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` } }
    );

    sendSuccess(res, {
      paymentLink: response.data.data.link,
      txRef,
      paymentId: payment._id,
    }, 'Flutterwave payment initialized.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Flutterwave initialization failed.', 500);
  }
};

/**
 * Client-triggered verification, called from the redirect landing page right
 * after Flutterwave sends the user back. Fetches the transaction status from
 * Flutterwave's API directly (never trusts the redirect query params alone,
 * since those are client-controlled and easy to spoof) and applies it through
 * the same idempotent ledger path the webhook uses.
 */
export const verifyFlutterwave = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { transactionId } = req.params;
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` } }
    );

    const data = response.data.data;
    if (data.status !== 'successful') {
      sendError(res, 'Payment was not successful.', 400);
      return;
    }

    const { paymentId, enrollmentId, studentId } = data.meta;
    if (studentId && studentId !== req.user!._id.toString() && !['admin', 'super_admin'].includes(req.user!.role)) {
      sendError(res, 'You do not have permission to verify this payment.', 403);
      return;
    }
    await applyPaymentToRecord(paymentId, enrollmentId, data.amount, 'flutterwave', data.tx_ref);

    sendSuccess(res, { verified: true, amountPaid: data.amount }, 'Payment verified successfully.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Verification failed.', 500);
  }
};

// ─── Webhooks (public, signature-verified, no auth middleware) ────────────────
export const paystackWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET || '')
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      res.status(400).json({ message: 'Invalid signature.' });
      return;
    }

    const { event, data } = req.body;
    if (event === 'charge.success') {
      if (data.metadata?.type === 'admission') {
        const admission = await Admission.findById(data.metadata.admissionId);
        if (admission) {
          admission.paymentRef = data.reference;
          if (admission.status === 'pending_payment') admission.status = 'paid';
          await admission.save();
          await completeAdmission(admission, 'paystack');
        }
      } else {
        const { paymentId, enrollmentId } = data.metadata;
        await applyPaymentToRecord(paymentId, enrollmentId, data.amount / 100, 'paystack', data.reference);
      }
    }

    res.status(200).json({ received: true });
  } catch {
    res.status(500).json({ message: 'Webhook processing failed.' });
  }
};

export const flutterwaveWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const signature = req.headers['verif-hash'];
    const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    if (!signature || !secret) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }
    const sigBuf = Buffer.from(String(signature));
    const secretBuf = Buffer.from(secret);
    if (sigBuf.length !== secretBuf.length || !crypto.timingSafeEqual(sigBuf, secretBuf)) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { event, data } = req.body;
    if (event === 'charge.completed' && data.status === 'successful') {
      if (data.meta?.type === 'admission') {
        const admission = await Admission.findById(data.meta.admissionId);
        if (admission) {
          admission.paymentRef = data.tx_ref;
          if (admission.status === 'pending_payment') admission.status = 'paid';
          await admission.save();
          await completeAdmission(admission, 'flutterwave');
        }
      } else {
        const { paymentId, enrollmentId } = data.meta;
        await applyPaymentToRecord(paymentId, enrollmentId, data.amount, 'flutterwave', data.tx_ref);
      }
    }

    res.status(200).json({ received: true });
  } catch {
    res.status(500).json({ message: 'Webhook processing failed.' });
  }
};

/**
 * Core ledger update shared by both gateway verify endpoints and both webhooks.
 * Activates the enrollment once the cumulative payment crosses the course's
 * minimum-deposit threshold (the >50% policy from the PRD).
 */
const applyPaymentToRecord = async (
  paymentId: string,
  enrollmentId: string,
  amount: number,
  gateway: 'paystack' | 'flutterwave',
  gatewayRef: string
): Promise<void> => {
  const payment = await Payment.findById(paymentId);
  if (!payment) return;

  // Idempotency guard: both the client verify endpoint (after gateway redirect)
  // and the async webhook call this for the same transaction. Without this check
  // a successful payment gets credited twice — once per path. Same guard also
  // protects against a network retry or double-click resubmitting the same ref.
  const alreadyProcessed = payment.transactions.some(
    (t) => t.gatewayRef === gatewayRef && t.status === 'success'
  );
  if (alreadyProcessed) return;

  payment.amountPaid += amount;
  payment.balance = Math.max(0, payment.totalAmount - payment.amountPaid);
  payment.transactions.push({
    ref: generatePaymentRef(),
    amount,
    gateway,
    gatewayRef,
    status: 'success',
    paidAt: new Date(),
  });

  if (payment.amountPaid >= payment.totalAmount) {
    payment.status = 'paid';
  } else if (payment.amountPaid >= payment.depositAmount) {
    payment.status = 'partial';
    await Enrollment.findByIdAndUpdate(enrollmentId, { status: 'active', payment: payment._id });
  }

  await payment.save();

  const student = await User.findById(payment.student);
  if (student) {
    await Notification.create({
      recipient: payment.student,
      type: 'payment',
      title: 'Payment Received',
      message: `Payment of ₦${amount.toLocaleString()} received. Balance: ₦${payment.balance.toLocaleString()}.`,
      link: '/student/payments',
    });
    const tmpl = emailTemplates.paymentReceived(student.firstName, amount, payment.balance);
    sendEmail({ to: student.email, ...tmpl }).catch(() => {});
  }
};

// ─── Read endpoints ─────────────────────────────────────────────────────────
export const getMyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = await Payment.find({ student: req.user!._id })
      .populate('course', 'title thumbnail')
      .sort({ createdAt: -1 });
    sendSuccess(res, payments, 'Payments fetched.');
  } catch {
    sendError(res, 'Could not fetch payments.', 500);
  }
};

export const getAllPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (req.query.student) filter.student = req.query.student;

    // Payment itself only has paymentRef as a directly-searchable text field —
    // matching by student name/email or course title means finding those IDs
    // first, since Mongoose can't regex-match across a populated ref in one
    // query. This was previously accepted as a query param and silently
    // ignored entirely — the search box did nothing.
    const search = req.query.search as string | undefined;
    if (search) {
      const regex = new RegExp(search, 'i');
      const [matchingStudents, matchingCourses] = await Promise.all([
        User.find({ $or: [{ firstName: regex }, { lastName: regex }, { email: regex }] }).select('_id'),
        Course.find({ title: regex }).select('_id'),
      ]);
      filter.$or = [
        { paymentRef: regex },
        { student: { $in: matchingStudents.map((u) => u._id) } },
        { course: { $in: matchingCourses.map((c) => c._id) } },
      ];
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('student', 'firstName lastName email')
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);
    sendPaginated(res, payments, total, page, limit, 'Payments fetched.');
  } catch {
    sendError(res, 'Could not fetch payments.', 500);
  }
};

export const getFinancialSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalRevenue, outstanding, overdueCount, byStatus, monthlyRevenue] = await Promise.all([
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amountPaid' } } }]),
      Payment.aggregate([
        { $match: { status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$balance' } } },
      ]),
      Payment.countDocuments({ status: 'overdue' }),
      Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amountPaid' } } }]),
      getMonthlyRevenue(6),
    ]);

    sendSuccess(res, {
      totalRevenue: totalRevenue[0]?.total || 0,
      outstanding: outstanding[0]?.total || 0,
      overdueCount,
      byStatus,
      monthlyRevenue,
    }, 'Financial summary fetched.');
  } catch {
    sendError(res, 'Could not fetch financial summary.', 500);
  }
};

/**
 * Streams a downloadable PDF receipt for a single successful transaction within
 * a payment. Retrievable at any time by the paying student (billing history) or
 * by admin/super_admin — not just delivered once via email and forgotten.
 */
export const getReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentId, txRef } = req.params;
    const payment = await Payment.findById(paymentId)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title');
    if (!payment) {
      sendError(res, 'Payment not found.', 404);
      return;
    }

    const isOwner = payment.student._id.toString() === req.user!._id.toString();
    const isElevated = ['admin', 'super_admin'].includes(req.user!.role);
    if (!isOwner && !isElevated) {
      sendError(res, 'You do not have permission to access this receipt.', 403);
      return;
    }

    const txn = payment.transactions.find((t) => t.ref === txRef && t.status === 'success');
    if (!txn) {
      sendError(res, 'Receipt not found for this transaction.', 404);
      return;
    }

    const student = payment.student as unknown as { firstName: string; lastName: string; email: string };
    const course = payment.course as unknown as { title: string };

    streamReceiptPdf(res, {
      paymentRef: payment.paymentRef,
      transactionRef: txn.ref,
      studentName: `${student.firstName} ${student.lastName}`,
      studentEmail: student.email,
      courseTitle: course?.title ?? 'Course',
      amount: txn.amount,
      gateway: txn.gateway,
      gatewayRef: txn.gatewayRef,
      paidAt: txn.paidAt,
      totalAmount: payment.totalAmount,
      amountPaid: payment.amountPaid,
      balance: payment.balance,
      status: payment.status,
    });
  } catch {
    sendError(res, 'Could not generate receipt.', 500);
  }
};

export const exportPaymentsCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const search = req.query.search as string | undefined;
    if (search) {
      const regex = new RegExp(search, 'i');
      const [matchingStudents, matchingCourses] = await Promise.all([
        User.find({ $or: [{ firstName: regex }, { lastName: regex }, { email: regex }] }).select('_id'),
        Course.find({ title: regex }).select('_id'),
      ]);
      filter.$or = [
        { paymentRef: regex },
        { student: { $in: matchingStudents.map((u) => u._id) } },
        { course: { $in: matchingCourses.map((c) => c._id) } },
      ];
    }

    // Unlike the paginated list view, export always includes every matching
    // record — an admin exporting "overdue payments" needs the whole list,
    // not just whatever page happened to be open in the table.
    const payments = await Payment.find(filter)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    const escapeCsv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Payment Ref', 'Student', 'Email', 'Course', 'Total Amount', 'Amount Paid', 'Balance', 'Status', 'Created At'];
    const rows = payments.map((p) => {
      const student = p.student as unknown as { firstName: string; lastName: string; email: string };
      const course = p.course as unknown as { title: string };
      return [
        p.paymentRef,
        `${student?.firstName ?? ''} ${student?.lastName ?? ''}`.trim(),
        student?.email ?? '',
        course?.title ?? '',
        p.totalAmount,
        p.amountPaid,
        p.balance,
        p.status,
        (p as unknown as { createdAt: Date }).createdAt?.toISOString() ?? '',
      ].map(escapeCsv).join(',');
    });

    const csv = [header.map(escapeCsv).join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payments-export-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not export payments.', 500);
  }
};
