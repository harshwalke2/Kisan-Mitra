import { create, persist } from './zustand-mock';
import { createAvatarUrl } from '../services/apiClient';
import { fetchBackendListings, type BackendListingResponse } from '../services/socialFeatureService';

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
  userListings: CropListing[];
  wishlist: string[];
  orders: Order[];
  cart: CartItem[];
  fetchCropPrices: () => void;
  fetchListings: (filters?: {
    cropName?: string;
    location?: string;
    isOrganic?: boolean;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy?: 'newest' | 'priceAsc' | 'priceDesc' | 'ratingDesc';
  }) => Promise<void>;
  addListing: (listing: Omit<CropListing, 'id' | 'createdAt'> & Partial<Pick<CropListing, 'id'>>) => void;
  updateListing: (id: string, data: Partial<CropListing>) => void;
  deleteListing: (id: string) => void;
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

const mockInsights: MarketInsight[] = [
  {
    id: '1',
    title: 'Wheat Prices Expected to Rise',
    description: 'Due to lower production estimates, wheat prices are expected to increase by 10-15% in the coming months.',
    category: 'Price Alert',
    impact: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: '2',
    title: 'High Demand for Organic Produce',
    description: 'Consumer preference for organic crops has increased by 35% this quarter.',
    category: 'Demand Trend',
    impact: 'medium',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  }
];

export const useMarketStore = create<MarketState>(persist((set, get) => ({
  cropPrices: mockCropPrices,
  listings: mockListings,
  insights: mockInsights,
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

  fetchListings: async (filters) => {
    const { userListings } = get();

    let backendListings: CropListing[] = [];
    try {
      const response = await fetchBackendListings({
        category: 'crop',
        q: filters?.cropName,
        location: filters?.location,
        minPrice: filters?.minPrice,
        maxPrice: filters?.maxPrice,
        minRating: filters?.minRating,
        sortBy: filters?.sortBy,
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
          cropName: listing.title,
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
          createdAt: listing.createdAt,
        } as CropListing;
      });
    } catch (error) {
      // Fall back to local/mock listings when backend is not reachable.
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

    set({ listings: filtered });
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

  updateListing: (id, data) => {
    const { listings, userListings } = get();
    set({
      listings: listings.map(l => l.id === id ? { ...l, ...data } : l),
      userListings: userListings.map(l => l.id === id ? { ...l, ...data } : l)
    });
  },

  deleteListing: (id) => {
    const { listings, userListings } = get();
    set({
      listings: listings.filter(l => l.id !== id),
      userListings: userListings.filter(l => l.id !== id)
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
