import { Router } from 'express';
import { body, query } from 'express-validator';
import { forgotPassword, getCurrentUser, login, register, resetPassword, searchUsers } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post(
  '/auth/register',
  [
    body('username').trim().isLength({ min: 3, max: 50 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6, max: 128 }),
  ],
  register
);

router.post(
  '/auth/login',
  [body('email').isEmail(), body('password').isLength({ min: 6, max: 128 })],
  login
);

router.post('/auth/forgot-password', [body('email').isEmail()], forgotPassword);
router.post('/auth/reset-password', [body('token').isString(), body('newPassword').isLength({ min: 6, max: 128 })], resetPassword);

router.get('/auth/me', authMiddleware, getCurrentUser);

router.get('/users/search', authMiddleware, [query('q').optional().isString()], searchUsers);

export default router;
