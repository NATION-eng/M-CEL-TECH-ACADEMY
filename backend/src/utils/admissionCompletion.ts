import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/User.model';
import Student from '../models/Student.model';
import Enrollment from '../models/Enrollment.model';
import Payment from '../models/Payment.model';
import Course from '../models/Course.model';
import { IAdmission } from '../models/Admission.model';
import { generateStudentId, generatePaymentRef } from './generateId';
import { sendEmail, emailTemplates } from './email';

/**
 * Runs once an admission's deposit has been confirmed paid (by webhook or the
 * gated dev bypass — never by an unauthenticated client claim). Creates the
 * student's account, enrollment, and payment ledger, then emails them a
 * password-setup link instead of a plaintext password, so the temporary
 * random password used to satisfy the schema is never actually usable.
 *
 * Idempotent: if this admission already has a createdUser, does nothing —
 * matters because a webhook can legitimately fire more than once.
 */
export const completeAdmission = async (
  admission: mongoose.HydratedDocument<IAdmission>,
  paidVia: 'paystack' | 'flutterwave' | 'dev_bypass'
): Promise<void> => {
  if (admission.status === 'account_created' && admission.createdUser) return;

  let user = await User.findOne({ email: admission.email });
  const [firstName, ...rest] = admission.name.trim().split(' ');
  const lastName = rest.join(' ') || firstName;

  if (!user) {
    // Random, never-communicated password — the account is only ever usable
    // after the student sets their own via the emailed reset link below.
    const randomPassword = crypto.randomBytes(24).toString('hex');
    user = await User.create({
      email: admission.email,
      password: randomPassword,
      firstName,
      lastName,
      phone: admission.phone,
      role: 'student',
    });

    const studentId = generateStudentId();
    await Student.create({ user: user._id, studentId });
  }

  // Match the applied-for program to a real course if one exists by that
  // title; otherwise leave the enrollment program-less for admin follow-up
  // rather than guessing or blocking account creation entirely.
  const course = await Course.findOne({ title: new RegExp(`^${admission.program}$`, 'i') });

  let enrollment: mongoose.HydratedDocument<InstanceType<typeof Enrollment>> | null = null;
  if (course) {
    enrollment = await Enrollment.findOneAndUpdate(
      { student: user._id, course: course._id },
      {
        $setOnInsert: {
          student: user._id,
          course: course._id,
          status: 'active',
          deliveryMode: /online/i.test(admission.mode) ? 'online' : 'physical',
        },
      },
      { upsert: true, new: true }
    );
    if (!enrollment) {
      throw new Error(`Failed to create enrollment for admission ${admission.applicationRef}.`);
    }

    const existingPayment = await Payment.findOne({ enrollment: enrollment._id });
    if (!existingPayment) {
      await Payment.create({
        paymentRef: generatePaymentRef(),
        student: user._id,
        enrollment: enrollment._id,
        course: course._id,
        totalAmount: admission.totalAmount,
        depositAmount: admission.depositAmount,
        amountPaid: admission.depositAmount,
        balance: admission.totalAmount - admission.depositAmount,
        status: admission.totalAmount - admission.depositAmount <= 0 ? 'paid' : 'partial',
        transactions: [{
          amount: admission.depositAmount,
          gateway: paidVia === 'dev_bypass' ? 'paystack' : paidVia,
          gatewayRef: admission.paymentRef ?? `DEVBYPASS-${admission.applicationRef}`,
          status: 'success',
          paidAt: new Date(),
          ref: admission.paymentRef ?? `DEVBYPASS-${admission.applicationRef}`,
        }],
      });
    }
  }

  admission.status = 'account_created';
  admission.createdUser = user._id as any;
  admission.paidVia = paidVia;
  admission.paidAt = admission.paidAt ?? new Date();
  await admission.save();

  // Reuse the password-reset flow to get them into their new account securely.
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h to set it up
  await user.save({ validateBeforeSave: false });

  const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
  const tmpl = emailTemplates.admissionAccountReady
    ? emailTemplates.admissionAccountReady(firstName, setupUrl, course?.title ?? admission.program)
    : emailTemplates.passwordReset(firstName, setupUrl);
  sendEmail({ to: user.email, ...tmpl }).catch(() => {});
};
