import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured in environment variables');
  }

  await mongoose.connect(mongoUri);
  console.log('[db] MongoDB connected');
};
