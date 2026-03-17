import { create } from './zustand-mock';

export interface GovernmentScheme {
  id: string;
  title: string;
  description: string;
  category: string;
  eligibility: string[];
  benefits: string[];
  documents: string[];
  applicationProcess: string;
  deadline?: string;
  state: string;
  centralOrState: 'central' | 'state';
  officialLink: string;
  image?: string;
  createdAt: string;
  isActive: boolean;
}

export interface SchemeApplication {
  id: string;
  schemeId: string;
  schemeName: string;
  farmerId: string;
  farmerName: string;
  status: 'draft' | 'submitted' | 'under-review' | 'approved' | 'rejected';
  submittedAt?: string;
  documents: string[];
  remarks?: string;
}

interface SchemesState {
  schemes: GovernmentScheme[];
  bookmarkedSchemes: string[];
  myApplications: SchemeApplication[];
  fetchSchemes: (filters?: any) => void;
  bookmarkScheme: (id: string) => void;
  removeBookmark: (id: string) => void;
  applyForScheme: (schemeId: string, documents: string[]) => void;
  addScheme: (scheme: Omit<GovernmentScheme, 'id' | 'createdAt'>) => void;
  updateScheme: (id: string, data: Partial<GovernmentScheme>) => void;
  deleteScheme: (id: string) => void;
}

const mockSchemes: GovernmentScheme[] = [
  {
    id: '1',
    title: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    description: 'Income support of Rs. 6000 per year in three equal installments to all land holding farmer families.',
    category: 'Income Support',
    eligibility: [
      'Small and marginal farmers with cultivable land',
      'Landholding up to 2 hectares',
      'Valid bank account linked with Aadhaar'
    ],
    benefits: [
      'Rs. 6000 per year direct benefit transfer',
      'Three installments of Rs. 2000 each',
      'Direct transfer to bank account'
    ],
    documents: [
      'Aadhaar Card',
      'Land Records',
      'Bank Account Details',
      'Passport Size Photo'
    ],
    applicationProcess: 'Register online at PM-KISAN portal or visit nearest CSC center. Fill the form with land details and bank information.',
    state: 'All India',
    centralOrState: 'central',
    officialLink: 'https://pmkisan.gov.in',
    image: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400',
    createdAt: '2024-01-01',
    isActive: true
  },
  {
    id: '2',
    title: 'Soil Health Card Scheme',
    description: 'Free soil testing and recommendation of nutrients and fertilizers based on soil health.',
    category: 'Soil Health',
    eligibility: [
      'All farmers with cultivable land',
      'No land size restriction'
    ],
    benefits: [
      'Free soil testing',
      'Customized fertilizer recommendations',
      'Improved crop yield',
      'Reduced input costs'
    ],
    documents: [
      'Land Records',
      'Identity Proof',
      'Soil Sample'
    ],
    applicationProcess: 'Contact your nearest agriculture department office or Krishi Vigyan Kendra for soil sample collection.',
    state: 'All India',
    centralOrState: 'central',
    officialLink: 'https://soilhealth.dac.gov.in',
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400',
    createdAt: '2024-01-15',
    isActive: true
  },
  {
    id: '3',
    title: 'Maharashtra Farm Loan Waiver',
    description: 'Loan waiver scheme for farmers in Maharashtra with outstanding crop loans.',
    category: 'Loan Waiver',
    eligibility: [
      'Farmers with crop loans up to Rs. 2 lakhs',
      'Defaulting farmers from 2015-2018',
      'Maharashtra residents only'
    ],
    benefits: [
      'Complete waiver of crop loans',
      'Fresh loan eligibility',
      'Improved credit score'
    ],
    documents: [
      'Loan Account Details',
      'Aadhaar Card',
      'Domicile Certificate',
      'Land Records'
    ],
    applicationProcess: 'Apply through designated banks or online portal. Submit required documents for verification.',
    deadline: '2024-12-31',
    state: 'Maharashtra',
    centralOrState: 'state',
    officialLink: 'https://maharashtra.gov.in',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400',
    createdAt: '2024-02-01',
    isActive: true
  },
  {
    id: '4',
    title: 'Kisan Credit Card (KCC)',
    description: 'Easy credit access for farmers at subsidized interest rates for agricultural needs.',
    category: 'Credit Facility',
    eligibility: [
      'Individual farmers',
      'Tenant farmers',
      'Share croppers',
      'Self-help groups'
    ],
    benefits: [
      'Credit up to Rs. 3 lakhs at 7% interest',
      '3% interest subvention for timely repayment',
      'No collateral required up to Rs. 1.6 lakhs',
      'Insurance coverage included'
    ],
    documents: [
      'Identity Proof',
      'Land Records',
      'Passport Photo',
      'Bank Account Details'
    ],
    applicationProcess: 'Apply at any nationalized bank or regional rural bank. Fill KCC application form with land and crop details.',
    state: 'All India',
    centralOrState: 'central',
    officialLink: 'https://www.nabard.org',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
    createdAt: '2024-02-15',
    isActive: true
  },
  {
    id: '5',
    title: 'Paramparagat Krishi Vikas Yojana (PKVY)',
    description: 'Promotes organic farming through cluster-based approach with financial assistance.',
    category: 'Organic Farming',
    eligibility: [
      'Farmers willing to adopt organic farming',
      'Minimum 50 farmers per cluster',
      'Total area of 50 acres or more'
    ],
    benefits: [
      'Financial assistance of Rs. 50,000 per hectare',
      'Training on organic farming practices',
      'Certification support',
      'Market linkage assistance'
    ],
    documents: [
      'Land Records',
      'Group Formation Documents',
      'Bank Account Details',
      'Identity Proof'
    ],
    applicationProcess: 'Form a group of 50+ farmers and apply through State Agriculture Department or Krishi Vigyan Kendra.',
    state: 'All India',
    centralOrState: 'central',
    officialLink: 'https://pgsindia-ncof.gov.in',
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400',
    createdAt: '2024-03-01',
    isActive: true
  }
];

const mockApplications: SchemeApplication[] = [
  {
    id: '1',
    schemeId: '1',
    schemeName: 'PM-KISAN',
    farmerId: '1',
    farmerName: 'Rajesh Kumar',
    status: 'approved',
    submittedAt: '2024-01-15',
    documents: ['aadhaar.pdf', 'land_record.pdf']
  }
];

export const useSchemesStore = create<SchemesState>((set, get) => ({
  schemes: mockSchemes,
  bookmarkedSchemes: [],
  myApplications: mockApplications,

  fetchSchemes: (filters?: any) => {
    let filtered = [...mockSchemes];
    
    if (filters) {
      if (filters.state && filters.state !== 'All India') {
        filtered = filtered.filter(s => 
          s.state === filters.state || s.state === 'All India'
        );
      }
      if (filters.category) {
        filtered = filtered.filter(s => s.category === filters.category);
      }
      if (filters.centralOrState) {
        filtered = filtered.filter(s => s.centralOrState === filters.centralOrState);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(s => 
          s.title.toLowerCase().includes(search) ||
          s.description.toLowerCase().includes(search)
        );
      }
    }
    
    set({ schemes: filtered });
  },

  bookmarkScheme: (id: string) => {
    const { bookmarkedSchemes } = get();
    if (!bookmarkedSchemes.includes(id)) {
      set({ bookmarkedSchemes: [...bookmarkedSchemes, id] });
    }
  },

  removeBookmark: (id: string) => {
    const { bookmarkedSchemes } = get();
    set({ bookmarkedSchemes: bookmarkedSchemes.filter(b => b !== id) });
  },

  applyForScheme: (schemeId: string, documents: string[]) => {
    const { myApplications, schemes } = get();
    const scheme = schemes.find(s => s.id === schemeId);
    
    if (scheme) {
      const newApplication: SchemeApplication = {
        id: `${Date.now()}`,
        schemeId,
        schemeName: scheme.title,
        farmerId: '1',
        farmerName: 'Rajesh Kumar',
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        documents
      };
      
      set({ myApplications: [newApplication, ...myApplications] });
    }
  },

  addScheme: (scheme) => {
    const { schemes } = get();
    const newScheme: GovernmentScheme = {
      ...scheme,
      id: `${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    set({ schemes: [newScheme, ...schemes] });
  },

  updateScheme: (id, data) => {
    const { schemes } = get();
    set({
      schemes: schemes.map(s => s.id === id ? { ...s, ...data } : s)
    });
  },

  deleteScheme: (id) => {
    const { schemes } = get();
    set({ schemes: schemes.filter(s => s.id !== id) });
  }
}));
