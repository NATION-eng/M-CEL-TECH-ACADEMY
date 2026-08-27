import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  general: {
    academyName: string;
    tagline: string;
    address: string;
    email: string;
    phone: string;
  };
  payment: {
    defaultDepositPercent: number;
    paystackEnabled: boolean;
    flutterwaveEnabled: boolean;
    allowInstallments: boolean;
  };
  notifications: {
    assignmentReminders: boolean;
    paymentReminders: boolean;
    certificateNotifs: boolean;
    emailNotifications: boolean;
  };
  security: {
    requireStrongPasswords: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    enableAuditLogs: boolean;
  };
  updatedBy?: mongoose.Types.ObjectId;
}

// Platform settings are a singleton — there is always exactly one document,
// found/created via SINGLETON_ID below rather than a per-request query filter.
const SettingsSchema = new Schema<ISettings>(
  {
    general: {
      academyName: { type: String, default: 'M-CEL TECH ACADEMY' },
      tagline: { type: String, default: 'Become a Job-Ready Digital Professional' },
      address: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    payment: {
      defaultDepositPercent: { type: Number, default: 60, min: 50, max: 100 },
      paystackEnabled: { type: Boolean, default: true },
      flutterwaveEnabled: { type: Boolean, default: true },
      allowInstallments: { type: Boolean, default: true },
    },
    notifications: {
      assignmentReminders: { type: Boolean, default: true },
      paymentReminders: { type: Boolean, default: true },
      certificateNotifs: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
    },
    security: {
      requireStrongPasswords: { type: Boolean, default: true },
      sessionTimeout: { type: Number, default: 60 },
      maxLoginAttempts: { type: Number, default: 5 },
      enableAuditLogs: { type: Boolean, default: true },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const SETTINGS_SINGLETON_ID = '000000000000000000000001';

export default mongoose.model<ISettings>('Settings', SettingsSchema);
