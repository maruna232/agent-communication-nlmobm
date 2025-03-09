import { create } from 'zustand'; // ^4.4.0
import { persist } from 'zustand/middleware'; // ^4.4.0
import { createJSONStorage } from 'zustand/middleware'; // ^4.4.0

import {
  INotification,
  INotificationCreateOptions,
  IApprovalNotificationOptions,
  INotificationPreferences,
  notificationService,
} from '../services/notification.service';
import {
  MESSAGE_PRIORITY,
  APPROVAL_TYPES,
  APPROVAL_STATUS,
} from '../lib/constants';
import { useAuthStore } from './authStore';

/**
 * Defines the structure of the notification store slice
 */
interface NotificationSlice {
  notifications: INotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  setNotifications: (notifications: INotification[]) => void;
  addNotification: (notification: INotification) => void;
  updateNotification: (id: string, updates: Partial<INotification>) => void;
  removeNotification: (id: string) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Defines the structure of the notification actions slice
 */
interface NotificationActionsSlice {
  initialize: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  createNotification: (options: INotificationCreateOptions) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  createApprovalNotification: (options: IApprovalNotificationOptions) => Promise<void>;
  updateApprovalStatus: (id: string, status: string, responseData?: object) => Promise<void>;
  loadPendingApprovals: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  pruneExpiredNotifications: () => Promise<void>;
}

/**
 * Defines the structure of the notification preferences slice
 */
interface PreferencesSlice {
  preferences: INotificationPreferences;
  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<INotificationPreferences>) => Promise<void>;
  toggleNotifications: (enabled: boolean) => Promise<void>;
  toggleToastNotifications: (toastNotifications: boolean) => Promise<void>;
  setMinimumPriority: (minimumPriority: string) => Promise<void>;
  toggleDoNotDisturb: (doNotDisturb: boolean) => Promise<void>;
  setRetentionDays: (retentionDays: number) => Promise<void>;
}

/**
 * Defines the complete notification store
 */
type NotificationStore = NotificationSlice & NotificationActionsSlice & PreferencesSlice;

/**
 * Returns the initial notification state
 * @returns Initial notification state
 */
const getInitialState = () => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  preferences: getDefaultPreferences(),
});

/**
 * Returns the default notification preferences
 * @returns Default notification preferences
 */
const getDefaultPreferences = (): INotificationPreferences => ({
  enabled: true,
  toastNotifications: true,
  minimumPriority: MESSAGE_PRIORITY.NORMAL,
  doNotDisturb: false,
  retentionDays: 30,
});

/**
 * Creates a slice of the notification store related to notification state and operations
 * @param set Zustand set function
 * @param get Zustand get function
 * @returns Notification state slice with actions
 */
const createNotificationSlice = (set: any, get: any): NotificationSlice => ({
  ...getInitialState(),
  setNotifications: (notifications: INotification[]) => set({ notifications }),
  addNotification: (notification: INotification) =>
    set((state: NotificationSlice) => ({
      notifications: [notification, ...state.notifications],
    })),
  updateNotification: (id: string, updates: Partial<INotification>) =>
    set((state: NotificationSlice) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, ...updates } : notification
      ),
    })),
  removeNotification: (id: string) =>
    set((state: NotificationSlice) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),
  setUnreadCount: (count: number) => set({ unreadCount: count }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
});

/**
 * Creates a slice of the notification store related to notification actions
 * @param set Zustand set function
 * @param get Zustand get function
 * @returns Notification actions slice
 */
const createNotificationActionsSlice = (set: any, get: any): NotificationActionsSlice => ({
  initialize: async () => {
    // Initialization logic (e.g., setting up listeners) can be added here
  },
  loadNotifications: async () => {
    try {
      set({ loading: true, error: null });
      const notifications = await notificationService.getNotifications();
      set({ notifications, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  createNotification: async (options: INotificationCreateOptions) => {
    try {
      set({ loading: true, error: null });
      const notification = await notificationService.createNotification(options);
      set((state: NotificationSlice) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  markAsRead: async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      set((state: NotificationSlice) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === id ? { ...notification, read: true, readAt: Date.now() } : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      set((state: NotificationSlice) => ({
        notifications: state.notifications.map((notification) => ({
          ...notification,
          read: true,
          readAt: Date.now(),
        })),
        unreadCount: 0,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  deleteNotification: async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      set((state: NotificationSlice) => ({
        notifications: state.notifications.filter((notification) => notification.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  clearAllNotifications: async () => {
    try {
      await notificationService.clearAllNotifications();
      set({ notifications: [], unreadCount: 0 });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  createApprovalNotification: async (options: IApprovalNotificationOptions) => {
    try {
      set({ loading: true, error: null });
      const notification = await notificationService.createApprovalNotification(options);
      set((state: NotificationSlice) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  updateApprovalStatus: async (id: string, status: string, responseData?: object) => {
    try {
      await notificationService.updateApprovalStatus(id, status, responseData);
      set((state: NotificationSlice) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === id ? { ...notification, approvalStatus: status } : notification
        ),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  loadPendingApprovals: async () => {
    try {
      set({ loading: true, error: null });
      const pendingApprovals = await notificationService.getPendingApprovals();
      set({
        notifications: pendingApprovals,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  refreshUnreadCount: async () => {
    try {
      const unreadCount = await notificationService.getUnreadCount();
      set({ unreadCount });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  pruneExpiredNotifications: async () => {
    try {
      const removedCount = await notificationService.pruneExpired();
      set((state: NotificationSlice) => ({
        notifications: state.notifications.filter((notification) => notification.expiresAt === null || notification.expiresAt > Date.now()),
      }));
      console.log(`Pruned ${removedCount} expired notifications`);
    } catch (error: any) {
      set({ error: error.message });
    }
  },
});

/**
 * Creates a slice of the notification store related to notification preferences
 * @param set Zustand set function
 * @param get Zustand get function
 * @returns Notification preferences slice
 */
const createPreferencesSlice = (set: any, get: any): PreferencesSlice => ({
  preferences: getDefaultPreferences(),
  loadPreferences: async () => {
    try {
      const preferences = await notificationService.getPreferences();
      set({ preferences });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  updatePreferences: async (updates: Partial<INotificationPreferences>) => {
    try {
      const preferences = await notificationService.updatePreferences(updates);
      set({ preferences });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  toggleNotifications: async (enabled: boolean) => {
    try {
      await notificationService.updatePreferences({ enabled });
      set((state: PreferencesSlice) => ({
        preferences: { ...state.preferences, enabled },
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  toggleToastNotifications: async (toastNotifications: boolean) => {
    try {
      await notificationService.updatePreferences({ toastNotifications });
      set((state: PreferencesSlice) => ({
        preferences: { ...state.preferences, toastNotifications },
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  setMinimumPriority: async (minimumPriority: string) => {
    try {
      await notificationService.updatePreferences({ minimumPriority });
      set((state: PreferencesSlice) => ({
        preferences: { ...state.preferences, minimumPriority },
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  toggleDoNotDisturb: async (doNotDisturb: boolean) => {
    try {
      await notificationService.updatePreferences({ doNotDisturb });
      set((state: PreferencesSlice) => ({
        preferences: { ...state.preferences, doNotDisturb },
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  setRetentionDays: async (retentionDays: number) => {
    try {
      await notificationService.updatePreferences({ retentionDays });
      set((state: PreferencesSlice) => ({
        preferences: { ...state.preferences, retentionDays },
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
});

/**
 * Global state store for notification management
 */
export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      ...createNotificationSlice(set, get),
      ...createNotificationActionsSlice(set, get),
      ...createPreferencesSlice(set, get),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        preferences: state.preferences,
      }),
    }
  )
);