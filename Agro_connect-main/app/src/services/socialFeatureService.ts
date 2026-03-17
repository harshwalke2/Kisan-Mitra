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

export const fetchBackendListings = async (category = 'crop') => {
  return apiRequest<{ listings: BackendListingResponse[] }>(
    `/api/listings?category=${encodeURIComponent(category)}&status=active`
  );
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