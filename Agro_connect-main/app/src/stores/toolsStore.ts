import { create, persist } from './zustand-mock';

export interface Tool {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  ownerRating: number;
  name: string;
  category: string;
  description: string;
  images: string[];
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  securityDeposit: number;
  location: string;
  condition: 'new' | 'excellent' | 'good' | 'fair';
  availability: Array<{
    startDate: string;
    endDate: string;
    isBooked: boolean;
  }>;
  specifications: Record<string, string>;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface ToolBooking {
  id: string;
  toolId: string;
  toolName: string;
  borrowerId: string;
  borrowerName: string;
  lenderId: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  securityDeposit: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled';
  paymentStatus?: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface LandListing {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  images: string[];
  size: number;
  sizeUnit: string;
  soilType: string;
  location: string;
  monthlyRent: number;
  minLeasePeriod: number;
  maxLeasePeriod: number;
  facilities: string[];
  waterSource: string;
  isFenced: boolean;
  availability: Array<{
    startDate: string;
    endDate: string;
    isBooked: boolean;
  }>;
  rating: number;
  createdAt: string;
}

interface ToolsState {
  tools: Tool[];
  landListings: LandListing[];
  myTools: Tool[];
  myBookings: ToolBooking[];
  bookingRequests: ToolBooking[];
  fetchTools: (filters?: any) => void;
  fetchLandListings: (filters?: any) => void;
  addTool: (tool: Omit<Tool, 'id' | 'createdAt'> & Partial<Pick<Tool, 'id'>>) => void;
  updateTool: (id: string, data: Partial<Tool>) => void;
  deleteTool: (id: string) => void;
  requestBooking: (booking: Omit<ToolBooking, 'id' | 'createdAt'>) => void;
  respondToBooking: (id: string, status: 'approved' | 'rejected') => void;
  updateBooking: (id: string, data: Partial<ToolBooking>) => void;
  addLandListing: (land: Omit<LandListing, 'id' | 'createdAt'> & Partial<Pick<LandListing, 'id'>>) => void;
  removeToolFromListing: (id: string) => void;
  removeLandFromListing: (id: string) => void;
}

const mockTools: Tool[] = [
  {
    id: '1',
    ownerId: '1',
    ownerName: 'Rajesh Kumar',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rajesh',
    ownerRating: 4.8,
    name: 'Mahindra 575 DI Tractor',
    category: 'Tractor',
    description: 'Well-maintained 45 HP tractor with power steering. Ideal for all farming operations.',
    images: [
      'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=400'
    ],
    dailyRate: 1500,
    weeklyRate: 9000,
    monthlyRate: 35000,
    securityDeposit: 10000,
    location: 'Ludhiana, Punjab',
    condition: 'excellent',
    availability: [
      { startDate: '2024-03-01', endDate: '2024-03-31', isBooked: false },
      { startDate: '2024-04-01', endDate: '2024-04-30', isBooked: true }
    ],
    specifications: {
      'HP': '45',
      'Engine': '4-stroke',
      'Fuel Type': 'Diesel',
      'Year': '2021'
    },
    rating: 4.7,
    reviewCount: 15,
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    ownerId: '2',
    ownerName: 'Priya Sharma',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya',
    ownerRating: 4.9,
    name: 'Power Tiller',
    category: 'Tiller',
    description: 'Lightweight power tiller perfect for small farms and gardens.',
    images: [
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400'
    ],
    dailyRate: 500,
    weeklyRate: 3000,
    securityDeposit: 3000,
    location: 'Nashik, Maharashtra',
    condition: 'good',
    availability: [
      { startDate: '2024-03-01', endDate: '2024-12-31', isBooked: false }
    ],
    specifications: {
      'HP': '8',
      'Engine': '2-stroke',
      'Fuel Type': 'Petrol',
      'Weight': '85 kg'
    },
    rating: 4.3,
    reviewCount: 8,
    createdAt: '2024-02-01'
  },
  {
    id: '3',
    ownerId: '3',
    ownerName: 'Amit Patel',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amit',
    ownerRating: 4.7,
    name: 'Sprayer Pump',
    category: 'Sprayer',
    description: 'High-pressure sprayer pump for pesticides and fertilizers.',
    images: [
      'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=400'
    ],
    dailyRate: 300,
    weeklyRate: 1800,
    securityDeposit: 2000,
    location: 'Ahmedabad, Gujarat',
    condition: 'new',
    availability: [
      { startDate: '2024-03-01', endDate: '2024-12-31', isBooked: false }
    ],
    specifications: {
      'Capacity': '16L',
      'Pressure': '40 PSI',
      'Material': 'Stainless Steel'
    },
    rating: 4.8,
    reviewCount: 12,
    createdAt: '2024-02-15'
  }
];

const mockLandListings: LandListing[] = [
  {
    id: '1',
    ownerId: '6',
    ownerName: 'Vikram Rao',
    title: 'Fertile Agricultural Land',
    description: '5 acres of fertile land with excellent water supply. Suitable for all crops.',
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400'
    ],
    size: 5,
    sizeUnit: 'acres',
    soilType: 'Alluvial',
    location: 'Hyderabad, Telangana',
    monthlyRent: 15000,
    minLeasePeriod: 6,
    maxLeasePeriod: 36,
    facilities: ['Electricity', 'Road Access', 'Storage Shed'],
    waterSource: 'Borewell + Canal',
    isFenced: true,
    availability: [
      { startDate: '2024-04-01', endDate: '2024-12-31', isBooked: false }
    ],
    rating: 4.6,
    createdAt: '2024-01-20'
  }
];

const mockBookings: ToolBooking[] = [
  {
    id: '1',
    toolId: '1',
    toolName: 'Mahindra 575 DI Tractor',
    borrowerId: '2',
    borrowerName: 'Ramesh Patel',
    lenderId: '1',
    startDate: '2024-03-15',
    endDate: '2024-03-20',
    totalAmount: 7500,
    securityDeposit: 10000,
    status: 'pending',
    createdAt: '2024-03-01'
  }
];

export const useToolsStore = create<ToolsState>(persist((set, get) => ({
  tools: mockTools,
  landListings: mockLandListings,
  myTools: [],
  myBookings: [],
  bookingRequests: mockBookings,

  fetchTools: (filters?: any) => {
    const { myTools } = get();
    let filtered = [...mockTools, ...myTools];

    if (filters) {
      if (filters.category) {
        filtered = filtered.filter(t => t.category === filters.category);
      }
      if (filters.location) {
        filtered = filtered.filter(t =>
          t.location.toLowerCase().includes(filters.location.toLowerCase())
        );
      }
      if (filters.minPrice) {
        filtered = filtered.filter(t => t.dailyRate >= filters.minPrice);
      }
      if (filters.maxPrice) {
        filtered = filtered.filter(t => t.dailyRate <= filters.maxPrice);
      }
      if (filters.condition) {
        filtered = filtered.filter(t => t.condition === filters.condition);
      }
    }

    set({ tools: filtered });
  },

  fetchLandListings: (filters?: any) => {
    // Assuming land listings also need persistence of user added lands which might be stored in landListings directly if no separate userLandListings array exists.
    // However, looking at the state definition, there isn't a separate userLandListings array.
    // So if fetchLandListings resets to mockLandListings, we lose user added lands unless we persist landListings and merge or rethink the strategy.
    // The previous addLandListing adds to landListings directly.
    // So simply doing set({ landListings: filtered }) where filtered = [...mockLandListings] is destructive.
    // The persist middleware will restore landListings.
    // But then fetchLandListings will overwrite it.
    // A better approach if we don't have separate user array is to initialize only if empty, or filter the EXISTING state rather than resetting to mock.
    // But to support "reset filters", we need the source data.
    // Let's assume user additions are appended to mock data in memory.
    // We should probably filter existing listings if no filters applied? No, fetch usually implies getting data.
    // Since we don't have a separate userLandListings, let's look at how addLandListing works.
    // addLandListing adds to landListings.
    // If we want to persist user additions, we should probably check if landListings has more than mock.
    // But to be safe and consistent with tools, let's just use the persisted landListings if available, or merge.
    // Ideally add `myLandListings` to state, but I can't change interface easily without ensuring all usages match.
    // For now, let's filter based on the *current* list if it has data, or merge mock with current (deduplicating).
    // Actually, simplest fix for this specific bug is to NOT reset to mock if we have data, OR (better) filter the *persisted* list.
    // But wait, if I refresh page, persist restores `landListings`.
    // Then `useEffect` calls `fetchLandListings`.
    // Which does `filtered = [...mockLandListings]`.
    // And overwrites the restored data.
    // So I MUST merge user data.
    // Since I don't have `myLandListings` array, I have to assume any listing NOT in mockListings is user data.

    // Strategy: Filter out mock IDs from current state to get user items.
    const { landListings } = get();
    const userItems = landListings.filter(l => !mockLandListings.find(m => m.id === l.id));

    let filtered = [...mockLandListings, ...userItems];

    if (filters) {
      if (filters.soilType) {
        filtered = filtered.filter(l => l.soilType === filters.soilType);
      }
      if (filters.location) {
        filtered = filtered.filter(l =>
          l.location.toLowerCase().includes(filters.location.toLowerCase())
        );
      }
      if (filters.minSize) {
        filtered = filtered.filter(l => l.size >= filters.minSize);
      }
      if (filters.maxRent) {
        filtered = filtered.filter(l => l.monthlyRent <= filters.maxRent);
      }
    }

    set({ landListings: filtered });
  },

  addTool: (tool) => {
    const { tools, myTools } = get();
    const newTool: Tool = {
      ...tool,
      id: (tool as any).id || `${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    set({
      tools: [newTool, ...tools],
      myTools: [newTool, ...myTools]
    });
  },

  updateTool: (id, data) => {
    const { tools, myTools } = get();
    set({
      tools: tools.map(t => t.id === id ? { ...t, ...data } : t),
      myTools: myTools.map(t => t.id === id ? { ...t, ...data } : t)
    });
  },

  deleteTool: (id) => {
    const { tools, myTools } = get();
    set({
      tools: tools.filter(t => t.id !== id),
      myTools: myTools.filter(t => t.id !== id)
    });
  },

  requestBooking: (booking) => {
    const { myBookings, bookingRequests } = get();
    const newBooking: ToolBooking = {
      ...booking,
      id: `${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    set({
      myBookings: [newBooking, ...myBookings],
      bookingRequests: [newBooking, ...bookingRequests]
    });
  },

  respondToBooking: (id, status) => {
    const { bookingRequests } = get();
    set({
      bookingRequests: bookingRequests.map(b =>
        b.id === id ? { ...b, status } : b
      )
    });
  },

  updateBooking: (id, data) => {
    const { bookingRequests, myBookings } = get();
    set({
      bookingRequests: bookingRequests.map(b => b.id === id ? { ...b, ...data } : b),
      myBookings: myBookings.map(b => b.id === id ? { ...b, ...data } : b)
    });
  },

  addLandListing: (land) => {
    const { landListings } = get();
    const newLand: LandListing = {
      ...land,
      id: (land as any).id || `${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    set({ landListings: [newLand, ...landListings] });
  },

  removeToolFromListing: (id) => {
    const { tools } = get();
    set({ tools: tools.filter(t => t.id !== id) });
  },

  removeLandFromListing: (id) => {
    const { landListings } = get();
    set({ landListings: landListings.filter(l => l.id !== id) });
  }
}), { name: 'tools-storage' }));
