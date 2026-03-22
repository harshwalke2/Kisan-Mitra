import { apiRequest, getApiBaseUrl } from './apiClient';
import { useAuthStore } from '../stores/authStore';

const getToken = (): string | null => useAuthStore.getState().token;

export type BackendListingPayload = {
  category: 'crop' | 'tool' | 'land' | 'vegetable' | 'fruit' | 'grain' | 'pulse' | 'spice' | 'other';
  productName?: string;
  title?: string;
  description?: string;
  location: string;
  price?: number;
  pricePerUnit: number;
  unit: string;
  quantity?: number;
  image?: string;
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
  productName?: string;
  title: string;
  description?: string;
  location: string;
  price?: number;
  pricePerUnit: number;
  unit: string;
  quantity?: number;
  image?: string;
  media?: string[];
  status: 'active' | 'inactive' | 'rented' | 'sold';
  recommendedPrice?: number;
  isBestDeal?: boolean;
  nearby?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type BackendListingListResponse = {
  listings: BackendListingResponse[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const createBackendListing = async (payload: BackendListingPayload) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ listing: { _id: string } }>('/api/products', {
    method: 'POST',
    token,
    body: payload,
  });
};

export const uploadListingImage = async (file: File) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();
  formData.append('image', file);

  const uploadResponse = await fetch(`${getApiBaseUrl()}/api/products/upload-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await uploadResponse.text();
  let payload: any = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (error) {
    payload = { message: text };
  }

  if (!uploadResponse.ok) {
    throw new Error(payload?.message || 'Failed to upload image');
  }

  return payload as { imageUrl: string };
};

export const fetchBackendListings = async (
  params: {
    category?: string;
    q?: string;
    productName?: string;
    location?: string;
    userLocation?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy?: 'newest' | 'priceAsc' | 'priceDesc' | 'ratingDesc';
    page?: number;
    limit?: number;
    status?: 'active' | 'inactive' | 'rented' | 'sold';
    ownerId?: string;
  } = {}
) => {
  const query = new URLSearchParams();
  query.set('category', params.category || 'crop');
  query.set('status', params.status || 'active');

  if (params.q || params.productName) {
    query.set('q', params.q || String(params.productName || ''));
  }
  if (params.location) {
    query.set('location', params.location);
  }
  if (params.userLocation) {
    query.set('userLocation', params.userLocation);
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
  if (typeof params.page === 'number' && params.page > 0) {
    query.set('page', String(params.page));
  }
  if (typeof params.limit === 'number' && params.limit > 0) {
    query.set('limit', String(params.limit));
  }
  if (params.ownerId) {
    query.set('ownerId', params.ownerId);
  }

  return apiRequest<BackendListingListResponse>(`/api/products?${query.toString()}`);
};

export const fetchBackendListingById = async (id: string, userLocation?: string) => {
  const query = new URLSearchParams();
  if (userLocation) {
    query.set('userLocation', userLocation);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<{ product: BackendListingResponse }>(`/api/products/${encodeURIComponent(id)}${suffix}`);
};

export const updateBackendListing = async (id: string, payload: Partial<BackendListingPayload>) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ product: BackendListingResponse }>(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token,
    body: payload,
  });
};

export const deleteBackendListing = async (id: string) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ message: string }>(`/api/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
};

export const updateBackendListingStatus = async (
  id: string,
  status: 'active' | 'inactive' | 'rented' | 'sold'
) => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ listing: BackendListingResponse }>(`/api/products/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
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

export const fetchLiveMarketInsights = async (params?: {
  state?: string;
  city?: string;
  commodity?: string;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.state) {
    query.set('state', params.state);
  }
  if (params?.city) {
    query.set('city', params.city);
  }
  if (params?.commodity) {
    query.set('commodity', params.commodity);
  }
  if (typeof params?.limit === 'number' && params.limit > 0) {
    query.set('limit', String(params.limit));
  }

  const endpoint = query.toString() ? `/api/market/insights?${query.toString()}` : '/api/market/insights';

  return apiRequest<{
    insights: Array<{
      id: string;
      title: string;
      description: string;
      category: string;
      impact: 'high' | 'medium' | 'low';
      createdAt: string;
    }>;
    observations: Array<{
      state: string;
      city: string;
      market: string;
      commodity: string;
      location: string;
      modalPrice: number;
      arrivalDate: string;
    }>;
    statistics: {
      totalRecords: number;
      totalStates: number;
      totalCities: number;
      totalMarkets: number;
      totalCommodities: number;
      stateOptions: string[];
      cityOptions: string[];
      lastUpdated: string | null;
    };
    source?: string;
  }>(endpoint);
};

export const fetchMyBackendListings = async () => {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return apiRequest<{ listings: BackendListingResponse[] }>('/api/listings/me', { token });
};