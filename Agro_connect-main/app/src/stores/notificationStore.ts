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
  fetchNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Fire Alert Detected',
    message: 'Unusual heat signature detected in Sector B of your farm. Please check immediately.',
    type: 'alert',
    category: 'farm',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    actionUrl: '/farm-health'
  },
  {
    id: '2',
    title: 'Wheat Price Increased',
    message: 'Wheat prices have increased by 8% in your region. Good time to sell!',
    type: 'success',
    category: 'market',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: '3',
    title: 'New Tool Booking Request',
    message: 'Ramesh Patel wants to rent your Tractor from March 15-20.',
    type: 'info',
    category: 'tools',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: '4',
    title: 'PM-KISAN Scheme Update',
    message: 'New installment of PM-KISAN has been released. Check your eligibility.',
    type: 'info',
    category: 'scheme',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: '5',
    title: 'Disease Risk Warning',
    message: 'High humidity levels may cause fungal diseases in your rice crop. Take preventive measures.',
    type: 'warning',
    category: 'farm',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
  }
];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: mockNotifications,
  unreadCount: mockNotifications.filter(n => !n.isRead).length,

  fetchNotifications: () => {
    // Simulate API call
    set({ 
      notifications: mockNotifications,
      unreadCount: mockNotifications.filter(n => !n.isRead).length
    });
  },

  markAsRead: (id: string) => {
    const { notifications } = get();
    const updated = notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    set({ 
      notifications: updated,
      unreadCount: updated.filter(n => !n.isRead).length
    });
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    set({ 
      notifications: updated,
      unreadCount: 0
    });
  },

  addNotification: (notification) => {
    const { notifications } = get();
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    set({ 
      notifications: [newNotification, ...notifications],
      unreadCount: get().unreadCount + 1
    });
  },

  removeNotification: (id: string) => {
    const { notifications } = get();
    const updated = notifications.filter(n => n.id !== id);
    set({ 
      notifications: updated,
      unreadCount: updated.filter(n => !n.isRead).length
    });
  }
}));
