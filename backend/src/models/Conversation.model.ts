import mongoose, { Schema } from 'mongoose';
import { IConversation } from '../types';

const ConversationSchema = new Schema<IConversation>({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  lastMessageAt: Date,
  lastMessagePreview: String,
  hiddenFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  typingBy: { type: Schema.Types.ObjectId, ref: 'User' },
  typingUntil: Date,
  isReported: { type: Boolean, default: false },
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reportReason: String,
  reportedAt: Date,
}, { timestamps: true });

// "My conversations" listing, sorted by most recent activity.
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
