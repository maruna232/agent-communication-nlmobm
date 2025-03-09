import { GoogleCalendarClient } from './googleCalendar';
import {
  ICalendarEvent,
  ICalendarSyncInfo,
  ICalendarSyncRequest,
  ICalendarSyncResponse
} from '../types/calendar.types';
import { IndexedDBStorage } from '../storage/indexedDB';
import {
  convertGoogleEventToLocal,
  convertLocalEventToGoogle,
  mergeEvents
} from './eventUtils';
import {
  CALENDAR_SYNC_STATUS,
  DEFAULT_CONFIG
} from '../constants';
import { createCalendarError } from '../utils/errorHandling';

// Constants for storage
export const CALENDAR_STORE_NAME = 'calendar_events';
export const SYNC_INFO_STORE_NAME = 'calendar_sync_info';
const DEFAULT_SYNC_BATCH_SIZE = 100;

/**
 * Retrieves the calendar synchronization information for a user
 * @param storage IndexedDB storage instance
 * @param userId User ID to retrieve sync info for
 * @returns The sync information or null if not found
 */
async function getSyncInfo(
  storage: IndexedDBStorage,
  userId: string
): Promise<ICalendarSyncInfo | null> {
  try {
    const syncInfo = await storage.read(SYNC_INFO_STORE_NAME, userId);
    return syncInfo as ICalendarSyncInfo;
  } catch (error) {
    console.error('Error retrieving sync info:', error);
    return null;
  }
}

/**
 * Creates initial synchronization information for a user
 * @param storage IndexedDB storage instance
 * @param userId User ID to create sync info for
 * @returns The created sync information
 */
async function createSyncInfo(
  storage: IndexedDBStorage,
  userId: string
): Promise<ICalendarSyncInfo> {
  const syncInfo: ICalendarSyncInfo = {
    userId,
    lastSyncTime: null,
    syncToken: null,
    status: CALENDAR_SYNC_STATUS.NOT_CONNECTED,
    error: null
  };

  await storage.create(SYNC_INFO_STORE_NAME, syncInfo);
  return syncInfo;
}

/**
 * Updates the synchronization information for a user
 * @param storage IndexedDB storage instance
 * @param syncInfo Sync information to update
 * @returns The updated sync information
 */
async function updateSyncInfo(
  storage: IndexedDBStorage,
  syncInfo: ICalendarSyncInfo
): Promise<ICalendarSyncInfo> {
  await storage.update(SYNC_INFO_STORE_NAME, syncInfo.userId, syncInfo);
  return syncInfo;
}

/**
 * Retrieves calendar events from local storage
 * @param storage IndexedDB storage instance
 * @param calendarIds Optional array of calendar IDs to filter by
 * @param timeMin Optional minimum time boundary
 * @param timeMax Optional maximum time boundary
 * @returns Array of calendar events
 */
async function getLocalEvents(
  storage: IndexedDBStorage,
  calendarIds?: string[],
  timeMin?: string,
  timeMax?: string
): Promise<ICalendarEvent[]> {
  try {
    const query: any = {
      storeName: CALENDAR_STORE_NAME
    };

    // Apply filters if provided
    if (calendarIds && calendarIds.length > 0) {
      query.filter = (event: ICalendarEvent) => calendarIds.includes(event.calendarId);
    }

    // Time range filtering would be better with indexes, but we'll filter in memory for now
    if (timeMin || timeMax) {
      const existingFilter = query.filter;
      query.filter = (event: ICalendarEvent) => {
        if (existingFilter && !existingFilter(event)) {
          return false;
        }
        
        if (timeMin && event.endTime < timeMin) {
          return false;
        }
        
        if (timeMax && event.startTime > timeMax) {
          return false;
        }
        
        return true;
      };
    }

    const events = await storage.query(query);
    return events as ICalendarEvent[];
  } catch (error) {
    console.error('Error retrieving local events:', error);
    return [];
  }
}

/**
 * Saves a calendar event to local storage
 * @param storage IndexedDB storage instance
 * @param event Event to save
 * @returns The saved event
 */
async function saveLocalEvent(
  storage: IndexedDBStorage,
  event: ICalendarEvent
): Promise<ICalendarEvent> {
  try {
    const existingEvent = await storage.read(CALENDAR_STORE_NAME, event.eventId);
    
    // Set the lastSynced timestamp
    const updatedEvent = {
      ...event,
      lastSynced: new Date().toISOString()
    };
    
    if (existingEvent) {
      await storage.update(CALENDAR_STORE_NAME, event.eventId, updatedEvent);
    } else {
      await storage.create(CALENDAR_STORE_NAME, updatedEvent);
    }
    
    return updatedEvent;
  } catch (error) {
    throw createCalendarError('Failed to save event to local storage', {
      eventId: event.eventId,
      error
    });
  }
}

/**
 * Deletes a calendar event from local storage
 * @param storage IndexedDB storage instance
 * @param eventId ID of the event to delete
 * @returns True if the event was deleted
 */
async function deleteLocalEvent(
  storage: IndexedDBStorage,
  eventId: string
): Promise<boolean> {
  try {
    await storage.delete(CALENDAR_STORE_NAME, eventId);
    return true;
  } catch (error) {
    console.error('Error deleting local event:', error);
    return false;
  }
}

/**
 * Synchronizes events between Google Calendar and local storage
 * @param googleClient Google Calendar client
 * @param storage IndexedDB storage instance
 * @param request Sync request parameters
 * @returns Sync response with updated events
 */
export async function syncEvents(
  googleClient: GoogleCalendarClient,
  storage: IndexedDBStorage,
  request: ICalendarSyncRequest
): Promise<ICalendarSyncResponse> {
  if (!googleClient.isAuthorized()) {
    throw createCalendarError('Google Calendar client is not authorized', { userId: request.userId });
  }

  // Get or create sync info
  let syncInfo = await getSyncInfo(storage, request.userId);
  if (!syncInfo) {
    syncInfo = await createSyncInfo(storage, request.userId);
  }

  // Update sync status to indicate sync is in progress
  syncInfo.status = CALENDAR_SYNC_STATUS.SYNCING;
  await updateSyncInfo(storage, syncInfo);

  try {
    // If fullSync is requested, clear the sync token to force a full sync
    if (request.fullSync && syncInfo.syncToken) {
      syncInfo.syncToken = null;
      await updateSyncInfo(storage, syncInfo);
    }

    const events: ICalendarEvent[] = [];
    const deletedEventIds: string[] = [];
    let newSyncToken = syncInfo.syncToken;

    // Process each calendar
    for (const calendarId of request.calendarIds) {
      const result = await googleClient.getEvents(
        calendarId,
        request.timeMin || '',
        request.timeMax || '',
        syncInfo.syncToken || undefined
      );

      // Convert Google events to local format
      const localEvents = result.events.map(event => 
        convertGoogleEventToLocal(event, calendarId)
      );

      // Add to the events list
      events.push(...localEvents);

      // Track deleted events
      if (result.deletedEventIds.length > 0) {
        deletedEventIds.push(...result.deletedEventIds);
      }

      // Update sync token if provided
      if (result.syncToken) {
        newSyncToken = result.syncToken;
      }
    }

    // Save all events to local storage in batches
    await batchProcessEvents(events, async (event) => {
      // Check for existing event to merge if needed
      const existingEvent = await storage.read(CALENDAR_STORE_NAME, event.eventId);
      
      if (existingEvent) {
        // Resolve conflicts and merge
        const mergedEvent = resolveConflicts(
          existingEvent as ICalendarEvent,
          event
        );
        await saveLocalEvent(storage, mergedEvent);
      } else {
        // New event, just save it
        await saveLocalEvent(storage, event);
      }
    }, DEFAULT_SYNC_BATCH_SIZE);

    // Delete events that were deleted in Google Calendar
    if (deletedEventIds.length > 0) {
      await batchProcessEvents(deletedEventIds, async (eventId) => {
        // First, find the local event with this Google ID
        const query = {
          storeName: CALENDAR_STORE_NAME,
          filter: (event: ICalendarEvent) => event.googleEventId === eventId
        };
        
        const matchingEvents = await storage.query(query);
        
        // Delete each matching event
        for (const event of matchingEvents) {
          await deleteLocalEvent(storage, event.eventId);
        }
      }, DEFAULT_SYNC_BATCH_SIZE);
    }

    // Update sync info with new sync token and timestamp
    syncInfo.syncToken = newSyncToken;
    syncInfo.lastSyncTime = new Date().toISOString();
    syncInfo.status = CALENDAR_SYNC_STATUS.SYNCED;
    syncInfo.error = null;
    await updateSyncInfo(storage, syncInfo);

    return {
      userId: request.userId,
      syncToken: newSyncToken || '',
      events,
      deletedEventIds,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Update sync info with error status
    syncInfo.status = CALENDAR_SYNC_STATUS.ERROR;
    syncInfo.error = error instanceof Error ? error.message : String(error);
    await updateSyncInfo(storage, syncInfo);

    throw createCalendarError('Calendar sync failed', {
      userId: request.userId,
      error
    });
  }
}

/**
 * Pushes local calendar changes to Google Calendar
 * @param googleClient Google Calendar client
 * @param storage IndexedDB storage instance
 * @param userId User ID
 * @returns Count of created, updated, and deleted events
 */
async function pushLocalChanges(
  googleClient: GoogleCalendarClient,
  storage: IndexedDBStorage,
  userId: string
): Promise<{ created: number, updated: number, deleted: number }> {
  if (!googleClient.isAuthorized()) {
    throw createCalendarError('Google Calendar client is not authorized', { userId });
  }

  try {
    const counts = {
      created: 0,
      updated: 0,
      deleted: 0
    };

    // Get sync info
    const syncInfo = await getSyncInfo(storage, userId);
    if (!syncInfo) {
      throw createCalendarError('Sync info not found', { userId });
    }

    // Find events that have been modified since the last sync
    const query = {
      storeName: CALENDAR_STORE_NAME,
      filter: (event: ICalendarEvent) => {
        // Skip events without a lastModified timestamp
        if (!event.lastModified) {
          return false;
        }

        // Include if lastModified is after lastSyncTime or no lastSyncTime exists
        return !syncInfo.lastSyncTime || event.lastModified > syncInfo.lastSyncTime;
      }
    };

    const modifiedEvents = await storage.query(query);

    // Process modified events
    for (const event of modifiedEvents) {
      // Convert to Google Calendar format
      const googleEvent = convertLocalEventToGoogle(event);

      if (!event.googleEventId) {
        // Create new event in Google Calendar
        const createdEvent = await googleClient.createEvent(event);
        
        // Update local event with Google ID
        const updatedLocalEvent = {
          ...event,
          googleEventId: createdEvent.googleEventId,
          lastSynced: new Date().toISOString()
        };
        
        await saveLocalEvent(storage, updatedLocalEvent);
        counts.created++;
      } else {
        // Update existing event in Google Calendar
        const updatedEvent = await googleClient.updateEvent(event);
        
        // Update local event with any changes
        const updatedLocalEvent = {
          ...event,
          lastSynced: new Date().toISOString()
        };
        
        await saveLocalEvent(storage, updatedLocalEvent);
        counts.updated++;
      }
    }

    // Find events marked for deletion (could be implemented with a 'deleted' flag)
    // This is a placeholder for the actual implementation
    const deletedEvents: ICalendarEvent[] = [];

    // Process deleted events
    for (const event of deletedEvents) {
      if (event.googleEventId) {
        // Delete from Google Calendar
        await googleClient.deleteEvent(event.calendarId, event.googleEventId);
        
        // Delete from local storage
        await deleteLocalEvent(storage, event.eventId);
        counts.deleted++;
      }
    }

    return counts;
  } catch (error) {
    throw createCalendarError('Failed to push local changes to Google Calendar', {
      userId,
      error
    });
  }
}

/**
 * Resolves conflicts between local and remote calendar events
 * @param localEvent Local version of the event
 * @param remoteEvent Remote version of the event
 * @returns Resolved event after conflict resolution
 */
export function resolveConflicts(
  localEvent: ICalendarEvent,
  remoteEvent: ICalendarEvent
): ICalendarEvent {
  // Compare lastModified timestamps
  if (
    localEvent.lastModified &&
    remoteEvent.lastModified &&
    new Date(localEvent.lastModified) > new Date(remoteEvent.lastModified)
  ) {
    // Local changes are newer, use local as base but merge remote data
    return mergeEvents(localEvent, remoteEvent);
  } else {
    // Remote changes are newer or timestamps are equal/missing,
    // use remote as base but preserve local data that's not in remote
    return mergeEvents(remoteEvent, localEvent);
  }
}

/**
 * Starts periodic synchronization of calendar events
 * @param googleClient Google Calendar client
 * @param storage IndexedDB storage instance
 * @param userId User ID
 * @param calendarIds Calendar IDs to sync
 * @param interval Sync interval in milliseconds
 * @returns Object with a function to stop synchronization
 */
function startPeriodicSync(
  googleClient: GoogleCalendarClient,
  storage: IndexedDBStorage,
  userId: string,
  calendarIds: string[],
  interval: number = DEFAULT_CONFIG.CALENDAR_SYNC_INTERVAL
): { stop: () => void } {
  if (!googleClient.isAuthorized()) {
    throw createCalendarError('Google Calendar client is not authorized', { userId });
  }

  // Create sync request
  const syncRequest: ICalendarSyncRequest = {
    userId,
    calendarIds,
    fullSync: false,
    timeMin: null,
    timeMax: null
  };

  // Start interval to run sync
  const intervalId = setInterval(async () => {
    try {
      await syncEvents(googleClient, storage, syncRequest);
    } catch (error) {
      console.error('Periodic sync failed:', error);
      // Don't stop the interval on error, just log and continue
    }
  }, interval);

  // Run initial sync immediately
  syncEvents(googleClient, storage, syncRequest).catch(error => {
    console.error('Initial sync failed:', error);
  });

  // Return function to stop syncing
  return {
    stop: () => clearInterval(intervalId)
  };
}

/**
 * Processes events in batches to avoid overwhelming the system
 * @param items Array of items to process
 * @param processFn Function to process each item
 * @param batchSize Number of items per batch
 */
async function batchProcessEvents<T>(
  items: T[],
  processFn: (item: T) => Promise<void>,
  batchSize: number = DEFAULT_SYNC_BATCH_SIZE
): Promise<void> {
  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process each item in the batch sequentially
    for (const item of batch) {
      await processFn(item);
    }
  }
}

/**
 * Calendar Sync Manager class for managing synchronization between Google Calendar and local storage
 */
export class CalendarSyncManager {
  private googleClient: GoogleCalendarClient;
  private storage: IndexedDBStorage;
  private syncIntervals: Record<string, { stop: () => void }> = {};

  /**
   * Creates a new CalendarSyncManager instance
   * @param googleClient Google Calendar client
   * @param storage IndexedDB storage instance
   */
  constructor(googleClient: GoogleCalendarClient, storage: IndexedDBStorage) {
    this.googleClient = googleClient;
    this.storage = storage;
  }

  /**
   * Initializes or retrieves sync information for a user
   * @param userId User ID
   * @returns Sync information
   */
  async initializeSyncInfo(userId: string): Promise<ICalendarSyncInfo> {
    let syncInfo = await getSyncInfo(this.storage, userId);
    
    if (!syncInfo) {
      syncInfo = await createSyncInfo(this.storage, userId);
    }
    
    return syncInfo;
  }

  /**
   * Performs an immediate synchronization of calendar events
   * @param request Sync request parameters
   * @returns Sync response
   */
  async syncNow(request: ICalendarSyncRequest): Promise<ICalendarSyncResponse> {
    if (!this.googleClient.isAuthorized()) {
      throw createCalendarError('Google Calendar client is not authorized', { userId: request.userId });
    }
    
    return syncEvents(this.googleClient, this.storage, request);
  }

  /**
   * Starts periodic synchronization for a user's calendars
   * @param userId User ID
   * @param calendarIds Calendar IDs to sync
   * @param interval Sync interval in milliseconds
   * @returns True if sync was started successfully
   */
  async startSync(
    userId: string,
    calendarIds: string[],
    interval: number = DEFAULT_CONFIG.CALENDAR_SYNC_INTERVAL
  ): Promise<boolean> {
    if (!this.googleClient.isAuthorized()) {
      throw createCalendarError('Google Calendar client is not authorized', { userId });
    }

    // Stop any existing sync for this user
    await this.stopSync(userId);

    // Start new periodic sync
    const syncController = startPeriodicSync(
      this.googleClient,
      this.storage,
      userId,
      calendarIds,
      interval
    );

    // Store the controller
    this.syncIntervals[userId] = syncController;

    return true;
  }

  /**
   * Stops periodic synchronization for a user
   * @param userId User ID
   * @returns True if sync was stopped successfully
   */
  async stopSync(userId: string): Promise<boolean> {
    const syncController = this.syncIntervals[userId];
    
    if (syncController) {
      syncController.stop();
      delete this.syncIntervals[userId];
      
      // Update sync info to reflect stopped state
      const syncInfo = await getSyncInfo(this.storage, userId);
      if (syncInfo) {
        syncInfo.status = CALENDAR_SYNC_STATUS.NOT_CONNECTED;
        await updateSyncInfo(this.storage, syncInfo);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Pushes local changes to Google Calendar
   * @param userId User ID
   * @returns Count of created, updated, and deleted events
   */
  async pushChanges(
    userId: string
  ): Promise<{ created: number, updated: number, deleted: number }> {
    if (!this.googleClient.isAuthorized()) {
      throw createCalendarError('Google Calendar client is not authorized', { userId });
    }
    
    return pushLocalChanges(this.googleClient, this.storage, userId);
  }

  /**
   * Retrieves calendar events from local storage
   * @param userId User ID
   * @param calendarIds Calendar IDs to include
   * @param timeMin Minimum time boundary
   * @param timeMax Maximum time boundary
   * @returns Array of calendar events
   */
  async getEvents(
    userId: string,
    calendarIds?: string[],
    timeMin?: string,
    timeMax?: string
  ): Promise<ICalendarEvent[]> {
    return getLocalEvents(this.storage, calendarIds, timeMin, timeMax);
  }

  /**
   * Saves a calendar event to local storage
   * @param event Event to save
   * @returns The saved event
   */
  async saveEvent(event: ICalendarEvent): Promise<ICalendarEvent> {
    return saveLocalEvent(this.storage, event);
  }

  /**
   * Deletes a calendar event from local storage
   * @param eventId ID of the event to delete
   * @returns True if the event was deleted
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    return deleteLocalEvent(this.storage, eventId);
  }

  /**
   * Gets the current synchronization status for a user
   * @param userId User ID
   * @returns Sync information or null if not found
   */
  async getSyncStatus(userId: string): Promise<ICalendarSyncInfo | null> {
    return getSyncInfo(this.storage, userId);
  }

  /**
   * Checks if synchronization is currently active for a user
   * @param userId User ID
   * @returns True if sync is active
   */
  async isSyncing(userId: string): Promise<boolean> {
    const syncInfo = await getSyncInfo(this.storage, userId);
    
    // Check if the status is SYNCING or if there's an active sync interval
    return (
      (syncInfo?.status === CALENDAR_SYNC_STATUS.SYNCING) ||
      !!this.syncIntervals[userId]
    );
  }
}