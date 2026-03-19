import { apiRequest } from '../services/apiClient';
import { useAuthStore } from './authStore';
import { create } from './zustand-mock';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'alert';
  category: 'farm' | 'market' | 'tools' | 'chat' | 'scheme' | 'system';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  addNotificationFromServer: (notification: Partial<Notification> & { id?: string; _id?: string }) => void;
  removeNotification: (id: string) => Promise<void>;
}

const normalize = (raw: any): Notification => ({
  id: String(raw?.id || raw?._id || Date.now()),
  title: String(raw?.title || 'Notification'),
  message: String(raw?.message || ''),
  type: raw?.type || 'info',
  category: raw?.category || 'system',
  isRead: Boolean(raw?.isRead),
  createdAt: raw?.createdAt || new Date().toISOString(),
  actionUrl: raw?.actionUrl,
});

const withUnreadCount = (notifications: Notification[]) => ({
  notifications,
  unreadCount: notifications.filter((item) => !item.isRead).length,
});

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ notifications: [], unreadCount: 0 });
      return;
    }

    try {
      const data = await apiRequest<{ notifications: any[] }>('/api/notifications', { token });
      const normalized = (data.notifications || []).map((item) => normalize(item));
      set(withUnreadCount(normalized));
    } catch (error) {
      // Keep current state when fetch fails to avoid wiping UI context.
    }
  },

  markAsRead: async (id: string) => {
    const token = useAuthStore.getState().token;
    const { notifications } = get();
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));

    set(withUnreadCount(updated));

    if (!token) {
      return;
    }

    try {
      await apiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
        token,
      });
    } catch (error) {
      // Ignore API failures after optimistic update.
    }
  },

  markAllAsRead: async () => {
    const token = useAuthStore.getState().token;
    const { notifications } = get();
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    set(withUnreadCount(updated));

    if (!token) {
      return;
    }

    try {
      await apiRequest('/api/notifications/read-all', {
        method: 'PATCH',
        token,
      });
    } catch (error) {
      // Ignore API failures after optimistic update.
    }
  },

  addNotification: (notification) => {
    const { notifications } = get();
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    set(withUnreadCount([newNotification, ...notifications]));
  },

  addNotificationFromServer: (notification) => {
    const next = normalize(notification);
    const { notifications } = get();
    const existingIndex = notifications.findIndex((item) => item.id === next.id);

    if (existingIndex >= 0) {
      const updated = [...notifications];
      updated[existingIndex] = { ...updated[existingIndex], ...next };
      set(withUnreadCount(updated));
      return;
    }

    set(withUnreadCount([next, ...notifications]));
  },

  removeNotification: async (id: string) => {
    const token = useAuthStore.getState().token;
    const { notifications } = get();
    const updated = notifications.filter((n) => n.id !== id);

    set(withUnreadCount(updated));

    if (!token) {
      return;
    }

    try {
      await apiRequest(`/api/notifications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        token,
      });
    } catch (error) {
      // Ignore API failures after optimistic update.
    }
  },
}));
