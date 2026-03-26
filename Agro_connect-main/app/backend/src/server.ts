import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import authRoutes from '../api/authRoutes';
import bookingRoutes from '../api/bookingRoutes';
import cropRecommendationRoutes from '../api/cropRecommendationRoutes';
import followRoutes from '../api/followRoutes';
import listingRoutes from '../api/listingRoutes';
import marketInsightsRoutes from '../api/marketInsightsRoutes';
import messageRoutes from '../api/messageRoutes';
import notificationRoutes from '../api/notificationRoutes';
import profileRoutes from '../api/profileRoutes';
import reviewRoutes from '../api/reviewRoutes';
import verificationRoutes from '../api/verificationRoutes';
import adminRoutes from '../api/adminRoutes';
import schemeRoutes from '../api/schemeRoutes';
import whatsappRoutes from '../api/whatsappRoutes';
import { connectDB } from '../config/db';
import { initChatSocket } from '../socket/chatSocket';
import { seedSchemesIfEmpty } from '../services/schemeSeedService';
import { startNotificationScheduler } from './notificationScheduler';
import { startSchemeSyncScheduler } from './schemeSyncScheduler';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Required on Render/other reverse proxies so rate limiting keys by real client IP.
app.set('trust proxy', 1);

// Hide framework fingerprint from attackers.
app.disable('x-powered-by');

const defaultFrontendOrigins =
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173,http://localhost:5188' : '';

const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || defaultFrontendOrigins)
  .split(',')
  .map((origin) => origin.replace(/\s+/g, '').trim())
  .filter(Boolean);

const normalizeOrigin = (value: string): string => value.replace(/\s+/g, '').trim().replace(/\/+$/, '').toLowerCase();

const allowedOriginSet = new Set(allowedOrigins.map(normalizeOrigin));

const allowPreviewDomains = String(process.env.ALLOW_PREVIEW_ORIGINS || 'false').toLowerCase() === 'true';
const corsAllowAll = String(process.env.CORS_ALLOW_ALL || 'false').toLowerCase() === 'true';

const isPreviewOrigin = (origin: string): boolean => {
  const normalized = normalizeOrigin(origin);
  return /^https?:\/\/([a-z0-9-]+\.)*netlify\.app(?::\d+)?$/i.test(normalized)
    || /^https?:\/\/([a-z0-9-]+\.)*onrender\.com(?::\d+)?$/i.test(normalized);
};

const isAllowedOrigin = (origin?: string): boolean => {
  if (corsAllowAll) {
    return true;
  }

  if (!origin) {
    return true;
  }

  const normalized = normalizeOrigin(origin);
  if (allowedOriginSet.has(normalized)) {
    return true;
  }

  const isDevLocalOrigin =
    process.env.NODE_ENV === 'development'
    && Boolean(origin)
    && /^https?:\/\/(localhost|127\.0\.0\.1):(\d+)$/i.test(String(origin));

  if (isDevLocalOrigin) {
    return true;
  }

  if (allowPreviewDomains) {
    if (isPreviewOrigin(origin)) {
      return true;
    }
  }

  return false;
};

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: process.env.NODE_ENV === 'production' ? undefined : false,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 2000 : 100,
  message: 'Too many requests from this IP, please try again later.'
  ,skip: (req) => {
    // Avoid blocking local development and health checks.
    const host = req.hostname || '';
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    const isHealthRoute = req.path === '/health';
    return process.env.NODE_ENV === 'development' || isLocalHost || isHealthRoute;
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api', authRoutes);
app.use('/api', cropRecommendationRoutes);
app.use('/api', marketInsightsRoutes);
app.use('/api', followRoutes);
app.use('/api', messageRoutes);
app.use('/api', listingRoutes);
app.use('/api', bookingRoutes);
app.use('/api', reviewRoutes);
app.use('/api', profileRoutes);
app.use('/api', notificationRoutes);
app.use('/api', verificationRoutes);
app.use('/api', adminRoutes);
app.use('/api', schemeRoutes);
app.use('/api', whatsappRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = mongoose.connection.readyState;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStateMap[dbState] || 'unknown',
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'AgroConnect API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      cropRecommendation: '/api/crop-recommend',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      searchUsers: 'GET /api/users/search?q=<query>',
      sendFollowRequest: 'POST /api/follow-request',
      getPendingRequests: 'GET /api/follow-requests',
      acceptFollowRequest: 'POST /api/follow-request/accept',
      rejectFollowRequest: 'POST /api/follow-request/reject',
      getMessages: 'GET /api/messages/:userId',
      sendMessage: 'POST /api/messages',
      getListings: 'GET /api/listings',
      createListing: 'POST /api/listings',
      getMyBookings: 'GET /api/bookings/me',
      createBooking: 'POST /api/bookings',
      updateBookingStatus: 'PATCH /api/bookings/:bookingId/status',
      createReview: 'POST /api/reviews',
      getUserReviews: 'GET /api/reviews/:userId',
      getMyProfile: 'GET /api/profile/me',
      getPublicProfile: 'GET /api/users/:userId/profile',
      getNotifications: 'GET /api/notifications',
      generateNotifications: 'POST /api/notifications/generate',
      markNotificationAsRead: 'PATCH /api/notifications/:notificationId/read',
      markAllNotificationsAsRead: 'PATCH /api/notifications/read-all',
      deleteNotification: 'DELETE /api/notifications/:notificationId',
      getSchemes: 'GET /api/schemes',
      getSchemeById: 'GET /api/schemes/:id',
      filterSchemes: 'GET /api/schemes/filter?state=&category=&keyword=',
      createScheme: 'POST /api/schemes',
      syncSchemes: 'POST /api/schemes/sync',
      whatsappWebhook: 'POST /api/whatsapp/webhook',
      whatsappHealth: 'GET /api/whatsapp/health',
      verificationStatus: 'GET /api/verification/status',
      submitVerification: 'POST /api/verification/submit',
      reviewVerification: 'POST /api/verification/review',
      bookingAvailability: 'GET /api/bookings/availability/:listingId',
      adminInsights: 'GET /api/admin/insights'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const socketCorsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Socket.IO CORS blocked for origin: ${origin}`), false);
};

const io = new Server(server, {
  cors: {
    origin: socketCorsOrigin as any,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initChatSocket(io);

const DB_RETRY_DELAY_MS = 10000;
let schedulerStarted = false;
let schemeSyncSchedulerStarted = false;

const connectDBWithRetry = async (): Promise<void> => {
  try {
    await connectDB();
    console.log('[db] Connection established');
    await seedSchemesIfEmpty();

    if (!schedulerStarted) {
      startNotificationScheduler();
      schedulerStarted = true;
    }

    if (!schemeSyncSchedulerStarted) {
      startSchemeSyncScheduler();
      schemeSyncSchedulerStarted = true;
    }
  } catch (error) {
    console.error('[db] Initial connection failed. Retrying in 10s...', error);
    setTimeout(() => {
      void connectDBWithRetry();
    }, DB_RETRY_DELAY_MS);
  }
};

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed frontend origins: ${allowedOrigins.join(', ')}`);
  console.log(`CORS allow all: ${corsAllowAll}`);
});

void connectDBWithRetry();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
