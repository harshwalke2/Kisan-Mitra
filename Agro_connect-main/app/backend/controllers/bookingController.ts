import { Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Booking, { BookingStatus } from '../models/Booking';
import Listing from '../models/Listing';
import User from '../models/User';
import { createAndEmitNotification } from '../services/notificationService';

export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return;
  }

  try {
    const requesterId = req.userId as string;
    const { listingId, startDate, endDate, quantity, notes } = req.body as {
      listingId: string;
      startDate: string;
      endDate: string;
      quantity?: number;
      notes?: string;
    };

    const listing = await Listing.findById(listingId).lean();
    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    const ownerId = listing.ownerId.toString();
    if (ownerId === requesterId) {
      res.status(400).json({ message: 'Cannot book your own listing' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      res.status(400).json({ message: 'Invalid booking date range' });
      return;
    }

    const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const qty = quantity && quantity > 0 ? quantity : 1;
    const totalAmount = listing.pricePerUnit * qty * dayCount;

    const overlapping = await Booking.findOne({
      listingId: new Types.ObjectId(listingId),
      status: { $in: ['requested', 'accepted', 'active'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    })
      .select('_id')
      .lean();

    if (overlapping) {
      res.status(409).json({ message: 'Selected dates are not available for this listing' });
      return;
    }

    const booking = await Booking.create({
      listingId: new Types.ObjectId(listingId),
      ownerId: new Types.ObjectId(ownerId),
      requesterId: new Types.ObjectId(requesterId),
      startDate: start,
      endDate: end,
      quantity: qty,
      totalAmount,
      notes: notes?.trim(),
    });

    const requester = await User.findById(requesterId).select('username').lean();
    void createAndEmitNotification({
      recipientId: ownerId,
      title: 'New booking request',
      message: `${requester?.username || 'A farmer'} requested your listing \"${listing.title}\".`,
      type: 'info',
      category: 'tools',
      actionUrl: '/dashboard',
    }).catch(() => undefined);

    res.status(201).json({ message: 'Booking request created', booking });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create booking request' });
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;

    const outgoing = await Booking.find({ requesterId: new Types.ObjectId(userId) })
      .populate('listingId', 'title category location pricePerUnit unit media')
      .populate('ownerId', '_id username email')
      .sort({ createdAt: -1 })
      .lean();

    const incoming = await Booking.find({ ownerId: new Types.ObjectId(userId) })
      .populate('listingId', 'title category location pricePerUnit unit media')
      .populate('requesterId', '_id username email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ outgoing, incoming });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return;
  }

  try {
    const userId = req.userId as string;
    const bookingId = req.params.bookingId;
    const { status, paymentStatus } = req.body as {
      status: BookingStatus;
      paymentStatus?: 'pending' | 'completed' | 'failed';
    };

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    const isOwner = booking.ownerId.toString() === userId;
    const isRequester = booking.requesterId.toString() === userId;

    if (!isOwner && !isRequester) {
      res.status(403).json({ message: 'Not authorized to update this booking' });
      return;
    }

    if (isRequester && ['accepted', 'rejected'].includes(status)) {
      res.status(403).json({ message: 'Only listing owner can accept or reject booking requests' });
      return;
    }

    booking.status = status;
    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
    }

    await booking.save();

    const recipientId = isOwner ? booking.requesterId.toString() : booking.ownerId.toString();
    const sender = await User.findById(userId).select('username').lean();
    const listing = await Listing.findById(booking.listingId).select('title').lean();

    void createAndEmitNotification({
      recipientId,
      title: 'Booking updated',
      message: `${sender?.username || 'A farmer'} changed booking \"${listing?.title || 'listing'}\" to ${status}.`,
      type: status === 'rejected' || status === 'cancelled' ? 'warning' : 'success',
      category: 'tools',
      actionUrl: '/dashboard',
    }).catch(() => undefined);

    if (['active', 'completed'].includes(status)) {
      await Listing.findByIdAndUpdate(booking.listingId, {
        $set: {
          status: status === 'active' ? 'rented' : 'active',
        },
      });
    }

    res.status(200).json({ message: 'Booking updated', booking });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update booking' });
  }
};

export const getBookingAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listingId = String(req.params.listingId || '').trim();
    if (!Types.ObjectId.isValid(listingId)) {
      res.status(400).json({ message: 'Invalid listingId' });
      return;
    }

    const bookings = await Booking.find({
      listingId: new Types.ObjectId(listingId),
      status: { $in: ['requested', 'accepted', 'active'] },
    })
      .select('_id startDate endDate status')
      .sort({ startDate: 1 })
      .lean();

    res.status(200).json({
      unavailableRanges: bookings.map((booking) => ({
        id: booking._id,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch booking availability' });
  }
};