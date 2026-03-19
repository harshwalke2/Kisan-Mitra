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
    body('phone').optional().isString().trim().isLength({ min: 7, max: 30 }),
    body('location').optional().isString().trim().isLength({ min: 2, max: 200 }),
    body('farmName').optional().isString().trim().isLength({ min: 2, max: 120 }),
    body('farmSize').optional().isFloat({ min: 0, max: 1000000 }),
    body('preferredLanguage').optional().isString().trim().isLength({ min: 2, max: 20 }),
    body('role').optional().isIn(['farmer', 'admin']),
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
