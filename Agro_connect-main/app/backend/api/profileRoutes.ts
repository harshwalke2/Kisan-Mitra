import { Router } from 'express';
import { param } from 'express-validator';
import { getMyProfile, getPublicProfile } from '../controllers/profileController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/profile/me', authMiddleware, getMyProfile);
router.get('/users/:userId/profile', authMiddleware, [param('userId').isString().isLength({ min: 1 })], getPublicProfile);

export default router;