import mongoose, { Schema } from 'mongoose';
import { IMessage } from '../types';

const MessageSchema = new Schema<IMessage>({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: { createdAt: true, updatedAt: false } });

// Thread view: fetch a conversation's messages in order.
MessageSchema.index({ conversation: 1, createdAt: 1 });

// Auto-expiry: MongoDB's TTL background task deletes a document once this
// many seconds have passed since `createdAt` — no manual cleanup cron job
// needed, and it can't drift out of sync the way an app-level job could.
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export default mongoose.model<IMessage>('Message', MessageSchema);
