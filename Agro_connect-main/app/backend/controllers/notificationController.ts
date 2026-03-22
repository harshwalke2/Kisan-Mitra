import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';
import { generateSmartNotificationsForUser } from '../services/smartNotificationService';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.userId || '').trim();
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const notifications = await Notification.find({ recipientId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.userId || '').trim();
    const notificationId = String(req.params.notificationId || '').trim();

    if (!Types.ObjectId.isValid(notificationId)) {
      res.status(400).json({ message: 'Invalid notification id' });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        recipientId: new Types.ObjectId(userId),
      },
      { $set: { isRead: true } },
      { new: true }
    ).lean();

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.status(200).json({ notification });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.userId || '').trim();
    await Notification.updateMany(
      { recipientId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.userId || '').trim();
    const notificationId = String(req.params.notificationId || '').trim();

    if (!Types.ObjectId.isValid(notificationId)) {
      res.status(400).json({ message: 'Invalid notification id' });
      return;
    }

    const result = await Notification.findOneAndDelete({
      _id: new Types.ObjectId(notificationId),
      recipientId: new Types.ObjectId(userId),
    });

    if (!result) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notification' });
  }
};

export const generateNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.userId || '').trim();
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const body = req.body as {
      location?: string;
      crop?: string;
      temperature?: number;
      humidity?: number;
      rainExpected?: boolean;
      marketChangePercent?: number;
      force?: boolean;
    };

    const result = await generateSmartNotificationsForUser(userId, {
      location: typeof body.location === 'string' ? body.location : undefined,
      crop: typeof body.crop === 'string' ? body.crop : undefined,
      temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
      humidity: typeof body.humidity === 'number' ? body.humidity : undefined,
      rainExpected: typeof body.rainExpected === 'boolean' ? body.rainExpected : undefined,
      marketChangePercent:
        typeof body.marketChangePercent === 'number' ? body.marketChangePercent : undefined,
      force: typeof body.force === 'boolean' ? body.force : false,
    });

    res.status(200).json({
      message: 'Notifications generated',
      created: result.created,
      skipped: result.skipped,
      notifications: result.notifications,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate notifications' });
  }
};
