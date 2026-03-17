import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type FollowRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface IFollowRequest extends Document {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: FollowRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const followRequestSchema = new Schema<IFollowRequest>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

followRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });
followRequestSchema.index({ receiverId: 1, status: 1 });

const FollowRequest: Model<IFollowRequest> =
  mongoose.models.FollowRequest || mongoose.model<IFollowRequest>('FollowRequest', followRequestSchema);

export default FollowRequest;
