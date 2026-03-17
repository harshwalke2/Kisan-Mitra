import { Router } from 'express';
import { body } from 'express-validator';
import {
  acceptFollowRequest,
  getPendingFollowRequests,
  rejectFollowRequest,
  sendFollowRequest,
} from '../controllers/followController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post(
  '/follow-request',
  authMiddleware,
  [body('receiverId').isString().isLength({ min: 1 })],
  sendFollowRequest
);

router.get('/follow-requests', authMiddleware, getPendingFollowRequests);

router.post(
  '/follow-request/accept',
  authMiddleware,
  [body('requestId').isString().isLength({ min: 1 })],
  acceptFollowRequest
);

router.post(
  '/follow-request/reject',
  authMiddleware,
  [body('requestId').isString().isLength({ min: 1 })],
  rejectFollowRequest
);

export default router;
