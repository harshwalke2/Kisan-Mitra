import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type ListingCategory = 'crop' | 'tool' | 'land';
export type ListingStatus = 'active' | 'inactive' | 'rented' | 'sold';

export interface IListing extends Document {
  ownerId: Types.ObjectId;
  category: ListingCategory;
  title: string;
  description: string;
  location: string;
  pricePerUnit: number;
  unit: string;
  quantity?: number;
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
    category: {
      type: String,
      enum: ['crop', 'tool', 'land'],
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
listingSchema.index({ category: 1, status: 1, createdAt: -1 });

const Listing: Model<IListing> = mongoose.models.Listing || mongoose.model<IListing>('Listing', listingSchema);

export default Listing;