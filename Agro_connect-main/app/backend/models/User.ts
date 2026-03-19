import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
  farmName?: string;
  farmSize?: number;
  preferredLanguage?: string;
  role: 'farmer' | 'admin';
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationMethod?: 'aadhaar' | 'digilocker';
  aadhaarLast4?: string;
  digilockerLinked?: boolean;
  verificationSubmittedAt?: Date;
  verifiedAt?: Date;
  verificationRejectionReason?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    farmName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    farmSize: {
      type: Number,
      min: 0,
    },
    preferredLanguage: {
      type: String,
      trim: true,
      maxlength: 20,
      default: 'en',
    },
    role: {
      type: String,
      enum: ['farmer', 'admin'],
      default: 'farmer',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified',
      index: true,
    },
    verificationMethod: {
      type: String,
      enum: ['aadhaar', 'digilocker'],
    },
    aadhaarLast4: {
      type: String,
      minlength: 4,
      maxlength: 4,
    },
    digilockerLinked: {
      type: Boolean,
      default: false,
    },
    verificationSubmittedAt: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
    },
    verificationRejectionReason: {
      type: String,
      maxlength: 240,
      trim: true,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    followers: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    following: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
