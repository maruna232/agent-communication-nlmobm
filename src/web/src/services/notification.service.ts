import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { toast } from 'react-hot-toast'; // ^2.4.1

import { StorageService } from './storage.service';
import { 
  MESSAGE_PRIORITY, 
  APPROVAL_TYPES, 
  APPROVAL_STATUS,
  DB_STORE_NAMES
} from '../lib/constants';
import { createStorageError } from '../lib/utils/errorHandling';

// Define notification types
const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  APPROVAL: 'approval'
};

// Default notification preferences
const DEFAULT_NOTIFICATION_PREFERENCES = {
  enabled: true,
  toastNotifications: true,
  minimumPriority: 'NORMAL',
  doNotDisturb: false,
  retentionDays: 30
};

/**
 * Interface defining the structure of a notification
 */
export interface INotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  read: boolean;
  createdAt: number;
  readAt: number | null;
  expiresAt: number | null;
  data?: any;
  approvalType?: string | null;
  approvalStatus?: string | null;
  approvalData?: any;
}

/**
 * Interface defining options for creating a new notification
 */
export interface INotificationCreateOptions {
  title: string;
  message: string;
  type: string;
  priority: string;
  expiresIn?: number | null;
  data?: any;
}

/**
 * Interface defining options for creating an approval notification
 */
export interface IApprovalNotificationOptions {
  title: string;
  message: string;
  approvalType: string;
  approvalData: any;
  expiresIn?: number | null;
}

/**
 * Interface defining query parameters for retrieving notifications
 */
export interface INotificationQuery {
  type?: string | string[];
  priority?: string | string[];
  read?: boolean;
  approvalStatus?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Interface defining user preferences for notifications
 */
export interface INotificationPreferences {
  enabled: boolean;
  toastNotifications: boolean;
  minimumPriority: string;
  doNotDisturb: boolean;
  retentionDays: number;
}

/**
 * Service that provides comprehensive notification functionality for the application,
 * including in-app notifications, toast notifications, and approval requests.
 * All notification data is stored locally on the client device for privacy.
 */
class NotificationService {
  private storageService: StorageService | null = null;
  private userId: string | null = null;
  private preferences: INotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES;

  /**
   * Initializes the notification service with the storage service and user ID
   * @param storageService Storage service instance
   * @param userId User ID for filtering notifications
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(storageService: StorageService, userId: string): Promise<boolean> {
    try {
      if (!storageService.isInitialized()) {
        throw createStorageError(
          'Storage service is not initialized',
          { userId }
        );
      }

      this.storageService = storageService;
      this.userId = userId;

      // Ensure the notifications store exists
      const storeExists = await this.checkIfStoreExists(DB_STORE_NAMES.NOTIFICATIONS);
      if (!storeExists) {
        await this.createNotificationsStore();
      }

      // Load user preferences
      await this.loadPreferences();

      // Register service worker for push notifications if supported
      await this.registerServiceWorker();

      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  /**
   * Checks if a store exists in the database
   * @param storeName Store name to check
   * @returns Promise resolving to true if store exists
   */
  private async checkIfStoreExists(storeName: string): Promise<boolean> {
    try {
      // Attempt to query the store - if it doesn't exist, it will throw an error
      await this.storageService!.query({
        storeName,
        limit: 1
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Creates the notifications store in the database
   * @returns Promise resolving to success status
   */
  private async createNotificationsStore(): Promise<boolean> {
    // This would be handled by the schema initialization in StorageService
    // Just return true here as we assume the schema was created during initialization
    return true;
  }

  /**
   * Loads user notification preferences from storage
   */
  private async loadPreferences(): Promise<void> {
    try {
      const prefs = await this.getPreferences();
      if (prefs) {
        this.preferences = prefs;
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      // Use default preferences if loading fails
      this.preferences = DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  /**
   * Creates a new notification and stores it in the database
   * @param options Notification creation options
   * @returns Promise resolving to the created notification
   */
  async createNotification(options: INotificationCreateOptions): Promise<INotification> {
    if (!this.storageService || !this.userId) {
      throw createStorageError(
        'Notification service not initialized',
        { options }
      );
    }

    const id = uuidv4();
    const now = Date.now();

    const notification: INotification = {
      id,
      userId: this.userId,
      title: options.title,
      message: options.message,
      type: options.type,
      priority: options.priority,
      read: false,
      createdAt: now,
      readAt: null,
      expiresAt: options.expiresIn ? now + options.expiresIn : null,
      data: options.data || null
    };

    await this.storageService.create(DB_STORE_NAMES.NOTIFICATIONS, notification);

    // Show toast notification if appropriate
    this.showToast(notification);

    return notification;
  }

  /**
   * Retrieves notifications from the database with filtering
   * @param query Query parameters for filtering notifications
   * @returns Promise resolving to matching notifications
   */
  async getNotifications(query: INotificationQuery = {}): Promise<INotification[]> {
    if (!this.storageService || !this.userId) {
      throw createStorageError(
        'Notification service not initialized',
        { query }
      );
    }

    // Build storage query
    const storageQuery: any = {
      storeName: DB_STORE_NAMES.NOTIFICATIONS,
      filter: (item: INotification) => {
        // Always filter by user ID
        if (item.userId !== this.userId) {
          return false;
        }

        // Filter by type if specified
        if (query.type) {
          if (Array.isArray(query.type)) {
            if (!query.type.includes(item.type)) {
              return false;
            }
          } else if (item.type !== query.type) {
            return false;
          }
        }

        // Filter by priority if specified
        if (query.priority) {
          if (Array.isArray(query.priority)) {
            if (!query.priority.includes(item.priority)) {
              return false;
            }
          } else if (item.priority !== query.priority) {
            return false;
          }
        }

        // Filter by read status if specified
        if (query.read !== undefined && item.read !== query.read) {
          return false;
        }

        // Filter by approval status if specified
        if (query.approvalStatus && item.approvalStatus !== query.approvalStatus) {
          return false;
        }

        return true;
      }
    };

    // Add limit and offset if specified
    if (query.limit !== undefined) {
      storageQuery.limit = query.limit;
    }

    if (query.offset !== undefined) {
      storageQuery.offset = query.offset;
    }

    const notifications = await this.storageService.query(storageQuery);

    // Sort notifications if sorting is specified
    if (query.sortBy) {
      const direction = query.sortDirection === 'asc' ? 1 : -1;
      notifications.sort((a, b) => {
        if (a[query.sortBy!] < b[query.sortBy!]) return -1 * direction;
        if (a[query.sortBy!] > b[query.sortBy!]) return 1 * direction;
        return 0;
      });
    } else {
      // Default sort by creation time, newest first
      notifications.sort((a, b) => b.createdAt - a.createdAt);
    }

    return notifications;
  }

  /**
   * Updates an existing notification in the database
   * @param id Notification ID to update
   * @param updates Partial notification updates
   * @returns Promise resolving to the updated notification
   */
  async updateNotification(id: string, updates: Partial<INotification>): Promise<INotification> {
    if (!this.storageService || !this.userId) {
      throw createStorageError(
        'Notification service not initialized',
        { id, updates }
      );
    }

    const notification = await this.storageService.read(DB_STORE_NAMES.NOTIFICATIONS, id);
    if (!notification) {
      throw createStorageError(
        `Notification with ID ${id} not found`,
        { id, updates }
      );
    }

    // Verify the notification belongs to the current user
    if (notification.userId !== this.userId) {
      throw createStorageError(
        'Unauthorized access to notification',
        { id, userId: this.userId }
      );
    }

    // Update the notification
    const updatedNotification = {
      ...notification,
      ...updates
    };

    await this.storageService.update(DB_STORE_NAMES.NOTIFICATIONS, id, updatedNotification);
    return updatedNotification;
  }

  /**
   * Deletes a notification from the database
   * @param id Notification ID to delete
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteNotification(id: string): Promise<boolean> {
    if (!this.storageService || !this.userId) {
      throw createStorageError(
        'Notification service not initialized',
        { id }
      );
    }

    const notification = await this.storageService.read(DB_STORE_NAMES.NOTIFICATIONS, id);
    if (!notification) {
      throw createStorageError(
        `Notification with ID ${id} not found`,
        { id }
      );
    }

    // Verify the notification belongs to the current user
    if (notification.userId !== this.userId) {
      throw createStorageError(
        'Unauthorized access to notification',
        { id, userId: this.userId }
      );
    }

    await this.storageService.delete(DB_STORE_NAMES.NOTIFICATIONS, id);
    return true;
  }

  /**
   * Deletes all notifications for the current user
   * @returns Promise resolving to true if deletion was successful
   */
  async clearAllNotifications(): Promise<boolean> {
    if (!this.storageService || !this.userId) {
      throw createStorageError(
        'Notification service not initialized'
      );
    }

    const notifications = await this.getNotifications();
    
    for (const notification of notifications) {
      await this.storageService.delete(DB_STORE_NAMES.NOTIFICATIONS, notification.id);
    }

    return true;
  }

  /**
   * Marks a notification as read
   * @param id Notification ID to mark as read
   * @returns Promise resolving to the updated notification
   */
  async markAsRead(id: string): Promise<INotification> {
    return this.updateNotification(id, {
      read: true,
      readAt: Date.now()
    });
  }

  /**
   * Marks all unread notifications for the current user as read
   * @returns Promise resolving to the number of notifications updated
   */
  async markAllAsRead(): Promise<number> {
    if (!this.storageService || !this.userId) {
      throw createStorageError(
        'Notification service not initialized'
      );
    }

    const unreadNotifications = await this.getNotifications({ read: false });
    
    for (const notification of unreadNotifications) {
      await this.markAsRead(notification.id);
    }

    return unreadNotifications.length;
  }

  /**
   * Gets the count of unread notifications for the current user
   * @returns Promise resolving to the count of unread notifications
   */
  async getUnreadCount(): Promise<number> {
    const unreadNotifications = await this.getNotifications({ read: false });
    return unreadNotifications.length;
  }

  /**
   * Creates a special notification that requires user approval
   * @param options Approval notification options
   * @returns Promise resolving to the created approval notification
   */
  async createApprovalNotification(options: IApprovalNotificationOptions): Promise<INotification> {
    if (!this.storageService || !this.userId) {
      throw createStorageError(
        'Notification service not initialized',
        { options }
      );
    }

    // Determine appropriate priority based on approval type
    let priority = MESSAGE_PRIORITY.HIGH;
    if (options.approvalType === APPROVAL_TYPES.MEETING_PROPOSAL) {
      priority = MESSAGE_PRIORITY.URGENT;
    }

    const notification: INotification = {
      id: uuidv4(),
      userId: this.userId,
      title: options.title,
      message: options.message,
      type: NOTIFICATION_TYPES.APPROVAL,
      priority,
      read: false,
      createdAt: Date.now(),
      readAt: null,
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn : null,
      approvalType: options.approvalType,
      approvalStatus: APPROVAL_STATUS.PENDING,
      approvalData: options.approvalData
    };

    await this.storageService.create(DB_STORE_NAMES.NOTIFICATIONS, notification);

    // Show toast notification with approval actions
    this.showToast(notification);

    return notification;
  }

  /**
   * Updates the status of an approval notification
   * @param id Notification ID to update
   * @param status New approval status
   * @param responseData Optional response data for the approval
   * @returns Promise resolving to the updated notification
   */
  async updateApprovalStatus(
    id: string, 
    status: string, 
    responseData: object = {}
  ): Promise<INotification> {
    if (!this.storageService || !this.userId) {
      throw createStorageError(
        'Notification service not initialized',
        { id, status }
      );
    }

    const notification = await this.storageService.read(DB_STORE_NAMES.NOTIFICATIONS, id);
    if (!notification) {
      throw createStorageError(
        `Notification with ID ${id} not found`,
        { id, status }
      );
    }

    // Verify this is an approval notification
    if (notification.type !== NOTIFICATION_TYPES.APPROVAL) {
      throw createStorageError(
        'Not an approval notification',
        { id, type: notification.type }
      );
    }

    // Update the approval status
    const updates: Partial<INotification> = {
      approvalStatus: status,
      read: true,
      readAt: Date.now()
    };

    // Add response data if provided
    if (responseData) {
      updates.data = {
        ...(notification.data || {}),
        response: responseData
      };
    }

    return this.updateNotification(id, updates);
  }

  /**
   * Gets all pending approval notifications for the current user
   * @returns Promise resolving to an array of pending approval notifications
   */
  async getPendingApprovals(): Promise<INotification[]> {
    return this.getNotifications({
      type: NOTIFICATION_TYPES.APPROVAL,
      approvalStatus: APPROVAL_STATUS.PENDING
    });
  }

  /**
   * Gets the user's notification preferences
   * @returns Promise resolving to the user's notification preferences
   */
  async getPreferences(): Promise<INotificationPreferences> {
    if (!this.storageService || !this.userId) {
      throw createStorageError(
        'Notification service not initialized'
      );
    }

    try {
      // Try to get user preferences from storage
      const prefKey = `notification_preferences_${this.userId}`;
      const preferences = await this.storageService.read(DB_STORE_NAMES.NOTIFICATIONS, prefKey);
      
      if (preferences) {
        return preferences;
      }

      // If no preferences found, create default preferences
      await this.storageService.create(
        DB_STORE_NAMES.NOTIFICATIONS,
        {
          id: prefKey,
          ...DEFAULT_NOTIFICATION_PREFERENCES
        }
      );

      return DEFAULT_NOTIFICATION_PREFERENCES;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  /**
   * Updates the user's notification preferences
   * @param updates Partial preference updates
   * @returns Promise resolving to the updated preferences
   */
  async updatePreferences(updates: Partial<INotificationPreferences>): Promise<INotificationPreferences> {
    if (!this.storageService || !this.userId) {
      throw createStorageError(
        'Notification service not initialized',
        { updates }
      );
    }

    // Get current preferences
    const currentPrefs = await this.getPreferences();
    
    // Create updated preferences
    const updatedPrefs: INotificationPreferences = {
      ...currentPrefs,
      ...updates
    };

    // Store updated preferences
    const prefKey = `notification_preferences_${this.userId}`;
    await this.storageService.update(
      DB_STORE_NAMES.NOTIFICATIONS, 
      prefKey, 
      {
        id: prefKey,
        ...updatedPrefs
      }
    );

    // Update local preferences
    this.preferences = updatedPrefs;

    return updatedPrefs;
  }

  /**
   * Removes expired notifications based on expiration time and retention policy
   * @returns Promise resolving to the number of notifications removed
   */
  async pruneExpired(): Promise<number> {
    if (!this.storageService || !this.userId) {
      throw createStorageError(
        'Notification service not initialized'
      );
    }

    const now = Date.now();
    let count = 0;

    // Get all notifications
    const notifications = await this.getNotifications();
    
    for (const notification of notifications) {
      let shouldDelete = false;

      // Check explicit expiration
      if (notification.expiresAt && notification.expiresAt < now) {
        shouldDelete = true;
      }

      // Check retention policy
      if (!shouldDelete && this.preferences.retentionDays > 0) {
        const retentionMs = this.preferences.retentionDays * 24 * 60 * 60 * 1000;
        if (now - notification.createdAt > retentionMs) {
          shouldDelete = true;
        }
      }

      if (shouldDelete) {
        await this.deleteNotification(notification.id);
        count++;
      }
    }

    return count;
  }

  /**
   * Registers a service worker for push notifications if supported
   * @returns Promise resolving to true if registration was successful
   */
  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      console.log('Push notification service worker registered');
      return true;
    } catch (error) {
      console.error('Error registering service worker:', error);
      return false;
    }
  }

  /**
   * Shows a toast notification in the UI
   * @param notification The notification to display
   */
  private showToast(notification: INotification): void {
    // Check if notifications are enabled
    if (!this.preferences.enabled || !this.preferences.toastNotifications) {
      return;
    }

    // Check if the priority meets the minimum threshold
    const priorityLevels = {
      [MESSAGE_PRIORITY.LOW]: 0,
      [MESSAGE_PRIORITY.NORMAL]: 1,
      [MESSAGE_PRIORITY.HIGH]: 2,
      [MESSAGE_PRIORITY.URGENT]: 3
    };

    const notificationPriority = priorityLevels[notification.priority] || 1;
    const minimumPriority = priorityLevels[this.preferences.minimumPriority] || 1;

    if (notificationPriority < minimumPriority) {
      return;
    }

    // Check if do not disturb is enabled
    if (this.preferences.doNotDisturb) {
      return;
    }

    // Show appropriate toast based on notification type
    if (notification.type === NOTIFICATION_TYPES.APPROVAL) {
      // For approval notifications, show toast with actions
      toast(notification.message, {
        duration: 5000,
        icon: '⚠️',
        // We'd implement custom toast components with actions here
      });
    } else if (notification.type === NOTIFICATION_TYPES.SUCCESS) {
      toast.success(notification.message);
    } else if (notification.type === NOTIFICATION_TYPES.ERROR) {
      toast.error(notification.message);
    } else if (notification.type === NOTIFICATION_TYPES.WARNING) {
      toast(notification.message, {
        icon: '⚠️',
      });
    } else {
      // Default info toast
      toast(notification.message);
    }
  }
}

// Create and export singleton instance
export const notificationService = {
  initialize: async (storageService: StorageService, userId: string): Promise<boolean> => {
    const service = new NotificationService();
    return service.initialize(storageService, userId);
  },
  createNotification: async (options: INotificationCreateOptions): Promise<INotification> => {
    const service = new NotificationService();
    return service.createNotification(options);
  },
  getNotifications: async (query: INotificationQuery = {}): Promise<INotification[]> => {
    const service = new NotificationService();
    return service.getNotifications(query);
  },
  updateNotification: async (id: string, updates: Partial<INotification>): Promise<INotification> => {
    const service = new NotificationService();
    return service.updateNotification(id, updates);
  },
  deleteNotification: async (id: string): Promise<boolean> => {
    const service = new NotificationService();
    return service.deleteNotification(id);
  },
  clearAllNotifications: async (): Promise<boolean> => {
    const service = new NotificationService();
    return service.clearAllNotifications();
  },
  markAsRead: async (id: string): Promise<INotification> => {
    const service = new NotificationService();
    return service.markAsRead(id);
  },
  markAllAsRead: async (): Promise<number> => {
    const service = new NotificationService();
    return service.markAllAsRead();
  },
  getUnreadCount: async (): Promise<number> => {
    const service = new NotificationService();
    return service.getUnreadCount();
  },
  createApprovalNotification: async (options: IApprovalNotificationOptions): Promise<INotification> => {
    const service = new NotificationService();
    return service.createApprovalNotification(options);
  },
  updateApprovalStatus: async (id: string, status: string, responseData: object = {}): Promise<INotification> => {
    const service = new NotificationService();
    return service.updateApprovalStatus(id, status, responseData);
  },
  getPendingApprovals: async (): Promise<INotification[]> => {
    const service = new NotificationService();
    return service.getPendingApprovals();
  },
  getPreferences: async (): Promise<INotificationPreferences> => {
    const service = new NotificationService();
    return service.getPreferences();
  },
  updatePreferences: async (updates: Partial<INotificationPreferences>): Promise<INotificationPreferences> => {
    const service = new NotificationService();
    return service.updatePreferences(updates);
  },
  pruneExpired: async (): Promise<number> => {
    const service = new NotificationService();
    return service.pruneExpired();
  },
  registerServiceWorker: async (): Promise<boolean> => {
    const service = new NotificationService();
    return service.registerServiceWorker();
  }
};