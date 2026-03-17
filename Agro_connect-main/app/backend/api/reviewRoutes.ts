import { Router } from 'express';
import { body, param } from 'express-validator';
import { createReview, getReviewsForUser } from '../controllers/reviewController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/reviews/:userId', [param('userId').isString().isLength({ min: 1 })], getReviewsForUser);

router.post(
  '/reviews',
  authMiddleware,
  [
    body('bookingId').isString().isLength({ min: 1 }),
    body('revieweeId').isString().isLength({ min: 1 }),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isString().isLength({ max: 1200 }),
  ],
  createReview
);

export default router;