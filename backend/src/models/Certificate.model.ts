import mongoose, { Schema } from 'mongoose';
import { ICertificate } from '../types';

const CertificateSchema = new Schema<ICertificate>({
  certificateNumber: { type: String, required: true, unique: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  badgeLevel: { type: Schema.Types.ObjectId, ref: 'BadgeLevel' },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: Date,
  pdfUrl: String,
  qrCode: { type: String, required: true },
  verificationUrl: { type: String, required: true },
  isRevoked: { type: Boolean, default: false },
  revokedAt: Date,
  revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  revokeReason: String,
  issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// issueCertificate checks for an existing cert on exactly this combination
// before every issuance; getMyCertificates filters by student alone.
CertificateSchema.index({ student: 1, course: 1 });

export default mongoose.model<ICertificate>('Certificate', CertificateSchema);
