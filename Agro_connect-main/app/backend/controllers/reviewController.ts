import { Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Booking from '../models/Booking';
import Review from '../models/Review';
import User from '../models/User';
import { createAndEmitNotification } from '../services/notificationService';

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return;
  }

  try {
    const reviewerId = req.userId as string;
    const { bookingId, revieweeId, rating, comment } = req.body as {
      bookingId: string;
      revieweeId: string;
      rating: number;
      comment?: string;
    };

    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    const isParticipant =
      booking.ownerId.toString() === reviewerId || booking.requesterId.toString() === reviewerId;
    const validReviewee =
      booking.ownerId.toString() === revieweeId || booking.requesterId.toString() === revieweeId;

    if (!isParticipant || !validReviewee || reviewerId === revieweeId) {
      res.status(403).json({ message: 'Not authorized to review this user for this booking' });
      return;
    }

    const review = await Review.findOneAndUpdate(
      {
        bookingId: new Types.ObjectId(bookingId),
        reviewerId: new Types.ObjectId(reviewerId),
      },
      {
        $set: {
          revieweeId: new Types.ObjectId(revieweeId),
          rating,
          comment: comment?.trim() || '',
        },
      },
      { upsert: true, new: true }
    );

    const reviewer = await User.findById(reviewerId).select('username').lean();
    void createAndEmitNotification({
      recipientId: revieweeId,
      title: 'New review received',
      message: `${reviewer?.username || 'A farmer'} rated you ${rating}/5.`,
      type: rating >= 4 ? 'success' : 'info',
      category: 'system',
      actionUrl: '/profile',
    }).catch(() => undefined);

    res.status(201).json({ message: 'Review saved', review });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save review' });
  }
};

export const getReviewsForUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    if (!Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: 'Invalid userId' });
      return;
    }

    const reviews = await Review.find({ revieweeId: new Types.ObjectId(userId) })
      .populate('reviewerId', '_id username email')
      .sort({ createdAt: -1 })
      .lean();

    const summary = await Review.aggregate([
      { $match: { revieweeId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$revieweeId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const avgRating = summary[0]?.averageRating || 0;
    const totalReviews = summary[0]?.totalReviews || 0;
    const trustScore = Math.round((avgRating / 5) * 100);

    res.status(200).json({
      reviews,
      summary: {
        averageRating: Number(avgRating.toFixed(2)),
        totalReviews,
        trustScore,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};