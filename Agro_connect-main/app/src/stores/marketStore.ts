import { create, persist } from './zustand-mock';
import { createAvatarUrl } from '../services/apiClient';
import { useAuthStore } from './authStore';
import {
  deleteBackendListing,
  fetchMyBackendListings,
  fetchBackendListings,
  fetchLiveMarketInsights,
  updateBackendListing,
  updateBackendListingStatus,
  type BackendListingResponse,
} from '../services/socialFeatureService';

export interface CropPrice {
  id: string;
  cropName: string;
  currentPrice: number;
  priceUnit: string;
  priceChange: number;
  priceChangePercent: number;
  demand: 'high' | 'medium' | 'low';
  supply: 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'stable';
  history: Array<{ date: string; price: number }>;
  prediction: Array<{ date: string; price: number; confidence: number }>;
}

export interface CropListing {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerAvatar?: string;
  isVerifiedSeller?: boolean;
  cropName: string;
  category?: string;
  variety: string;
  quantity: number;
  quantityUnit: string;
  pricePerUnit: number;
  minOrderQuantity: number;
  quality: string;
  isOrganic: boolean;
  harvestDate: string;
  expiryDate: string;
  images: string[];
  description: string;
  location: string;
  distance?: number;
  rating: number;
  reviewCount: number;
  status: 'active' | 'sold' | 'expired';
  recommendedPrice?: number;
  isBestDeal?: boolean;
  nearby?: boolean;
  createdAt: string;
}

export interface CartItem {
  id: string; // unique cart item id
  listingId: string;
  listing: CropListing;
  quantity: number;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface Order {
  id: string;
  itemId: string;
  itemName: string;
  buyerId: string;
  sellerId: string;
  price: number;
  quantity: number;
  unit: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface MarketInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
  createdAt: string;
}

interface MarketState {
  cropPrices: CropPrice[];
  listings: CropListing[];
  insights: MarketInsight[];
  insightsSource?: string;
  insightsStatus: 'idle' | 'loading' | 'ready' | 'error';
  insightsError?: string;
  listingsStatus: 'idle' | 'loading' | 'ready' | 'error';
  listingsError?: string;
  page: number;
  limit: number;
  totalPages: number;
  totalListings: number;
  userListings: CropListing[];
  wishlist: string[];
  orders: Order[];
  cart: CartItem[];
  fetchCropPrices: () => void;
  fetchInsights: () => Promise<void>;
  fetchListings: (filters?: {
    cropName?: string;
    location?: string;
    isOrganic?: boolean;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy?: 'newest' | 'priceAsc' | 'priceDesc' | 'ratingDesc';
    category?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchMyListings: () => Promise<void>;
  setPage: (page: number) => void;
  addListing: (listing: Omit<CropListing, 'id' | 'createdAt'> & Partial<Pick<CropListing, 'id'>>) => void;
  updateListing: (id: string, data: Partial<CropListing>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  markListingAsSold: (id: string) => Promise<void>;
  addToWishlist: (id: string) => void;
  removeFromWishlist: (id: string) => void;
  addToCart: (listing: CropListing, quantity: number) => void;
  updateCartItemQuantity: (id: string, quantity: number) => void;
  updateCartItemAddress: (id: string, address: CartItem['shippingAddress']) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  createOrder: (order: Omit<Order, 'id' | 'createdAt'>) => void;
  getPricePrediction: (cropName: string) => any;
}

const mockCropPrices: CropPrice[] = [
  {
    id: '1',
    cropName: 'Wheat',
    currentPrice: 2450,
    priceUnit: 'per quintal',
    priceChange: 180,
    priceChangePercent: 7.9,
    demand: 'high',
    supply: 'medium',
    trend: 'up',
    history: [
      { date: '2024-01', price: 2100 },
      { date: '2024-02', price: 2150 },
      { date: '2024-03', price: 2200 },
      { date: '2024-04', price: 2270 },
      { date: '2024-05', price: 2450 }
    ],
    prediction: [
      { date: '2024-06', price: 2520, confidence: 85 },
      { date: '2024-07', price: 2600, confidence: 78 },
      { date: '2024-08', price: 2550, confidence: 72 }
    ]
  },
  {
    id: '2',
    cropName: 'Rice',
    currentPrice: 3200,
    priceUnit: 'per quintal',
    priceChange: -150,
    priceChangePercent: -4.5,
    demand: 'medium',
    supply: 'high',
    trend: 'down',
    history: [
      { date: '2024-01', price: 3400 },
      { date: '2024-02', price: 3350 },
      { date: '2024-03', price: 3300 },
      { date: '2024-04', price: 3250 },
      { date: '2024-05', price: 3200 }
    ],
    prediction: [
      { date: '2024-06', price: 3150, confidence: 80 },
      { date: '2024-07', price: 3100, confidence: 75 },
      { date: '2024-08', price: 3250, confidence: 68 }
    ]
  },
  {
    id: '3',
    cropName: 'Sugarcane',
    currentPrice: 380,
    priceUnit: 'per quintal',
    priceChange: 25,
    priceChangePercent: 7.0,
    demand: 'high',
    supply: 'low',
    trend: 'up',
    history: [
      { date: '2024-01', price: 340 },
      { date: '2024-02', price: 350 },
      { date: '2024-03', price: 360 },
      { date: '2024-04', price: 370 },
      { date: '2024-05', price: 380 }
    ],
    prediction: [
      { date: '2024-06', price: 390, confidence: 82 },
      { date: '2024-07', price: 400, confidence: 76 },
      { date: '2024-08', price: 395, confidence: 70 }
    ]
  },
  {
    id: '4',
    cropName: 'Cotton',
    currentPrice: 7200,
    priceUnit: 'per quintal',
    priceChange: 400,
    priceChangePercent: 5.9,
    demand: 'high',
    supply: 'medium',
    trend: 'up',
    history: [
      { date: '2024-01', price: 6500 },
      { date: '2024-02', price: 6700 },
      { date: '2024-03', price: 6900 },
      { date: '2024-04', price: 7100 },
      { date: '2024-05', price: 7200 }
    ],
    prediction: [
      { date: '2024-06', price: 7400, confidence: 78 },
      { date: '2024-07', price: 7600, confidence: 72 },
      { date: '2024-08', price: 7500, confidence: 68 }
    ]
  }
];

const mockListings: CropListing[] = [
  {
    id: '1',
    farmerId: '1',
    farmerName: 'Rajesh Kumar',
    farmerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rajesh',
    cropName: 'Organic Wheat',
    variety: 'HD-2967',
    quantity: 50,
    quantityUnit: 'quintals',
    pricePerUnit: 2600,
    minOrderQuantity: 5,
    quality: 'Grade A',
    isOrganic: true,
    harvestDate: '2024-04-15',
    expiryDate: '2024-07-15',
    images: [
      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400',
      'https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?w=400'
    ],
    description: 'Premium quality organic wheat grown without chemical fertilizers.',
    location: 'Pune, Maharashtra',
    distance: 12,
    rating: 4.8,
    reviewCount: 24,
    status: 'active',
    createdAt: '2024-05-01'
  },
  {
    id: '2',
    farmerId: '3',
    farmerName: 'Suresh Patel',
    farmerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=suresh',
    cropName: 'Basmati Rice',
    variety: 'Pusa 1121',
    quantity: 100,
    quantityUnit: 'quintals',
    pricePerUnit: 4500,
    minOrderQuantity: 10,
    quality: 'Premium',
    isOrganic: false,
    harvestDate: '2024-03-20',
    expiryDate: '2024-09-20',
    images: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400'
    ],
    description: 'Long grain basmati rice with excellent aroma.',
    location: 'Karnal, Haryana',
    distance: 850,
    rating: 4.6,
    reviewCount: 18,
    status: 'active',
    createdAt: '2024-04-20'
  }
];

export const useMarketStore = create<MarketState>(persist((set, get) => ({
  cropPrices: mockCropPrices,
  listings: mockListings,
  insights: [],
  insightsSource: undefined,
  insightsStatus: 'idle',
  insightsError: undefined,
  listingsStatus: 'idle',
  listingsError: undefined,
  page: 1,
  limit: 12,
  totalPages: 1,
  totalListings: 0,
  userListings: [],
  wishlist: [],
  orders: [],
  cart: [],

  addToCart: (listing, quantity) => {
    const { cart } = get();
    const existingItem = cart.find(item => item.listingId === listing.id);

    if (existingItem) {
      set({
        cart: cart.map(item =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      });
    } else {
      set({
        cart: [...cart, {
          id: `${Date.now()}`,
          listingId: listing.id,
          listing,
          quantity
        }]
      });
    }
  },

  updateCartItemQuantity: (id, quantity) => {
    const { cart } = get();
    if (quantity <= 0) {
      set({ cart: cart.filter(item => item.id !== id) });
    } else {
      set({
        cart: cart.map(item =>
          item.id === id ? { ...item, quantity } : item
        )
      });
    }
  },

  updateCartItemAddress: (id, address) => {
    const { cart } = get();
    set({
      cart: cart.map(item =>
        item.id === id ? { ...item, shippingAddress: address } : item
      )
    });
  },

  removeFromCart: (id) => {
    const { cart } = get();
    set({ cart: cart.filter(item => item.id !== id) });
  },

  clearCart: () => {
    set({ cart: [] });
  },

  createOrder: (order) => {
    const { orders } = get();
    const newOrder: Order = {
      ...order,
      id: `${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    set({ orders: [newOrder, ...orders] });
  },

  fetchCropPrices: () => {
    set({ cropPrices: mockCropPrices });
  },

  fetchInsights: async () => {
    set({ insightsStatus: 'loading', insightsError: undefined });

    try {
      const response = await fetchLiveMarketInsights();
      set({
        insights: response.insights || [],
        insightsSource: response.source,
        insightsStatus: 'ready',
        insightsError: undefined,
      });
    } catch (error) {
      set({
        insights: [],
        insightsStatus: 'error',
        insightsError: 'Live market insights are unavailable right now. Please try again shortly.',
      });
    }
  },

  fetchListings: async (filters) => {
    const { userListings, page: currentPage, limit: currentLimit } = get();
    set({ listingsStatus: 'loading', listingsError: undefined });

    let backendListings: CropListing[] = [];
    try {
      const response = await fetchBackendListings({
        category: filters?.category || 'crop',
        q: filters?.cropName,
        location: filters?.location,
        minPrice: filters?.minPrice,
        maxPrice: filters?.maxPrice,
        minRating: filters?.minRating,
        sortBy: filters?.sortBy,
        page: filters?.page || currentPage,
        limit: filters?.limit || currentLimit,
        userLocation: filters?.location,
      });
      backendListings = response.listings.map((listing: BackendListingResponse) => {
        const owner = typeof listing.ownerId === 'string' ? null : listing.ownerId;
        const metadata = listing.metadata || {};
        const farmerName = owner?.username || String(metadata['ownerName'] || 'Farmer');

        return {
          id: listing._id,
          farmerId: owner?._id || String(listing.ownerId),
          farmerName,
          farmerAvatar: createAvatarUrl(farmerName),
          isVerifiedSeller: owner?.verificationStatus === 'verified',
          cropName: String(listing.productName || listing.title || 'Product'),
          category: listing.category,
          variety: String(metadata['variety'] || 'Standard'),
          quantity: Number(listing.quantity || 1),
          quantityUnit: listing.unit,
          pricePerUnit: Number(listing.pricePerUnit || 0),
          minOrderQuantity: Number(metadata['minOrderQuantity'] || 1),
          quality: String(metadata['quality'] || 'Standard'),
          isOrganic: Boolean(metadata['isOrganic'] || false),
          harvestDate: listing.createdAt,
          expiryDate: new Date(new Date(listing.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          images: listing.media && listing.media.length > 0
            ? listing.media
            : ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400'],
          description: listing.description || '',
          location: listing.location,
          rating: Number(metadata['rating'] || 0),
          reviewCount: Number(metadata['reviewCount'] || 0),
          status: listing.status === 'inactive' ? 'expired' : listing.status,
          recommendedPrice: Number(listing.recommendedPrice || 0) || undefined,
          isBestDeal: Boolean(listing.isBestDeal),
          nearby: Boolean(listing.nearby),
          createdAt: listing.createdAt,
        } as CropListing;
      });

      set({
        page: response.pagination?.page || filters?.page || currentPage,
        limit: response.pagination?.limit || filters?.limit || currentLimit,
        totalPages: response.pagination?.totalPages || 1,
        totalListings: response.pagination?.total || backendListings.length,
      });
    } catch (error) {
      set({
        listingsStatus: 'error',
        listingsError: 'Unable to sync listings from server. Showing local data.',
      });
    }

    const backendIds = new Set(backendListings.map((listing) => listing.id));
    const localOnlyListings = userListings.filter((listing) => !backendIds.has(listing.id));

    let filtered = [...backendListings, ...localOnlyListings, ...mockListings.filter((mock) => !backendIds.has(mock.id))];

    // Remove duplicates by listing id while preserving first occurrence order.
    const seen = new Set<string>();
    filtered = filtered.filter((listing) => {
      if (seen.has(listing.id)) {
        return false;
      }
      seen.add(listing.id);
      return true;
    });

    if (filters) {
      if (filters.cropName) {
        filtered = filtered.filter(l =>
          l.cropName.toLowerCase().includes(filters.cropName.toLowerCase())
        );
      }
      if (filters.location) {
        filtered = filtered.filter(l =>
          l.location.toLowerCase().includes(filters.location.toLowerCase())
        );
      }
      if (filters.isOrganic !== undefined) {
        filtered = filtered.filter(l => l.isOrganic === filters.isOrganic);
      }
      if (filters.minPrice) {
        filtered = filtered.filter(l => l.pricePerUnit >= filters.minPrice);
      }
      if (filters.maxPrice) {
        filtered = filtered.filter(l => l.pricePerUnit <= filters.maxPrice);
      }
      if (filters.minRating) {
        filtered = filtered.filter(l => l.rating >= filters.minRating);
      }

      if (filters.sortBy === 'priceAsc') {
        filtered = [...filtered].sort((a, b) => a.pricePerUnit - b.pricePerUnit);
      } else if (filters.sortBy === 'priceDesc') {
        filtered = [...filtered].sort((a, b) => b.pricePerUnit - a.pricePerUnit);
      } else if (filters.sortBy === 'ratingDesc') {
        filtered = [...filtered].sort((a, b) => b.rating - a.rating);
      } else {
        filtered = [...filtered].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    }

    set({ listings: filtered, listingsStatus: 'ready' });
  },

  fetchMyListings: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      set({ userListings: [] });
      return;
    }

    try {
      const response = await fetchMyBackendListings();

      const mine = response.listings
        .filter((listing) => {
          const owner = typeof listing.ownerId === 'string' ? listing.ownerId : listing.ownerId?._id;
          return owner === userId;
        })
        .map((listing) => {
          const owner = typeof listing.ownerId === 'string' ? null : listing.ownerId;
          const metadata = listing.metadata || {};
          const farmerName = owner?.username || 'Farmer';

          return {
            id: listing._id,
            farmerId: owner?._id || String(listing.ownerId),
            farmerName,
            farmerAvatar: createAvatarUrl(farmerName),
            cropName: String(listing.productName || listing.title || 'Product'),
            category: listing.category,
            variety: String(metadata['variety'] || 'Standard'),
            quantity: Number(listing.quantity || 1),
            quantityUnit: listing.unit,
            pricePerUnit: Number(listing.pricePerUnit || 0),
            minOrderQuantity: Number(metadata['minOrderQuantity'] || 1),
            quality: String(metadata['quality'] || 'Standard'),
            isOrganic: Boolean(metadata['isOrganic'] || false),
            harvestDate: listing.createdAt,
            expiryDate: new Date(new Date(listing.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            images: listing.media && listing.media.length > 0
              ? listing.media
              : ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400'],
            description: listing.description || '',
            location: listing.location,
            rating: Number(metadata['rating'] || 0),
            reviewCount: Number(metadata['reviewCount'] || 0),
            status: listing.status === 'inactive' ? 'expired' : listing.status,
            recommendedPrice: Number(listing.recommendedPrice || 0) || undefined,
            isBestDeal: Boolean(listing.isBestDeal),
            nearby: Boolean(listing.nearby),
            createdAt: listing.createdAt,
          } as CropListing;
        });

      set({ userListings: mine });
    } catch (error) {
      // Keep local state if backend fetch fails.
    }
  },

  setPage: (page) => {
    const safePage = Math.max(1, Math.floor(page));
    set({ page: safePage });
  },

  addListing: (listing) => {
    const { listings, userListings } = get();
    const newListing: CropListing = {
      ...listing,
      id: (listing as any).id || `${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    set({
      listings: [newListing, ...listings],
      userListings: [newListing, ...userListings]
    });
  },

  updateListing: async (id, data) => {
    if (id.length === 24) {
      try {
        await updateBackendListing(id, {
          productName: data.cropName,
          pricePerUnit: data.pricePerUnit,
          location: data.location,
          quantity: data.quantity,
          unit: data.quantityUnit,
          description: data.description,
          image: data.images?.[0],
          metadata: {
            variety: data.variety,
            quality: data.quality,
            minOrderQuantity: data.minOrderQuantity,
            isOrganic: data.isOrganic,
            rating: data.rating,
            reviewCount: data.reviewCount,
          },
        });
      } catch (error) {
        // Apply local update for demo continuity.
      }
    }

    const { listings, userListings } = get();
    set({
      listings: listings.map(l => l.id === id ? { ...l, ...data } : l),
      userListings: userListings.map(l => l.id === id ? { ...l, ...data } : l)
    });
  },

  deleteListing: async (id) => {
    if (id.length === 24) {
      try {
        await deleteBackendListing(id);
      } catch (error) {
        // Continue with local cleanup.
      }
    }

    const { listings, userListings } = get();
    set({
      listings: listings.filter(l => l.id !== id),
      userListings: userListings.filter(l => l.id !== id)
    });
  },

  markListingAsSold: async (id) => {
    if (id.length === 24) {
      try {
        await updateBackendListingStatus(id, 'sold');
      } catch (error) {
        // Continue with optimistic UI update.
      }
    }

    const { listings, userListings } = get();
    set({
      listings: listings.map((listing) => (listing.id === id ? { ...listing, status: 'sold' } : listing)),
      userListings: userListings.map((listing) => (listing.id === id ? { ...listing, status: 'sold' } : listing)),
    });
  },

  addToWishlist: (id) => {
    const { wishlist } = get();
    if (!wishlist.includes(id)) {
      set({ wishlist: [...wishlist, id] });
    }
  },

  removeFromWishlist: (id) => {
    const { wishlist } = get();
    set({ wishlist: wishlist.filter(w => w !== id) });
  },

  getPricePrediction: (cropName: string) => {
    const { cropPrices } = get();
    return cropPrices.find(c => c.cropName.toLowerCase() === cropName.toLowerCase())?.prediction;
  }
}), { name: 'market-storage' }));
