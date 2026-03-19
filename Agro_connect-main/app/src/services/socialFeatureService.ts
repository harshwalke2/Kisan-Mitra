import { apiRequest } from './apiClient';
import { useAuthStore } from '../stores/authStore';

const getToken = (): string | null => useAuthStore.getState().token;

export type BackendListingPayload = {
  category: 'crop' | 'tool' | 'land';
  title: string;
  description?: string;
  location: string;
  pricePerUnit: number;
  unit: string;
  quantity?: number;
  media?: string[];
  metadata?: Record<string, unknown>;
};

export type BackendListingResponse = {
  _id: string;
  ownerId:
    | string
    | {
        _id: string;
        username?: string;
        email?: string;
        verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
        verifiedAt?: string;
      };
  category: 'crop' | 'tool' | 'land';
  title: string;
  description?: string;
  location: string;
  pricePerUnit: number;
  unit: string;
  quantity?: number;
  media?: string[];
  status: 'active' | 'inactive' | 'rented' | 'sold';
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export const createBackendListing = async (payload: BackendListingPayload) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ listing: { _id: string } }>('/api/listings', {
    method: 'POST',
    token,
    body: payload,
  });
};

export const fetchBackendListings = async (
  params: {
    category?: string;
    q?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy?: 'newest' | 'priceAsc' | 'priceDesc' | 'ratingDesc';
  } = {}
) => {
  const query = new URLSearchParams();
  query.set('category', params.category || 'crop');
  query.set('status', 'active');

  if (params.q) {
    query.set('q', params.q);
  }
  if (params.location) {
    query.set('location', params.location);
  }
  if (typeof params.minPrice === 'number' && params.minPrice > 0) {
    query.set('minPrice', String(params.minPrice));
  }
  if (typeof params.maxPrice === 'number' && params.maxPrice > 0) {
    query.set('maxPrice', String(params.maxPrice));
  }
  if (typeof params.minRating === 'number' && params.minRating > 0) {
    query.set('minRating', String(params.minRating));
  }
  if (params.sortBy) {
    query.set('sortBy', params.sortBy);
  }

  return apiRequest<{ listings: BackendListingResponse[] }>(`/api/listings?${query.toString()}`);
};

export const createBackendBooking = async (payload: {
  listingId: string;
  startDate: string;
  endDate: string;
  quantity?: number;
  notes?: string;
}) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ booking: { _id: string; totalAmount: number; status: string } }>('/api/bookings', {
    method: 'POST',
    token,
    body: payload,
  });
};

export const fetchMyBookings = async () => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ incoming: any[]; outgoing: any[] }>('/api/bookings/me', { token });
};

export const updateBackendBookingStatus = async (
  bookingId: string,
  status: 'requested' | 'accepted' | 'rejected' | 'active' | 'completed' | 'cancelled',
  paymentStatus?: 'pending' | 'completed' | 'failed'
) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ booking: { _id: string; status: string; paymentStatus: string } }>(
    `/api/bookings/${bookingId}/status`,
    {
      method: 'PATCH',
      token,
      body: {
        status,
        paymentStatus,
      },
    }
  );
};

export const fetchUserProfile = async (userId: string) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{
    profile: {
      _id: string;
      username: string;
      email: string;
      followersCount: number;
      followingCount: number;
      totalListings: number;
      activeListings: number;
      averageRating: number;
      totalReviews: number;
      trustScore: number;
      trustBreakdown?: {
        ratingScore: number;
        completionScore: number;
        reviewVolumeScore: number;
        weightedRating: number;
        weightedCompletion: number;
        weightedReviewVolume: number;
        totalBookings: number;
        completedBookings: number;
      };
      createdAt: string;
    };
    reviews: Array<{
      _id: string;
      rating: number;
      comment?: string;
      createdAt: string;
      reviewerId?: {
        _id: string;
        username: string;
        email: string;
      };
    }>;
    relationship: {
      isFollowing: boolean;
      followsYou: boolean;
      requestStatus: string | null;
    } | null;
  }>(`/api/users/${userId}/profile`, { token });
};

export const createReviewForBooking = async (payload: {
  bookingId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
}) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ review: { _id: string } }>('/api/reviews', {
    method: 'POST',
    token,
    body: payload,
  });
};

export const submitVerificationRequest = async (payload: {
  method: 'aadhaar' | 'digilocker';
  aadhaarNumber?: string;
  digilockerConsent?: boolean;
}) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ message: string; verification: any }>('/api/verification/submit', {
    method: 'POST',
    token,
    body: payload,
  });
};

export const fetchVerificationStatus = async () => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ verification: any }>('/api/verification/status', { token });
};

export const fetchBookingAvailability = async (listingId: string) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{
    unavailableRanges: Array<{
      id: string;
      startDate: string;
      endDate: string;
      status: string;
    }>;
  }>(`/api/bookings/availability/${encodeURIComponent(listingId)}`, { token });
};

export const fetchAdminInsights = async () => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{
    insights: {
      totalUsers: number;
      verifiedUsers: number;
      totalListings: number;
      activeListings: number;
      totalBookings: number;
      completedBookings: number;
      totalReviews: number;
      verificationRate: number;
      bookingCompletionRate: number;
      topCrops: Array<{ name: string; count: number }>;
      topLocations: Array<{ name: string; count: number }>;
    };
  }>('/api/admin/insights', { token });
};