import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IConversation extends Document {
  participants: [Types.ObjectId, Types.ObjectId];
  lastMessage?: string;
  updatedAt: Date;
  createdAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: {
        validator: (value: Types.ObjectId[]) => value.length === 2,
        message: 'Conversation must have exactly two participants',
      },
      required: true,
    },
    lastMessage: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 }, { unique: true });

const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', conversationSchema);

export default Conversation;
