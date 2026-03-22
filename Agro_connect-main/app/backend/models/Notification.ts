import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'alert';
export type NotificationCategory = 'farm' | 'market' | 'tools' | 'chat' | 'scheme' | 'system';
export type NotificationAlertType = 'weather' | 'pest' | 'market' | 'smart';

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  alertType?: NotificationAlertType;
  dedupeKey?: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'success', 'error', 'alert'],
      default: 'info',
    },
    category: {
      type: String,
      enum: ['farm', 'market', 'tools', 'chat', 'scheme', 'system'],
      default: 'system',
    },
    alertType: {
      type: String,
      enum: ['weather', 'pest', 'market', 'smart'],
      index: true,
    },
    dedupeKey: {
      type: String,
      trim: true,
      maxlength: 180,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    actionUrl: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, dedupeKey: 1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
