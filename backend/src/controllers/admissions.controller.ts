import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import Admission from '../models/Admission.model';
import Course from '../models/Course.model';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { completeAdmission } from '../utils/admissionCompletion';
import { getPlatformSettings } from '../utils/platformSettings';

// Fallback pricing when the applicant's chosen program doesn't (yet) match a
// real Course document by title — keeps the apply flow working even for
// programs an admin hasn't finished setting up in the catalog yet.
const DEFAULT_TOTAL = 150_000;
const DEFAULT_DEPOSIT = 90_000;

const generateApplicationRef = () => `MV-APP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

/** Public — a prospective student submitting the application form. */
export const submitApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, program, mode, message } = req.body;
    if (!name || !email || !phone || !program || !mode) {
      sendError(res, 'Name, email, phone, program and mode are required.', 400);
      return;
    }

    const course = await Course.findOne({ title: new RegExp(`^${program}$`, 'i') });
    const totalAmount = course?.price ?? DEFAULT_TOTAL;
    const depositAmount = course?.depositAmount ?? DEFAULT_DEPOSIT;

    const admission = await Admission.create({
      applicationRef: generateApplicationRef(),
      name, email, phone, program, mode, message,
      totalAmount, depositAmount,
      status: 'pending_payment',
    });

    // No 48-hour manual review step — the applicant goes straight to payment;
    // the account is created automatically once the deposit is confirmed.
    sendSuccess(res, {
      applicationRef: admission.applicationRef,
      depositAmount,
      totalAmount,
    }, 'Application received. Please complete your deposit to secure your spot.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not submit application.', 500);
  }
};

/** Public — starts a Paystack checkout for the application deposit (no account/login exists yet). */
export const initializeAdmissionPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getPlatformSettings();
    if (!settings.payment.paystackEnabled) {
      sendError(res, 'Card payments are currently unavailable. Please contact us to arrange payment.', 403);
      return;
    }

    const { applicationRef } = req.params;
    const admission = await Admission.findOne({ applicationRef });
    if (!admission) {
      sendError(res, 'Application not found.', 404);
      return;
    }
    if (admission.status !== 'pending_payment') {
      sendError(res, 'This application has already been paid for.', 409);
      return;
    }

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: admission.email,
        amount: Math.round(admission.depositAmount * 100),
        callback_url: `${process.env.FRONTEND_URL}/admissions/verify`,
        metadata: { type: 'admission', admissionId: admission._id.toString() },
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    sendSuccess(res, { authorizationUrl: response.data.data.authorization_url }, 'Redirecting to payment...');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not start payment.', 500);
  }
};

/** Public — fast-path verification after the Paystack redirect (webhook is still the source of truth). */
export const verifyAdmissionPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference } = req.params;
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const data = response.data.data;
    if (data.status !== 'success' || data.metadata?.type !== 'admission') {
      sendError(res, 'Payment was not successful.', 400);
      return;
    }

    const admission = await Admission.findById(data.metadata.admissionId);
    if (!admission) {
      sendError(res, 'Application not found.', 404);
      return;
    }

    admission.paymentRef = reference;
    if (admission.status === 'pending_payment') admission.status = 'paid';
    await admission.save();
    await completeAdmission(admission, 'paystack');

    sendSuccess(res, { accountCreated: true, email: admission.email }, 'Payment confirmed! Check your email to set up your account.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Verification failed.', 500);
  }
};

/**
 * Developer-only bypass for testing the apply -> pay -> account flow without
 * a real payment. Deliberately NOT reachable through any UI: it only responds
 * when both an env flag and a shared secret header match, and refuses
 * outright in production regardless of the flag, so it can never be a live
 * backdoor even if the env var is left on by mistake.
 */
export const devBypassAdmission = async (req: Request, res: Response): Promise<void> => {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.ENABLE_DEV_PAYMENT_BYPASS !== 'true' ||
    !process.env.DEV_BYPASS_SECRET ||
    req.headers['x-dev-bypass-key'] !== process.env.DEV_BYPASS_SECRET
  ) {
    // Same 404 whether the feature is off or the key is wrong — doesn't leak
    // that this endpoint exists to anyone probing without the secret.
    sendError(res, 'Not found.', 404);
    return;
  }

  try {
    const { applicationRef } = req.params;
    const admission = await Admission.findOne({ applicationRef });
    if (!admission) {
      sendError(res, 'Application not found.', 404);
      return;
    }

    admission.paymentRef = `DEVBYPASS-${admission.applicationRef}`;
    if (admission.status === 'pending_payment') admission.status = 'paid';
    await admission.save();
    await completeAdmission(admission, 'dev_bypass');

    sendSuccess(res, { accountCreated: true, email: admission.email }, 'Dev bypass: application marked paid and account created.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Bypass failed.', 500);
  }
};
