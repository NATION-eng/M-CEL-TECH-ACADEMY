import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmission extends Document {
  applicationRef: string;
  name: string;
  email: string;
  phone: string;
  program: string;
  mode: string;
  message?: string;
  depositAmount: number;
  totalAmount: number;
  status: 'pending_payment' | 'paid' | 'account_created' | 'expired';
  paymentRef?: string;
  createdUser?: mongoose.Types.ObjectId;
  paidVia?: 'paystack' | 'flutterwave' | 'dev_bypass';
  paidAt?: Date;
}

const AdmissionSchema = new Schema<IAdmission>(
  {
    applicationRef: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    program: { type: String, required: true },
    mode: { type: String, required: true },
    message: String,
    depositAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending_payment', 'paid', 'account_created', 'expired'], default: 'pending_payment' },
    paymentRef: String,
    createdUser: { type: Schema.Types.ObjectId, ref: 'User' },
    paidVia: { type: String, enum: ['paystack', 'flutterwave', 'dev_bypass'] },
    paidAt: Date,
  },
  { timestamps: true }
);

AdmissionSchema.index({ email: 1 });
AdmissionSchema.index({ status: 1 });

export default mongoose.model<IAdmission>('Admission', AdmissionSchema);
