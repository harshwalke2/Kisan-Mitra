import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type BookingStatus = 'requested' | 'accepted' | 'rejected' | 'active' | 'completed' | 'cancelled';
export type BookingPaymentStatus = 'pending' | 'completed' | 'failed';

export interface IBooking extends Document {
  listingId: Types.ObjectId;
  ownerId: Types.ObjectId;
  requesterId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  quantity?: number;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    quantity: {
      type: Number,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'rejected', 'active', 'completed', 'cancelled'],
      default: 'requested',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ requesterId: 1, status: 1, createdAt: -1 });

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;