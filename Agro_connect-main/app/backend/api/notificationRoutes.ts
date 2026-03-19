import { Router } from 'express';
import { param } from 'express-validator';
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/notifications', authMiddleware, getNotifications);

router.patch(
  '/notifications/:notificationId/read',
  authMiddleware,
  [param('notificationId').isString().isLength({ min: 1 })],
  markNotificationAsRead
);

router.patch('/notifications/read-all', authMiddleware, markAllNotificationsAsRead);

router.delete(
  '/notifications/:notificationId',
  authMiddleware,
  [param('notificationId').isString().isLength({ min: 1 })],
  deleteNotification
);

export default router;
