import { ApiError, apiRequest, createAvatarUrl } from '../services/apiClient';
import { create, persist } from './zustand-mock';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'farmer' | 'admin';
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationMethod?: 'aadhaar' | 'digilocker';
  aadhaarLast4?: string;
  digilockerLinked?: boolean;
  verificationSubmittedAt?: string;
  verifiedAt?: string;
  verificationRejectionReason?: string;
  phone?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  farmDetails?: {
    farmName: string;
    farmSize: number;
    crops: string[];
    soilType: string;
  };
  preferredLanguage: string;
  avatar?: string;
  followersCount?: number;
  followingCount?: number;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  isLoading: boolean;
  allUsers: User[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => void;
  updateProfile: (data: Partial<User>) => void;
  forgotPassword: (email: string) => Promise<ForgotPasswordResult>;
  resetPassword: (token: string, newPassword: string) => Promise<ResetPasswordResult>;
  switchUser: (userId: string) => void;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'farmer' | 'admin';
  farmName?: string;
  farmSize?: number;
  location?: string;
  preferredLanguage?: string;
}

type AuthResponse = {
  token: string;
  user: {
    _id: string;
    username: string;
    email: string;
    phone?: string;
    location?: string;
    farmName?: string;
    farmSize?: number;
    preferredLanguage?: string;
    role?: 'farmer' | 'admin';
    verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
    verificationMethod?: 'aadhaar' | 'digilocker';
    aadhaarLast4?: string;
    digilockerLinked?: boolean;
    verificationSubmittedAt?: string;
    verifiedAt?: string;
    verificationRejectionReason?: string;
    followersCount?: number;
    followingCount?: number;
    createdAt?: string;
  };
};

export type ForgotPasswordResult = {
  success: boolean;
  delivery?: 'email' | 'preview' | 'not-configured';
  message?: string;
  previewUrl?: string;
  devResetLink?: string;
  error?: string;
};

export type ResetPasswordResult = {
  success: boolean;
  message?: string;
  error?: string;
};

const normalizeUser = (user: AuthResponse['user'], previous?: User | null): User => ({
  id: user._id,
  name: user.username,
  username: user.username,
  email: user.email,
  role: user.role || previous?.role || 'farmer',
  verificationStatus: user.verificationStatus || previous?.verificationStatus || 'unverified',
  verificationMethod: user.verificationMethod || previous?.verificationMethod,
  aadhaarLast4: user.aadhaarLast4 || previous?.aadhaarLast4,
  digilockerLinked: user.digilockerLinked ?? previous?.digilockerLinked,
  verificationSubmittedAt: user.verificationSubmittedAt || previous?.verificationSubmittedAt,
  verifiedAt: user.verifiedAt || previous?.verifiedAt,
  verificationRejectionReason: user.verificationRejectionReason || previous?.verificationRejectionReason,
  phone: user.phone || previous?.phone,
  location: user.location
    ? {
        latitude: previous?.location?.latitude ?? 20.5937,
        longitude: previous?.location?.longitude ?? 78.9629,
        address: user.location,
      }
    : previous?.location,
  farmDetails: user.farmName
    ? {
        farmName: user.farmName,
        farmSize: user.farmSize || 0,
        crops: previous?.farmDetails?.crops || [],
        soilType: previous?.farmDetails?.soilType || 'Unknown',
      }
    : previous?.farmDetails,
  preferredLanguage: user.preferredLanguage || previous?.preferredLanguage || 'en',
  avatar: previous?.avatar || createAvatarUrl(user.username),
  followersCount: user.followersCount || 0,
  followingCount: user.followingCount || 0,
  createdAt: user.createdAt || previous?.createdAt || new Date().toISOString(),
});

const formatApiError = (error: unknown, fallback: string): string => {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  const detailObject = error.details as
    | {
        errors?: Array<{ field?: string; message?: string }>;
      }
    | undefined;

  if (detailObject?.errors?.length) {
    return detailObject.errors.map((item) => item.message).filter(Boolean).join(', ');
  }

  return error.message || fallback;
};

export const useAuthStore = create<AuthState>(
  persist(
    (set: any, get: any) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      isLoading: false,
      allUsers: [],

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const data = await apiRequest<AuthResponse>('/api/auth/login', {
            method: 'POST',
            body: { email, password },
          });

          set({
            user: normalizeUser(data.user, get().user),
            isAuthenticated: true,
            token: data.token,
            isLoading: false,
          });
          return true;
        } catch (error) {
          set({ isLoading: false });
          return false;
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true });
        try {
          const username = userData.name.trim();
          const location = userData.location?.trim();
          const farmName = userData.farmName?.trim();
          const phone = userData.phone?.trim();

          const payload: Record<string, unknown> = {
            username,
            email: userData.email.trim(),
            password: userData.password,
            preferredLanguage: userData.preferredLanguage || 'en',
            role: userData.role,
          };

          if (phone) payload.phone = phone;
          if (location) payload.location = location;
          if (farmName) payload.farmName = farmName;
          if (typeof userData.farmSize === 'number' && Number.isFinite(userData.farmSize) && userData.farmSize > 0) {
            payload.farmSize = userData.farmSize;
          }

          const data = await apiRequest<AuthResponse>('/api/auth/register', {
            method: 'POST',
            body: payload,
          });

          const normalizedUser = normalizeUser(data.user, {
            id: data.user._id,
            name: username,
            username,
            email: userData.email.trim(),
            role: userData.role,
            phone,
            location: location
              ? {
                  latitude: 20.5937,
                  longitude: 78.9629,
                  address: location,
                }
              : undefined,
            farmDetails: farmName
              ? {
                  farmName,
                  farmSize: userData.farmSize || 0,
                  crops: [],
                  soilType: 'Unknown',
                }
              : undefined,
            preferredLanguage: userData.preferredLanguage || 'en',
            avatar: createAvatarUrl(username),
            followersCount: data.user.followersCount || 0,
            followingCount: data.user.followingCount || 0,
            createdAt: data.user.createdAt || new Date().toISOString(),
          });

          set({
            user: normalizedUser,
            isAuthenticated: true,
            token: data.token,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: formatApiError(error, 'Registration failed. Please check your details and try again.'),
          };
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, token: null, allUsers: [] });
      },

      checkAuth: () => {
        const { token, user } = get();

        if (!token) {
          set({ user: null, isAuthenticated: false, allUsers: [] });
          return;
        }

        set({ isAuthenticated: true });

        void apiRequest<{ user: AuthResponse['user'] }>('/api/auth/me', { token })
          .then((data) => {
            set({
              user: normalizeUser(data.user, user),
              isAuthenticated: true,
            });
          })
          .catch(() => {
            set({ user: null, token: null, isAuthenticated: false, allUsers: [] });
          });
      },

      updateProfile: (data: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...data } });
        }
      },

      forgotPassword: async (email: string) => {
        try {
          const data = await apiRequest<{
            message?: string;
            delivery?: 'email' | 'preview' | 'not-configured';
            previewUrl?: string;
            devResetLink?: string;
          }>('/api/auth/forgot-password', {
            method: 'POST',
            body: { email },
          });

          return {
            success: true,
            delivery: data.delivery,
            message: data.message,
            previewUrl: data.previewUrl,
            devResetLink: data.devResetLink,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof ApiError ? error.message : 'Failed to send reset link',
          };
        }
      },

      resetPassword: async (token: string, newPassword: string) => {
        try {
          const data = await apiRequest<{ message?: string }>('/api/auth/reset-password', {
            method: 'POST',
            body: { token, newPassword },
          });
          return {
            success: true,
            message: data.message || 'Password reset successful',
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof ApiError ? error.message : 'Unable to reset password',
          };
        }
      },

      switchUser: (userId: string) => {
        console.warn('switchUser is no longer supported in the real auth flow', userId);
      }
    }),
    { name: 'auth-storage' }
  )
);
