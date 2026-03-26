import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IScheme extends Document {
  name: string;
  state: string;
  category: string;
  description: string;
  eligibility: string;
  documents: string[];
  benefits: string;
  application_link: string;
  createdAt: Date;
  updatedAt: Date;
}

const schemeSchema = new Schema<IScheme>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    eligibility: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    documents: {
      type: [String],
      required: true,
      default: [],
    },
    benefits: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    application_link: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

schemeSchema.index({ createdAt: -1 });
schemeSchema.index({ name: 'text', description: 'text' });
schemeSchema.index({ name: 1, state: 1 }, { unique: true });

const Scheme: Model<IScheme> = mongoose.models.Scheme || mongoose.model<IScheme>('Scheme', schemeSchema);

export default Scheme;