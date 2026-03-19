import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createBooking,
  getBookingAvailability,
  getMyBookings,
  updateBookingStatus,
} from '../controllers/bookingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/bookings/me', authMiddleware, getMyBookings);
router.get('/bookings/availability/:listingId', authMiddleware, [param('listingId').isString().isLength({ min: 1 })], getBookingAvailability);

router.post(
  '/bookings',
  authMiddleware,
  [
    body('listingId').isString().isLength({ min: 1 }),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('quantity').optional().isFloat({ min: 0.01 }),
    body('notes').optional().isString().isLength({ max: 1000 }),
  ],
  createBooking
);

router.patch(
  '/bookings/:bookingId/status',
  authMiddleware,
  [
    param('bookingId').isString().isLength({ min: 1 }),
    body('status').isIn(['requested', 'accepted', 'rejected', 'active', 'completed', 'cancelled']),
    body('paymentStatus').optional().isIn(['pending', 'completed', 'failed']),
  ],
  updateBookingStatus
);

export default router;