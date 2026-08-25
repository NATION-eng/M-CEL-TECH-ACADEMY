import { Response } from 'express';
import crypto from 'crypto';
import User from '../models/User.model';
import Student from '../models/Student.model';
import Instructor from '../models/Instructor.model';
import Enrollment from '../models/Enrollment.model';
import Payment from '../models/Payment.model';
import Notification from '../models/Notification.model';
import QuizAttempt from '../models/QuizAttempt.model';
import Submission from '../models/Submission.model';
import { writeAuditLog } from '../utils/auditLog';
import { AuthRequest, UserRole } from '../types';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse';
import { generateStudentId, generateInstructorId } from '../utils/generateId';
import { sendEmail, emailTemplates } from '../utils/email';

/**
 * Admin/super_admin creates a student or instructor (or, for super_admin,
 * an admin) account directly. Unlike public self-registration, there's no
 * password from the user yet — we generate an unguessable random one the
 * account owner will never actually use, and immediately issue a 7-day
 * password-reset token so the invite email's "Set Your Password" link logs
 * them straight into the existing reset-password flow. This avoids ever
 * emailing a plaintext password, and avoids a second parallel account-setup
 * code path — it's the same mechanism as "forgot password", just triggered
 * at creation time instead of by the user.
 */
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, phone, role, specializations, bio } = req.body;
    if (!firstName || !lastName || !email || !role) {
      sendError(res, 'First name, last name, email, and role are required.', 400);
      return;
    }
    if (!['student', 'instructor', 'admin'].includes(role)) {
      sendError(res, 'Role must be student, instructor, or admin.', 400);
      return;
    }
    if (role === 'admin' && req.user!.role !== 'super_admin') {
      sendError(res, 'Only a super admin can create admin accounts.', 403);
      return;
    }

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) {
      sendError(res, 'An account with this email already exists.', 409);
      return;
    }

    // Unused, unguessable — the account owner sets their real password via the invite link.
    const placeholderPassword = crypto.randomBytes(24).toString('hex');
    const user = await User.create({ firstName, lastName, email, phone, role, password: placeholderPassword });

    if (role === 'student') {
      await Student.create({ user: user._id, studentId: generateStudentId() });
    } else if (role === 'instructor') {
      await Instructor.create({
        user: user._id,
        instructorId: generateInstructorId(),
        specializations: typeof specializations === 'string'
          ? specializations.split(',').map((s: string) => s.trim()).filter(Boolean)
          : (Array.isArray(specializations) ? specializations : []),
        bio,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days — an invite link should outlive a single workday
    await user.save({ validateBeforeSave: false });

    const setPasswordUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
    const tmpl = emailTemplates.accountInvitation(firstName, role, setPasswordUrl);
    sendEmail({ to: user.email, ...tmpl }).catch(() => {});

    await writeAuditLog({
      user: req.user!._id,
      action: 'USER_CREATED_BY_ADMIN',
      entity: 'User',
      entityId: String(user._id),
      ipAddress: req.ip || 'unknown',
      status: 'success',
      details: `Created ${role} account for ${email}`,
    });

    sendSuccess(res, user, `${role[0].toUpperCase()}${role.slice(1)} account created — invitation email sent.`, 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create account.', 500);
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as UserRole | undefined;
    const search = req.query.search as string | undefined;

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);

    sendPaginated(res, users, total, page, limit, 'Users fetched.');
  } catch {
    sendError(res, 'Could not fetch users.', 500);
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }

    let profile = null;
    if (user.role === 'student') profile = await Student.findOne({ user: user._id });
    if (user.role === 'instructor') profile = await Instructor.findOne({ user: user._id });

    sendSuccess(res, { user, profile }, 'User fetched.');
  } catch {
    sendError(res, 'Could not fetch user.', 500);
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, phone, profilePicture, bio, skills, githubUrl, linkedinUrl, portfolioUrl, specializations } = req.body;

    // Students and instructors editing their own profile can't change their
    // legal name — it's tied to certificates, official records, and account
    // identity. Only an admin/super_admin acting on the account can change it.
    const isSelfEdit = String(req.params.id) === String(req.user!._id);
    const nameIsLocked = isSelfEdit && ['student', 'instructor'].includes(req.user!.role);

    const nameUpdate = nameIsLocked ? {} : { firstName, lastName };

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...nameUpdate, phone, profilePicture },
      { new: true, runValidators: true }
    );
    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }

    if (user.role === 'student') {
      await Student.findOneAndUpdate(
        { user: user._id },
        { bio, skills, githubUrl, linkedinUrl, portfolioUrl },
        { new: true }
      );
    } else if (user.role === 'instructor') {
      await Instructor.findOneAndUpdate(
        { user: user._id },
        { bio, specializations, linkedinUrl },
        { new: true }
      );
    }

    sendSuccess(res, user, 'User updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update user.', 500);
  }
};

export const suspendUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (String(req.params.id) === String(req.user!._id)) {
      sendError(res, 'You cannot suspend your own account.', 400);
      return;
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      sendError(res, 'User not found.', 404);
      return;
    }

    if (target.role === 'super_admin') {
      const activeSuperAdmins = await User.countDocuments({ role: 'super_admin', isSuspended: { $ne: true } });
      if (activeSuperAdmins <= 1) {
        sendError(res, 'Cannot suspend the last active super admin — the platform would have no one left to manage it.', 403);
        return;
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: true }, { new: true });
    sendSuccess(res, user, 'User suspended.');
  } catch {
    sendError(res, 'Could not suspend user.', 500);
  }
};

export const activateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: false, isActive: true }, { new: true });
    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }
    sendSuccess(res, user, 'User activated.');
  } catch {
    sendError(res, 'Could not activate user.', 500);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }
    if (user.role === 'super_admin') {
      sendError(res, 'Cannot delete a super admin account.', 403);
      return;
    }

    await User.findByIdAndDelete(req.params.id);
    if (user.role === 'student') {
      await Student.findOneAndDelete({ user: user._id });
      await Promise.all([
        Enrollment.deleteMany({ student: user._id }),
        Payment.deleteMany({ student: user._id }),
        QuizAttempt.deleteMany({ student: user._id }),
        Submission.deleteMany({ student: user._id }),
      ]);
    }
    if (user.role === 'instructor') {
      await Instructor.findOneAndDelete({ user: user._id });
    }
    await Notification.deleteMany({ recipient: user._id });

    sendSuccess(res, null, 'User deleted.');
  } catch {
    sendError(res, 'Could not delete user.', 500);
  }
};
