import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Listing from '../models/Listing';

const normalizeNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseSort = (sortBy: string): Record<string, 1 | -1> => {
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    priceAsc: { pricePerUnit: 1 },
    priceDesc: { pricePerUnit: -1 },
    ratingDesc: { 'metadata.rating': -1, createdAt: -1 },
    lowToHigh: { pricePerUnit: 1 },
    highToLow: { pricePerUnit: -1 },
  };
  return sortMap[sortBy] || sortMap.newest;
};

const toCity = (location: string): string => String(location || '').split(',')[0].trim().toLowerCase();

const normalizeListingResponse = (
  listing: any,
  pricingByProduct: Record<string, { avgPrice: number; count: number }>,
  userLocation?: string
) => {
  const productName = String(listing.productName || listing.title || '').trim();
  const pricing = pricingByProduct[productName.toLowerCase()];
  const recommendedPrice = pricing?.avgPrice || Number(listing.pricePerUnit || 0);
  const currentPrice = Number(listing.pricePerUnit || 0);
  const isBestDeal = recommendedPrice > 0 && currentPrice <= recommendedPrice * 0.9;

  const listingCity = toCity(String(listing.location || ''));
  const nearby = userLocation ? listingCity === toCity(userLocation) : false;

  return {
    ...listing,
    productName,
    title: String(listing.title || productName),
    sellerId: listing.sellerId || listing.ownerId,
    price: Number(listing.price || currentPrice),
    image:
      listing.image
      || (Array.isArray(listing.media) && listing.media.length > 0 ? listing.media[0] : ''),
    recommendedPrice: Number(recommendedPrice.toFixed(2)),
    isBestDeal,
    nearby,
  };
};

const buildFilter = (req: AuthRequest): Record<string, unknown> => {
  const category = String(req.query.category || '').trim();
  const ownerId = String(req.query.ownerId || '').trim();
  const sellerId = String(req.query.sellerId || '').trim();
  const status = String(req.query.status || 'active').trim();
  const q = String(req.query.q || req.query.productName || '').trim();
  const location = String(req.query.location || '').trim();
  const minPrice = normalizeNumber(req.query.minPrice);
  const maxPrice = normalizeNumber(req.query.maxPrice);

  const filter: Record<string, unknown> = {};
  const andClauses: Record<string, unknown>[] = [];

  if (category) {
    filter.category = category;
  }

  const sellerCandidate = sellerId || ownerId;
  if (sellerCandidate && Types.ObjectId.isValid(sellerCandidate)) {
    const idObj = new Types.ObjectId(sellerCandidate);
    andClauses.push({ $or: [{ ownerId: idObj }, { sellerId: idObj }] });
  }

  if (status) {
    filter.status = status;
  }

  if (q) {
    andClauses.push({
      $or: [
      { productName: { $regex: q, $options: 'i' } },
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      ],
    });
  }

  if (location) {
    filter.location = { $regex: location, $options: 'i' };
  }

  if (minPrice > 0 || maxPrice > 0) {
    filter.pricePerUnit = {};
    if (minPrice > 0) {
      (filter.pricePerUnit as Record<string, number>).$gte = minPrice;
    }
    if (maxPrice > 0) {
      (filter.pricePerUnit as Record<string, number>).$lte = maxPrice;
    }
  }

  if (andClauses.length > 0) {
    filter.$and = andClauses;
  }

  return filter;
};

const resolvePricingMap = async (productNames: string[]): Promise<Record<string, { avgPrice: number; count: number }>> => {
  const uniqueProductNames = Array.from(new Set(productNames.map((name) => name.toLowerCase())));
  if (!uniqueProductNames.length) {
    return {};
  }

  const aggregate = await Listing.aggregate([
    {
      $match: {
        status: 'active',
        $expr: {
          $in: [{ $toLower: '$productName' }, uniqueProductNames],
        },
      },
    },
    {
      $group: {
        _id: { $toLower: '$productName' },
        avgPrice: { $avg: '$pricePerUnit' },
        count: { $sum: 1 },
      },
    },
  ]);

  const map: Record<string, { avgPrice: number; count: number }> = {};
  for (const row of aggregate) {
    map[String(row._id)] = {
      avgPrice: Number(row.avgPrice || 0),
      count: Number(row.count || 0),
    };
  }

  return map;
};

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
      productName,
      title,
      description,
      location,
      pricePerUnit,
      unit,
      quantity,
      media,
      image,
      metadata,
    } = req.body as {
      category:
        | 'crop'
        | 'tool'
        | 'land'
        | 'vegetable'
        | 'fruit'
        | 'grain'
        | 'pulse'
        | 'spice'
        | 'other';
      productName?: string;
      title: string;
      description?: string;
      location: string;
      pricePerUnit: number;
      unit: string;
      quantity?: number;
      media?: string[];
      image?: string;
      metadata?: Record<string, unknown>;
    };

    const normalizedProductName = String(productName || title || '').trim();
    if (normalizedProductName.length < 2) {
      res.status(400).json({ message: 'productName is required' });
      return;
    }
    const normalizedMedia = Array.isArray(media) ? media.filter(Boolean) : [];
    const imageUrl = String(image || normalizedMedia[0] || '').trim();

    const listing = await Listing.create({
      ownerId: new Types.ObjectId(ownerId),
      sellerId: new Types.ObjectId(ownerId),
      category,
      productName: normalizedProductName,
      title: normalizedProductName,
      description: (description || '').trim(),
      location: location.trim(),
      pricePerUnit,
      price: pricePerUnit,
      unit: unit.trim(),
      quantity,
      media: imageUrl ? [imageUrl, ...normalizedMedia.filter((item) => item !== imageUrl)] : normalizedMedia,
      image: imageUrl,
      metadata: metadata || {},
    });

    res.status(201).json({ message: 'Listing created', listing });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create listing' });
  }
};

export const getListings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = buildFilter(req);
    const page = Math.max(1, Math.floor(normalizeNumber(req.query.page, 1)));
    const limit = Math.min(100, Math.max(1, Math.floor(normalizeNumber(req.query.limit, 20))));
    const skip = (page - 1) * limit;
    const sortBy = String(req.query.sortBy || 'newest').trim();

    const [total, rawListings] = await Promise.all([
      Listing.countDocuments(filter),
      Listing.find(filter)
      .populate('ownerId', '_id username email verificationStatus verifiedAt')
      .sort(parseSort(sortBy))
      .skip(skip)
      .limit(limit)
      .lean(),
    ]);

    const pricingMap = await resolvePricingMap(rawListings.map((item) => String(item.productName || item.title || '')));
    const userLocation = String(req.query.userLocation || '').trim();
    const listings = rawListings.map((item) => normalizeListingResponse(item, pricingMap, userLocation));

    res.status(200).json({
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch listings' });
  }
};

export const getMyListings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId as string;
    const listings = await Listing.find({
      $or: [
        { ownerId: new Types.ObjectId(userId) },
        { sellerId: new Types.ObjectId(userId) },
      ],
    })
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
      {
        _id: listingId,
        $or: [
          { ownerId: new Types.ObjectId(userId) },
          { sellerId: new Types.ObjectId(userId) },
        ],
      },
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

export const getProductById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listingId = String(req.params.listingId || req.params.id || '').trim();
    if (!Types.ObjectId.isValid(listingId)) {
      res.status(400).json({ message: 'Invalid product id' });
      return;
    }

    const listing = await Listing.findById(listingId)
      .populate('ownerId', '_id username email verificationStatus verifiedAt')
      .lean();

    if (!listing) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const pricingMap = await resolvePricingMap([String(listing.productName || listing.title || '')]);
    const normalized = normalizeListingResponse(listing, pricingMap, String(req.query.userLocation || ''));

    res.status(200).json({ product: normalized });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    return;
  }

  try {
    const userId = String(req.userId || '').trim();
    const listingId = String(req.params.listingId || req.params.id || '').trim();
    if (!Types.ObjectId.isValid(listingId)) {
      res.status(400).json({ message: 'Invalid product id' });
      return;
    }

    const payload = req.body as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};

    if (typeof payload.productName === 'string' && payload.productName.trim()) {
      updateData.productName = payload.productName.trim();
      updateData.title = payload.productName.trim();
    }

    if (typeof payload.category === 'string') {
      updateData.category = payload.category;
    }

    if (typeof payload.description === 'string') {
      updateData.description = payload.description.trim();
    }

    if (typeof payload.location === 'string') {
      updateData.location = payload.location.trim();
    }

    if (typeof payload.unit === 'string') {
      updateData.unit = payload.unit.trim();
    }

    if (typeof payload.price === 'number' || typeof payload.pricePerUnit === 'number') {
      const pricePerUnit = normalizeNumber(payload.pricePerUnit, normalizeNumber(payload.price, 0));
      updateData.pricePerUnit = pricePerUnit;
      updateData.price = pricePerUnit;
    }

    if (typeof payload.quantity === 'number') {
      updateData.quantity = payload.quantity;
    }

    if (Array.isArray(payload.media)) {
      updateData.media = payload.media.filter(Boolean);
      if ((updateData.media as string[]).length > 0) {
        updateData.image = (updateData.media as string[])[0];
      }
    }

    if (typeof payload.image === 'string' && payload.image.trim()) {
      updateData.image = payload.image.trim();
      const existingMedia = Array.isArray(updateData.media) ? (updateData.media as string[]) : [];
      updateData.media = [payload.image.trim(), ...existingMedia.filter((item) => item !== payload.image)];
    }

    if (typeof payload.metadata === 'object' && payload.metadata !== null) {
      updateData.metadata = payload.metadata;
    }

    const listing = await Listing.findOneAndUpdate(
      {
        _id: new Types.ObjectId(listingId),
        $or: [
          { ownerId: new Types.ObjectId(userId) },
          { sellerId: new Types.ObjectId(userId) },
        ],
      },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!listing) {
      res.status(404).json({ message: 'Product not found or unauthorized' });
      return;
    }

    res.status(200).json({ message: 'Product updated', product: listing });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.userId || '').trim();
    const listingId = String(req.params.listingId || req.params.id || '').trim();
    if (!Types.ObjectId.isValid(listingId)) {
      res.status(400).json({ message: 'Invalid product id' });
      return;
    }

    const result = await Listing.findOneAndDelete({
      _id: new Types.ObjectId(listingId),
      $or: [
        { ownerId: new Types.ObjectId(userId) },
        { sellerId: new Types.ObjectId(userId) },
      ],
    });

    if (!result) {
      res.status(404).json({ message: 'Product not found or unauthorized' });
      return;
    }

    res.status(200).json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

export const uploadProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      res.status(400).json({ message: 'Image file is required' });
      return;
    }

    const imageUrl = `/uploads/products/${file.filename}`;
    res.status(201).json({ message: 'Image uploaded', imageUrl });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload image' });
  }
};