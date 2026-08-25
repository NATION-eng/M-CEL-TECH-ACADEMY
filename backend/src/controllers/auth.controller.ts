import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.model';
import Student from '../models/Student.model';
import Instructor from '../models/Instructor.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, wasRememberMeToken } from '../utils/jwt';
import { generateStudentId, generateInstructorId } from '../utils/generateId';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { sendEmail, emailTemplates } from '../utils/email';
import { AuthRequest } from '../types';
import { getPlatformSettings } from '../utils/platformSettings';
import { checkPasswordStrength } from '../utils/passwordStrength';
import { writeAuditLog } from '../utils/auditLog';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password, phone, role = 'student' } = req.body;

    if (['admin', 'super_admin'].includes(role)) {
      sendError(res, 'Cannot self-register as admin. Contact the academy.', 403);
      return;
    }
    if (!firstName || !lastName || !email || !password) {
      sendError(res, 'First name, last name, email, and password are required.', 400);
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      sendError(res, 'Password must be at least 8 characters.', 400);
      return;
    }
    const settings = await getPlatformSettings();
    const strengthError = checkPasswordStrength(password, settings.security.requireStrongPasswords);
    if (strengthError) {
      sendError(res, strengthError, 400);
      return;
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      sendError(res, 'An account with this email already exists.', 409);
      return;
    }

    const user = await User.create({ firstName, lastName, email, password, phone, role });

    if (role === 'student') {
      await Student.create({ user: user._id, studentId: generateStudentId() });
    } else if (role === 'instructor') {
      await Instructor.create({ user: user._id, instructorId: generateInstructorId() });
    }

    const accessToken = generateAccessToken(user._id, user.role, settings.security.sessionTimeout);
    const refreshToken = generateRefreshToken(user._id, user.role);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const tmpl = emailTemplates.welcomeStudent(firstName);
    sendEmail({ to: email, ...tmpl }).catch(() => {});

    sendSuccess(res, { user, accessToken, refreshToken }, 'Account created successfully.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Registration failed.', 500);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      sendError(res, 'Email and password are required.', 400);
      return;
    }

    const settings = await getPlatformSettings();
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +refreshToken +failedLoginAttempts +lockedUntil');

    if (!user) {
      // Still pay the bcrypt cost even though there's no real hash to check
      // against — without this, a nonexistent email returns near-instantly
      // while a real one takes ~100ms+ for the comparePassword call below,
      // letting an attacker enumerate valid accounts purely by timing.
      await bcrypt.compare(password, '$2a$12$CwTycUXWue0Thq9StjUM0uJ8vAB3JLsRi/1r/OiIEOFxvYmz3Zf7q');
      await writeAuditLog({
        action: 'LOGIN_FAILED',
        entity: 'User',
        ipAddress: req.ip || 'unknown',
        status: 'failure',
        details: `Failed login attempt for email: ${email}`,
      });
      sendError(res, 'Invalid email or password.', 401);
      return;
    }

    // Locked out from too many recent failed attempts — reject before even
    // checking the password, so a lockout can't be probed/bypassed by luck.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      sendError(res, `Too many failed login attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`, 429);
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const maxAttempts = settings.security.maxLoginAttempts || 5;

      if (attempts >= maxAttempts) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
        await user.save({ validateBeforeSave: false });
        await writeAuditLog({
          user: String(user._id),
          action: 'ACCOUNT_LOCKED',
          entity: 'User',
          ipAddress: req.ip || 'unknown',
          status: 'failure',
          details: `Locked after ${maxAttempts} failed login attempts`,
        });
        sendError(res, `Too many failed login attempts. Account locked for 15 minutes.`, 429);
        return;
      }

      user.failedLoginAttempts = attempts;
      await user.save({ validateBeforeSave: false });
      await writeAuditLog({
        user: String(user._id),
        action: 'LOGIN_FAILED',
        entity: 'User',
        ipAddress: req.ip || 'unknown',
        status: 'failure',
        details: 'Incorrect password',
      });
      sendError(res, 'Invalid email or password.', 401);
      return;
    }

    if (!user.isActive || user.isSuspended) {
      sendError(res, 'Your account is inactive or suspended. Contact support.', 403);
      return;
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    const accessToken = generateAccessToken(user._id, user.role, settings.security.sessionTimeout);
    const refreshToken = generateRefreshToken(user._id, user.role, !!rememberMe);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await writeAuditLog({
      user: user._id,
      action: 'LOGIN',
      entity: 'User',
      ipAddress: req.ip || 'unknown',
      status: 'success',
    });

    sendSuccess(res, { user, accessToken, refreshToken }, 'Login successful.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Login failed.', 500);
  }
};

/**
 * Google Sign In / Sign Up.
 * Frontend sends the ID token ("credential") produced by Google Identity Services.
 * We verify it server-side (never trust a client-asserted email/profile), then:
 *  - existing Google account            -> log in
 *  - existing local account, same email -> link the Google ID to it, then log in
 *  - no existing account                -> create one (role defaults to student;
 *    admins/super_admins are never created this way)
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;
    if (!credential) {
      sendError(res, 'Missing Google credential.', 400);
      return;
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      sendError(res, 'Google Sign-In is not configured on this server.', 500);
      return;
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      sendError(res, 'Invalid or expired Google credential.', 401);
      return;
    }

    if (!payload?.email) {
      sendError(res, 'Google account has no verified email.', 400);
      return;
    }
    if (!payload.email_verified) {
      sendError(res, 'Google email is not verified.', 403);
      return;
    }

    const { sub: googleId, email, given_name, family_name, picture } = payload;

    type UserDoc = InstanceType<typeof User>;
    let user = await User.findOne({ googleId }).select('+refreshToken') as UserDoc | null;
    let isNewUser = false;

    if (!user) {
      // No account tied to this Google ID yet — check for an existing local account
      // with the same email so we link instead of creating a duplicate.
      user = await User.findOne({ email: email.toLowerCase() }).select('+refreshToken') as UserDoc | null;

      if (user) {
        user.googleId = googleId;
        if (!user.profilePicture && picture) user.profilePicture = picture;
      } else {
        isNewUser = true;
        user = new User({
          firstName: given_name || 'Student',
          lastName: family_name || '',
          email,
          authProvider: 'google',
          googleId,
          profilePicture: picture,
          role: 'student',
        });
        await user.save({ validateBeforeSave: false });
        await Student.create({ user: user._id, studentId: generateStudentId() });
      }
    }

    if (!user.isActive || user.isSuspended) {
      sendError(res, 'Your account is inactive or suspended. Contact support.', 403);
      return;
    }

    const settings = await getPlatformSettings();
    const accessToken = generateAccessToken(user._id, user.role, settings.security.sessionTimeout);
    const refreshToken = generateRefreshToken(user._id, user.role);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await writeAuditLog({
      user: user._id,
      action: isNewUser ? 'GOOGLE_SIGNUP' : 'GOOGLE_LOGIN',
      entity: 'User',
      ipAddress: req.ip || 'unknown',
      status: 'success',
    });

    if (isNewUser) {
      const tmpl = emailTemplates.welcomeStudent(user.firstName);
      sendEmail({ to: user.email, ...tmpl }).catch(() => {});
    }

    sendSuccess(
      res,
      { user, accessToken, refreshToken },
      isNewUser ? 'Account created with Google.' : 'Signed in with Google.',
      isNewUser ? 201 : 200
    );
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Google authentication failed.', 500);
  }
};

export const refreshTokenHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      sendError(res, 'Refresh token is required.', 400);
      return;
    }

    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      sendError(res, 'Invalid refresh token.', 401);
      return;
    }

    const settings = await getPlatformSettings();
    const accessToken = generateAccessToken(user._id, user.role, settings.security.sessionTimeout);
    const newRefreshToken = generateRefreshToken(user._id, user.role, wasRememberMeToken(token));
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    sendSuccess(res, { accessToken, refreshToken: newRefreshToken }, 'Token refreshed.');
  } catch {
    sendError(res, 'Invalid or expired refresh token.', 401);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
      await writeAuditLog({
        user: req.user._id,
        action: 'LOGOUT',
        entity: 'User',
        ipAddress: req.ip || 'unknown',
        status: 'success',
      });
    }
    sendSuccess(res, null, 'Logged out successfully.');
  } catch {
    sendError(res, 'Logout failed.', 500);
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    let profile = null;
    if (user?.role === 'student') {
      profile = await Student.findOne({ user: user._id });
    } else if (user?.role === 'instructor') {
      profile = await Instructor.findOne({ user: user._id });
    }
    sendSuccess(res, { user, profile }, 'Profile fetched.');
  } catch {
    sendError(res, 'Could not fetch profile.', 500);
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      sendError(res, 'Current and new password are required.', 400);
      return;
    }
    if (newPassword.length < 8) {
      sendError(res, 'New password must be at least 8 characters.', 400);
      return;
    }
    const settings = await getPlatformSettings();
    const strengthError = checkPasswordStrength(newPassword, settings.security.requireStrongPasswords);
    if (strengthError) {
      sendError(res, strengthError, 400);
      return;
    }

    const user = await User.findById(req.user?._id).select('+password');
    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }
    if (!user.password) {
      sendError(res, 'This account signed up with Google and has no password to change. Use Google to sign in.', 400);
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      sendError(res, 'Current password is incorrect.', 400);
      return;
    }

    user.password = newPassword;
    // Invalidate the refresh token so other devices/sessions can't silently
    // keep going on the old password — matches resetPassword's posture.
    // The current request's access token is left alone (short-lived anyway,
    // and the user just re-proved identity via currentPassword above), so
    // this doesn't log the user out of the device they're using right now.
    user.refreshToken = undefined;
    await user.save();

    const tmpl = emailTemplates.passwordChanged(user.firstName);
    sendEmail({ to: user.email, ...tmpl }).catch(() => {});

    sendSuccess(res, null, 'Password changed successfully.');
  } catch {
    sendError(res, 'Could not change password.', 500);
  }
};

/**
 * Starts a password reset. Always returns a generic success message, even if
 * the email doesn't exist — this prevents account enumeration. The raw token
 * is only ever sent by email; only its SHA-256 hash is stored, so a database
 * leak alone can't be used to reset accounts.
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      sendError(res, 'Email is required.', 400);
      return;
    }

    const genericMessage = 'If an account with that email exists, a password reset link has been sent.';
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      sendSuccess(res, null, genericMessage);
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
    const tmpl = emailTemplates.passwordReset(user.firstName, resetUrl);
    sendEmail({ to: user.email, ...tmpl }).catch(() => {});

    await writeAuditLog({
      user: user._id,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'User',
      ipAddress: req.ip || 'unknown',
      status: 'success',
    });

    sendSuccess(res, null, genericMessage);
  } catch {
    sendError(res, 'Could not process password reset request.', 500);
  }
};

/** Completes a password reset given the raw token emailed to the user. */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      sendError(res, 'Token and new password are required.', 400);
      return;
    }
    if (newPassword.length < 8) {
      sendError(res, 'New password must be at least 8 characters.', 400);
      return;
    }
    const settings = await getPlatformSettings();
    const strengthError = checkPasswordStrength(newPassword, settings.security.requireStrongPasswords);
    if (strengthError) {
      sendError(res, strengthError, 400);
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      sendError(res, 'This reset link is invalid or has expired. Please request a new one.', 400);
      return;
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshToken = undefined; // force re-login everywhere, invalidating any stolen session
    await user.save();

    const tmpl = emailTemplates.passwordChanged(user.firstName);
    sendEmail({ to: user.email, ...tmpl }).catch(() => {});

    await writeAuditLog({
      user: user._id,
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'User',
      ipAddress: req.ip || 'unknown',
      status: 'success',
    });

    sendSuccess(res, null, 'Password reset successfully. You can now log in with your new password.');
  } catch {
    sendError(res, 'Could not reset password.', 500);
  }
};
