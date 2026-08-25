import { Response } from 'express';
import Notification from '../models/Notification.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const getMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ recipient: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ recipient: req.user!._id, isRead: false });
    sendSuccess(res, { notifications, unreadCount }, 'Notifications fetched.');
  } catch {
    sendError(res, 'Could not fetch notifications.', 500);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user!._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) {
      sendError(res, 'Notification not found.', 404);
      return;
    }
    sendSuccess(res, notification, 'Notification marked as read.');
  } catch {
    sendError(res, 'Could not update notification.', 500);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { recipient: req.user!._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    sendSuccess(res, null, 'All notifications marked as read.');
  } catch {
    sendError(res, 'Could not update notifications.', 500);
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user!._id });
    if (!notification) {
      sendError(res, 'Notification not found.', 404);
      return;
    }
    await Notification.findByIdAndDelete(req.params.id);
    sendSuccess(res, null, 'Notification deleted.');
  } catch {
    sendError(res, 'Could not delete notification.', 500);
  }
};
