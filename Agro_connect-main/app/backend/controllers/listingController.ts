import { Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Listing from '../models/Listing';

export const createListing = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return;
  }

  try {
    const ownerId = req.userId as string;
    const {
      category,
      title,
      description,
      location,
      pricePerUnit,
      unit,
      quantity,
      media,
      metadata,
    } = req.body as {
      category: 'crop' | 'tool' | 'land';
      title: string;
      description?: string;
      location: string;
      pricePerUnit: number;
      unit: string;
      quantity?: number;
      media?: string[];
      metadata?: Record<string, unknown>;
    };

    const listing = await Listing.create({
      ownerId: new Types.ObjectId(ownerId),
      category,
      title: title.trim(),
      description: (description || '').trim(),
      location: location.trim(),
      pricePerUnit,
      unit: unit.trim(),
      quantity,
      media: media || [],
      metadata: metadata || {},
    });

    res.status(201).json({ message: 'Listing created', listing });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create listing' });
  }
};

export const getListings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = String(req.query.category || '').trim();
    const ownerId = String(req.query.ownerId || '').trim();
    const status = String(req.query.status || 'active').trim();

    const filter: Record<string, unknown> = {};

    if (category) {
      filter.category = category;
    }

    if (ownerId && Types.ObjectId.isValid(ownerId)) {
      filter.ownerId = new Types.ObjectId(ownerId);
    }

    if (status) {
      filter.status = status;
    }

    const listings = await Listing.find(filter)
      .populate('ownerId', '_id username email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ listings });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch listings' });
  }
};

export const getMyListings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const listings = await Listing.find({ ownerId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ listings });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user listings' });
  }
};

export const updateListingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return;
  }

  try {
    const userId = req.userId as string;
    const listingId = req.params.listingId;
    const { status } = req.body as { status: 'active' | 'inactive' | 'rented' | 'sold' };

    const listing = await Listing.findOneAndUpdate(
      { _id: listingId, ownerId: new Types.ObjectId(userId) },
      { $set: { status } },
      { new: true }
    );

    if (!listing) {
      res.status(404).json({ message: 'Listing not found or unauthorized' });
      return;
    }

    res.status(200).json({ message: 'Listing status updated', listing });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update listing status' });
  }
};