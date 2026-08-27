import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
};

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email via SMTP. Failures are logged but never thrown — email delivery
 * issues should not break the underlying action (e.g. a payment succeeding even
 * if the receipt email fails to send).
 *
 * Without real EMAIL_USER/EMAIL_PASS configured (the common case for local
 * dev), this used to just silently skip sending — meaning an admin-created
 * account's invite link, or a password reset link, would go nowhere with no
 * way to actually retrieve it. In non-production environments, we now print
 * the email's first link straight to the server console instead, so local
 * testing doesn't require setting up a real SMTP provider.
 */
export const sendEmail = async ({ to, subject, html }: SendEmailOptions): Promise<void> => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    if (process.env.NODE_ENV !== 'production') {
      const linkMatch = html.match(/href="([^"]+)"/);
      console.warn(
        `\n📧  [DEV] Email not configured — "${subject}" to ${to} was not sent.` +
        (linkMatch ? `\n    Link: ${linkMatch[1]}\n` : '\n    (No link found in this email.)\n')
      );
    } else {
      console.warn(`⚠️  Email not configured — skipped sending "${subject}" to ${to}`);
    }
    return;
  }
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || 'M-CEL TECH ACADEMY <noreply@mceltechacademy.com>',
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(`Email send failed (${subject} → ${to}):`, err);
  }
};

export const emailTemplates = {
  welcomeStudent: (firstName: string) => ({
    subject: 'Welcome to M-CEL TECH ACADEMY!',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#4F46E5">Welcome, ${firstName}! 🎉</h2>
      <p>Your account has been created successfully. You're one step closer to becoming a job-ready digital professional.</p>
      <p>Log in to your student portal to explore your courses and get started.</p>
    </div>`,
  }),
  paymentReceived: (firstName: string, amount: number, balance: number) => ({
    subject: 'Payment Received — M-CEL TECH ACADEMY',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#10B981">Payment Confirmed</h2>
      <p>Hi ${firstName}, we've received your payment of <strong>₦${amount.toLocaleString()}</strong>.</p>
      ${balance > 0
        ? `<p>Outstanding balance: <strong>₦${balance.toLocaleString()}</strong></p>`
        : `<p>Your course is now fully paid. 🎉</p>`}
    </div>`,
  }),
  certificateIssued: (firstName: string, courseTitle: string, verifyUrl: string) => ({
    subject: 'Your Certificate is Ready! 🏆',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#F59E0B">Congratulations, ${firstName}!</h2>
      <p>Your certificate for <strong>${courseTitle}</strong> has been issued.</p>
      <p><a href="${verifyUrl}" style="color:#4F46E5">View and verify your certificate</a></p>
    </div>`,
  }),
  accountInvitation: (firstName: string, role: string, setPasswordUrl: string) => ({
    subject: `Your ${role === 'instructor' ? 'Instructor' : 'Student'} Account is Ready — M-CEL TECH ACADEMY`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#4F46E5">Welcome to M-CEL TECH ACADEMY, ${firstName}!</h2>
      <p>An administrator has created a ${role} account for you at M-CEL TECH ACADEMY.</p>
      <p>To activate your account, set your password using the secure link below (valid for 7 days):</p>
      <p><a href="${setPasswordUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;margin:8px 0">Set Your Password</a></p>
      <p style="color:#64748B;font-size:13px">If you didn't expect this email, you can safely ignore it.</p>
    </div>`,
  }),
  passwordReset: (firstName: string, resetUrl: string) => ({
    subject: 'Reset Your Password — M-CEL TECH ACADEMY',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#4F46E5">Password Reset Request</h2>
      <p>Hi ${firstName}, we received a request to reset your password.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Reset Password</a></p>
      <p style="color:#64748B;font-size:13px">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
    </div>`,
  }),
  passwordChanged: (firstName: string) => ({
    subject: 'Your Password Was Changed — M-CEL TECH ACADEMY',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#4F46E5">Password Changed</h2>
      <p>Hi ${firstName}, your account password was just changed. If this wasn't you, contact support immediately.</p>
    </div>`,
  }),
  admissionAccountReady: (firstName: string, setupUrl: string, program: string) => ({
    subject: 'Payment Confirmed — Set Up Your M-CEL TECH ACADEMY Account',
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#10B981">Payment Confirmed!</h2>
      <p>Hi ${firstName}, we've received your deposit for <strong>${program}</strong> and your account has been created.</p>
      <p><a href="${setupUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Set Your Password &amp; Log In</a></p>
      <p style="color:#64748B;font-size:13px">This link expires in 48 hours. Once you've set your password, log in with this email address to reach your student dashboard.</p>
    </div>`,
  }),
};
