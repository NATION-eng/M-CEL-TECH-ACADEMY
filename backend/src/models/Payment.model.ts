import mongoose, { Schema } from 'mongoose';
import { IPayment } from '../types';

const PaymentSchema = new Schema<IPayment>({
  paymentRef: { type: String, required: true, unique: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  enrollment: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  totalAmount: { type: Number, required: true },
  depositAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  balance: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'partial', 'paid', 'overdue', 'failed', 'refunded'], default: 'pending' },
  transactions: [{
    ref: String,
    amount: Number,
    gateway: { type: String, enum: ['paystack', 'flutterwave', 'manual'] },
    gatewayRef: String,
    status: { type: String, enum: ['success', 'failed', 'pending'] },
    paidAt: Date,
    receiptUrl: String,
    metadata: Schema.Types.Mixed,
  }],
  dueDate: Date,
  installmentDeadline: Date,
  notes: String,
}, { timestamps: true });

// student: "my payments" lookups. status: admin filtering + financial summary aggregations.
// transactions.gatewayRef: idempotency lookups when applying a webhook/verify result.
PaymentSchema.index({ student: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ 'transactions.gatewayRef': 1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
