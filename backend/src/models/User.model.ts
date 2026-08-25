import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Not required at the schema level because Google-only accounts have no password.
    // Local (email/password) registration enforces this in the controller instead.
    password: { type: String, select: false, minlength: 8 },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, unique: true, sparse: true, select: false },
    role: { type: String, enum: ['student', 'instructor', 'admin', 'super_admin'], default: 'student' },
    phone: { type: String },
    profilePicture: { type: String },
    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },
    refreshToken: { type: String, select: false },
    lastLogin: { type: Date },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Frequently filtered by admins (user lists by role) and by RBAC checks.
UserSchema.index({ role: 1 });

UserSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  // Google-only accounts have no password hash — never let bcrypt.compare blow up on undefined.
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as { password?: string }).password;
    delete (ret as { refreshToken?: string }).refreshToken;
    return ret;
  },
});

export default mongoose.model<IUser>('User', UserSchema);
