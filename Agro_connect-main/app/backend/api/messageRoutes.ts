import { Router } from 'express';
import { body, param } from 'express-validator';
import { getConversations, getMessagesBetweenUsers, sendMessage } from '../controllers/messageController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/conversations', authMiddleware, getConversations);

router.get('/messages/:userId', authMiddleware, [param('userId').isString().isLength({ min: 1 })], getMessagesBetweenUsers);

router.post(
  '/messages',
  authMiddleware,
  [
    body('receiverId').isString().isLength({ min: 1 }),
    body('message').isString().trim().isLength({ min: 1, max: 2000 }),
  ],
  sendMessage
);

export default router;
