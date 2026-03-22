import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type ListingCategory =
  | 'crop'
  | 'tool'
  | 'land'
  | 'vegetable'
  | 'fruit'
  | 'grain'
  | 'pulse'
  | 'spice'
  | 'other';
export type ListingStatus = 'active' | 'inactive' | 'rented' | 'sold';

export interface IListing extends Document {
  ownerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  productName: string;
  category: ListingCategory;
  title: string;
  description: string;
  location: string;
  pricePerUnit: number;
  price: number;
  unit: string;
  quantity?: number;
  image?: string;
  media: string[];
  status: ListingStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const listingSchema = new Schema<IListing>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      index: true,
    },
    category: {
      type: String,
      enum: ['crop', 'tool', 'land', 'vegetable', 'fruit', 'grain', 'pulse', 'spice', 'other'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    quantity: {
      type: Number,
      min: 0,
    },
    media: {
      type: [String],
      default: [],
    },
    image: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'rented', 'sold'],
      default: 'active',
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

listingSchema.index({ ownerId: 1, createdAt: -1 });
listingSchema.index({ sellerId: 1, createdAt: -1 });
listingSchema.index({ category: 1, status: 1, pricePerUnit: 1, createdAt: -1 });
listingSchema.index({ location: 1, status: 1, createdAt: -1 });
listingSchema.index({ productName: 'text', description: 'text', location: 'text' });

listingSchema.pre('validate', function normalizeListing() {
  const listing = this as IListing;

  if (!listing.productName && listing.title) {
    listing.productName = listing.title;
  }

  if (!listing.title && listing.productName) {
    listing.title = listing.productName;
  }

  if (!listing.sellerId && listing.ownerId) {
    listing.sellerId = listing.ownerId;
  }

  if ((!listing.image || !String(listing.image).trim()) && Array.isArray(listing.media) && listing.media.length > 0) {
    listing.image = listing.media[0];
  }

  if (!Number.isFinite(listing.price) || listing.price <= 0) {
    listing.price = listing.pricePerUnit;
  }
});

const Listing: Model<IListing> = mongoose.models.Listing || mongoose.model<IListing>('Listing', listingSchema);

export default Listing;