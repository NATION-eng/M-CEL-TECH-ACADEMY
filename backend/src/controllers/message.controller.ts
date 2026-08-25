import { Response } from 'express';
import Conversation from '../models/Conversation.model';
import Message from '../models/Message.model';
import Notification from '../models/Notification.model';
import User from '../models/User.model';
import { AuthRequest, UserRole } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { canMessage, ALLOWED_PAIRS } from '../utils/messagingRules';

/** People the current user is allowed to start a conversation with. */
export const getContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    // Reuses the same source of truth sendMessage/startConversation enforce —
    // this used to be a separately hand-maintained copy of the same rules
    // that silently drifted out of sync when the rules changed elsewhere.
    const allowedRoles = ALLOWED_PAIRS[req.user!.role];

    const filter: Record<string, unknown> = { role: { $in: allowedRoles }, isActive: true, _id: { $ne: req.user!._id } };
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const contacts = await User.find(filter).select('firstName lastName email role profilePicture').limit(50);
    sendSuccess(res, contacts, 'Contacts fetched.');
  } catch {
    sendError(res, 'Could not fetch contacts.', 500);
  }
};

/** List the current user's conversations, most recently active first, with unread counts. */
export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    const conversations = await Conversation.find({
      participants: req.user!._id,
      hiddenFor: { $ne: req.user!._id },
    })
      .populate('participants', 'firstName lastName email role profilePicture')
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    const now = new Date();
    const withUnread = await Promise.all(
      conversations.map(async (c) => {
        const unreadCount = await Message.countDocuments({
          conversation: c._id,
          sender: { $ne: req.user!._id },
          readBy: { $ne: req.user!._id },
        });
        const other = (c.participants as any[]).find(p => String(p._id) !== String(req.user!._id));
        return {
          _id: c._id,
          otherParticipant: other,
          lastMessagePreview: c.lastMessagePreview,
          lastMessageAt: c.lastMessageAt,
          unreadCount,
          // The other participant is typing right now if they set typingUntil
          // within the last few seconds and it hasn't lapsed yet.
          otherIsTyping: !!(c.typingBy && String(c.typingBy) !== String(req.user!._id) && c.typingUntil && c.typingUntil > now),
        };
      })
    );

    // Search filters by the other participant's name — searching message
    // content isn't included since messages expire after 24h anyway.
    const filtered = search
      ? withUnread.filter((c) => `${c.otherParticipant?.firstName ?? ''} ${c.otherParticipant?.lastName ?? ''}`.toLowerCase().includes(search.toLowerCase()))
      : withUnread;

    sendSuccess(res, filtered, 'Conversations fetched.');
  } catch {
    sendError(res, 'Could not fetch conversations.', 500);
  }
};

/** Find an existing conversation with recipientId, or create one if the pairing is allowed. */
export const startConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { recipientId } = req.body;
    if (!recipientId) {
      sendError(res, 'recipientId is required.', 400);
      return;
    }
    if (recipientId === String(req.user!._id)) {
      sendError(res, 'You cannot message yourself.', 400);
      return;
    }

    const recipient = await User.findById(recipientId);
    if (!recipient || !recipient.isActive) {
      sendError(res, 'Recipient not found.', 404);
      return;
    }

    if (!canMessage(req.user!.role, recipient.role)) {
      sendError(res, `${req.user!.role.replace('_', ' ')} accounts cannot message ${recipient.role.replace('_', ' ')} accounts.`, 403);
      return;
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user!._id, recipientId], $size: 2 },
    }).populate('participants', 'firstName lastName email role profilePicture');

    if (!conversation) {
      conversation = await new Conversation({ participants: [req.user!._id, recipientId] }).save();
      await conversation.populate('participants', 'firstName lastName email role profilePicture');
    } else if (conversation.hiddenFor.some((id) => String(id) === String(req.user!._id))) {
      // They'd deleted this conversation for themselves before — messaging
      // this person again should bring it back into their list rather than
      // silently going nowhere (the other participant's copy was untouched).
      conversation.hiddenFor = conversation.hiddenFor.filter((id) => String(id) !== String(req.user!._id));
      await conversation.save();
    }

    sendSuccess(res, conversation, 'Conversation ready.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not start conversation.', 500);
  }
};

/** Messages in a conversation, oldest first. Also marks them read for the requester. */
export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.participants.some(p => String(p) === String(req.user!._id))) {
      sendError(res, 'Conversation not found.', 404);
      return;
    }

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .limit(200);

    await Message.updateMany(
      { conversation: conversation._id, sender: { $ne: req.user!._id }, readBy: { $ne: req.user!._id } },
      { $addToSet: { readBy: req.user!._id } }
    );

    sendSuccess(res, messages, 'Messages fetched.');
  } catch {
    sendError(res, 'Could not fetch messages.', 500);
  }
};

/** Send a message into an existing conversation. */
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      sendError(res, 'Message content is required.', 400);
      return;
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.participants.some(p => String(p) === String(req.user!._id))) {
      sendError(res, 'Conversation not found.', 404);
      return;
    }

    const message = await new Message({
      conversation: conversation._id,
      sender: req.user!._id,
      content: content.trim(),
      readBy: [req.user!._id],
    }).save();

    const preview = content.trim().length > 80 ? `${content.trim().slice(0, 80)}...` : content.trim();
    conversation.lastMessage = message._id as any;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessagePreview = preview;
    await conversation.save();

    const recipientId = conversation.participants.find(p => String(p) !== String(req.user!._id));
    if (recipientId) {
      await Notification.create({
        recipient: recipientId,
        type: 'system',
        title: `New message from ${req.user!.firstName}`,
        message: preview,
        link: `/messages/${conversation._id}`,
      });
    }

    sendSuccess(res, message, 'Message sent.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not send message.', 500);
  }
};

/**
 * Lightweight typing indicator without a websocket: the composing client
 * calls this (debounced, every couple seconds while actively typing) and it
 * sets a short-lived "typing until" timestamp the other participant's poll
 * picks up. No explicit "stop typing" call needed — it just lapses.
 */
export const setTyping = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.participants.some(p => String(p) === String(req.user!._id))) {
      sendError(res, 'Conversation not found.', 404);
      return;
    }
    conversation.typingBy = req.user!._id;
    conversation.typingUntil = new Date(Date.now() + 5000);
    await conversation.save();
    sendSuccess(res, null, 'ok');
  } catch {
    sendError(res, 'Could not update typing status.', 500);
  }
};

/** Deletes a single message — only the sender can delete their own message. */
export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      sendError(res, 'Message not found.', 404);
      return;
    }
    if (String(message.sender) !== String(req.user!._id)) {
      sendError(res, 'You can only delete your own messages.', 403);
      return;
    }
    await Message.findByIdAndDelete(req.params.messageId);

    // If that was the conversation's last message, recompute the preview so
    // the conversation list doesn't keep showing a deleted message's text.
    const conversation = await Conversation.findById(message.conversation);
    if (conversation && String(conversation.lastMessage) === String(message._id)) {
      const newLast = await Message.findOne({ conversation: conversation._id }).sort({ createdAt: -1 });
      conversation.lastMessage = newLast?._id as any;
      conversation.lastMessageAt = newLast?.createdAt;
      conversation.lastMessagePreview = newLast ? (newLast.content.length > 80 ? `${newLast.content.slice(0, 80)}...` : newLast.content) : undefined;
      await conversation.save();
    }

    sendSuccess(res, { conversationId: message.conversation }, 'Message deleted.');
  } catch {
    sendError(res, 'Could not delete message.', 500);
  }
};

/** "Delete conversation" hides it from this participant's list only — see hiddenFor on the model. */
export const deleteConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.participants.some(p => String(p) === String(req.user!._id))) {
      sendError(res, 'Conversation not found.', 404);
      return;
    }
    if (!conversation.hiddenFor.some((id) => String(id) === String(req.user!._id))) {
      conversation.hiddenFor.push(req.user!._id);
      await conversation.save();
    }
    sendSuccess(res, null, 'Conversation deleted.');
  } catch {
    sendError(res, 'Could not delete conversation.', 500);
  }
};

/**
 * Flags a conversation for admin attention — the real safety valve that
 * makes opening student-to-student messaging responsible rather than just
 * convenient. Notifies admins so an actual person follows up; this endpoint
 * doesn't take any moderation action itself.
 */
export const reportConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      sendError(res, 'Please describe why you are reporting this conversation.', 400);
      return;
    }
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !conversation.participants.some(p => String(p) === String(req.user!._id))) {
      sendError(res, 'Conversation not found.', 404);
      return;
    }
    conversation.isReported = true;
    conversation.reportedBy = req.user!._id;
    conversation.reportReason = reason.trim();
    conversation.reportedAt = new Date();
    await conversation.save();

    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } }).select('_id');
    await Notification.insertMany(admins.map((a) => ({
      recipient: a._id,
      type: 'system',
      title: 'Conversation reported',
      message: `${req.user!.firstName} ${req.user!.lastName} reported a conversation: "${reason.trim().slice(0, 100)}"`,
      link: '/admin/messages',
    })));

    sendSuccess(res, null, 'Thanks — an admin will review this conversation.');
  } catch {
    sendError(res, 'Could not report this conversation.', 500);
  }
};
