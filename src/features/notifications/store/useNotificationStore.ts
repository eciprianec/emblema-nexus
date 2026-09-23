import { create } from 'zustand';
import { NotificationItem } from '../types';

interface NotificationState {
  notifications: NotificationItem[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: () => number;
}

const getInitialNotifications = (): NotificationItem[] => [];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: getInitialNotifications(),
  markAsRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },
  unreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },
}));
