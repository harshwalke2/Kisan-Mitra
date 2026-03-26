import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const rawMongoUri = process.env.MONGODB_URI;

  if (!rawMongoUri) {
    throw new Error('MONGODB_URI is not configured in environment variables');
  }

  const mongoUri = rawMongoUri.trim().replace(/^['\"]|['\"]$/g, '');

  await mongoose.connect(mongoUri);
  console.log('[db] MongoDB connected');
};
