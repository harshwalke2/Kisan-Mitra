import { Types } from 'mongoose';
import Notification, { NotificationCategory, NotificationType } from '../models/Notification';
import { emitNotificationToUser } from '../socket/chatSocket';

type CreateNotificationInput = {
  recipientId: string;
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  actionUrl?: string;
};

export const createAndEmitNotification = async ({
  recipientId,
  title,
  message,
  type = 'info',
  category = 'system',
  actionUrl,
}: CreateNotificationInput) => {
  if (!Types.ObjectId.isValid(recipientId)) {
    return null;
  }

  const notification = await Notification.create({
    recipientId: new Types.ObjectId(recipientId),
    title,
    message,
    type,
    category,
    actionUrl,
    isRead: false,
  });

  emitNotificationToUser(recipientId, {
    _id: notification._id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    category: notification.category,
    isRead: notification.isRead,
    actionUrl: notification.actionUrl,
    createdAt: notification.createdAt,
  });

  return notification;
};
