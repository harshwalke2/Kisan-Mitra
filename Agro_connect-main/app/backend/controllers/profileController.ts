import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import FollowRequest from '../models/FollowRequest';
import Listing from '../models/Listing';
import Review from '../models/Review';
import User from '../models/User';

export const getPublicProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    if (!Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: 'Invalid userId' });
      return;
    }

    const user = await User.findById(userId)
      .select('_id username email followers following createdAt')
      .lean();

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const [listingStats, reviewStats, reviews] = await Promise.all([
      Listing.aggregate([
        { $match: { ownerId: new Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$ownerId',
            totalListings: { $sum: 1 },
            activeListings: {
              $sum: {
                $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
              },
            },
          },
        },
      ]),
      Review.aggregate([
        { $match: { revieweeId: new Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$revieweeId',
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
      Review.find({ revieweeId: new Types.ObjectId(userId) })
        .populate('reviewerId', '_id username email')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const averageRating = reviewStats[0]?.averageRating || 0;
    const totalReviews = reviewStats[0]?.totalReviews || 0;
    const trustScore = Math.round((averageRating / 5) * 100);

    const currentUserId = String(req.userId || '').trim();
    let relationship = null;
    if (currentUserId && Types.ObjectId.isValid(currentUserId) && currentUserId !== userId) {
      const request = await FollowRequest.findOne({
        $or: [
          {
            senderId: new Types.ObjectId(currentUserId),
            receiverId: new Types.ObjectId(userId),
          },
          {
            senderId: new Types.ObjectId(userId),
            receiverId: new Types.ObjectId(currentUserId),
          },
        ],
      })
        .select('senderId receiverId status')
        .lean();

      relationship = {
        isFollowing: user.followers.some((id) => id.toString() === currentUserId),
        followsYou: user.following.some((id) => id.toString() === currentUserId),
        requestStatus: request?.status || null,
      };
    }

    res.status(200).json({
      profile: {
        _id: user._id,
        username: user.username,
        email: user.email,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        createdAt: user.createdAt,
        totalListings: listingStats[0]?.totalListings || 0,
        activeListings: listingStats[0]?.activeListings || 0,
        averageRating: Number(averageRating.toFixed(2)),
        totalReviews,
        trustScore,
      },
      reviews,
      relationship,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    req.params.userId = userId;
    await getPublicProfile(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch my profile' });
  }
};