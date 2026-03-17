import { Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Booking, { BookingStatus } from '../models/Booking';
import Listing from '../models/Listing';

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