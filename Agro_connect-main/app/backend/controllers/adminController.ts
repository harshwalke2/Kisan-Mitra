import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Booking from '../models/Booking';
import Listing from '../models/Listing';
import Review from '../models/Review';
import User from '../models/User';

const canViewInsights = (user: { role?: string; email?: string } | null): boolean => {
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(user.email && adminEmails.includes(user.email.toLowerCase()));
};

export const getAdminInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.userId || '').trim();
    const user = await User.findById(userId).select('role email').lean();

    if (!canViewInsights(user)) {
      res.status(403).json({ message: 'Only admin can access platform insights' });
      return;
    }

    const [
      totalUsers,
      verifiedUsers,
      totalListings,
      activeListings,
      totalBookings,
      completedBookings,
      totalReviews,
      topCrops,
      topLocations,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ verificationStatus: 'verified' }),
      Listing.countDocuments({}),
      Listing.countDocuments({ status: 'active' }),
      Booking.countDocuments({}),
      Booking.countDocuments({ status: 'completed' }),
      Review.countDocuments({}),
      Listing.aggregate([
        { $group: { _id: '$title', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Listing.aggregate([
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.status(200).json({
      insights: {
        totalUsers,
        verifiedUsers,
        totalListings,
        activeListings,
        totalBookings,
        completedBookings,
        totalReviews,
        verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
        bookingCompletionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
        topCrops: topCrops.map((item) => ({ name: item._id, count: item.count })),
        topLocations: topLocations.map((item) => ({ name: item._id, count: item.count })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin insights' });
  }
};
