import { v4 as uuidv4 } from 'uuid'; // v9.0.0

import {
  ICalendarEvent,
  ICalendar,
  ICalendarCredentials,
  ICalendarSyncInfo,
  ICreateEventRequest,
  IUpdateEventRequest,
  IDeleteEventRequest,
  IAvailabilityRequest,
  IAvailabilityResponse,
  ICalendarSyncRequest,
  ICalendarSyncResponse,
  GoogleCalendarScope,
  CALENDAR_SYNC_STATUS
} from '../lib/types/calendar.types';

import {
  DEFAULT_CONFIG,
  STORAGE_KEYS
} from '../lib/constants';

import { IndexedDBStorage } from '../lib/storage/indexedDB';
import {
  authorizeGoogleCalendar,
  revokeGoogleCalendarAccess,
  getCalendars,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  checkCalendarAvailability,
  syncGoogleCalendar
} from '../lib/api/calendar.api';
import { toISOString, fromISOString, getTimeSlots } from '../lib/utils/dateTime';
import { createCalendarError } from '../lib/utils/errorHandling';

// Define the calendar database schema
const CALENDAR_SCHEMA = {
  name: 'ai_agent_calendar_db',
  version: 1,
  stores: [
    {
      name: 'calendars',
      keyPath: 'calendarId',
      autoIncrement: false,
      indexes: [
        { name: 'userId', keyPath: 'userId', unique: false },
        { name: 'googleCalendarId', keyPath: 'googleCalendarId', unique: true }
      ]
    },
    {
      name: 'events',
      keyPath: 'eventId',
      autoIncrement: false,
      indexes: [
        { name: 'calendarId', keyPath: 'calendarId', unique: false },
        { name: 'googleEventId', keyPath: 'googleEventId', unique: true },
        { name: 'startTime', keyPath: 'startTime', unique: false },
        { name: 'endTime', keyPath: 'endTime', unique: false }
      ]
    },
    {
      name: 'syncInfo',
      keyPath: 'userId',
      autoIncrement: false,
      indexes: []
    },
    {
      name: 'credentials',
      keyPath: 'userId',
      autoIncrement: false,
      indexes: []
    }
  ]
};

/**
 * Service class for managing calendar operations including Google Calendar integration,
 * event management, and availability checking
 */
export class CalendarService {
  private storage: IndexedDBStorage;
  private initialized: boolean;
  private syncInterval: NodeJS.Timeout | null;

  /**
   * Creates a new CalendarService instance
   */
  constructor() {
    this.storage = null;
    this.initialized = false;
    this.syncInterval = null;
  }

  /**
   * Initializes the calendar service with local storage
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(): Promise<boolean> {
    try {
      // Create a new IndexedDB storage instance
      this.storage = new IndexedDBStorage();
      
      // Initialize the storage with the calendar schema
      await this.storage.initialize(CALENDAR_SCHEMA);
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize calendar service:', error);
      this.initialized = false;
      throw createCalendarError('Failed to initialize calendar service', { error });
    }
  }

  /**
   * Connects to Google Calendar with the specified scope
   * @param userId User ID for the connection
   * @param scope Google Calendar access scope
   * @returns Promise resolving to true if connection was successful
   */
  async connectCalendar(userId: string, scope: GoogleCalendarScope): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    try {
      // Authorize Google Calendar access
      const credentials = await authorizeGoogleCalendar(userId, scope);
      
      // Store the credentials securely
      await this.storage.create('credentials', {
        userId,
        ...credentials
      });

      // Get and store calendars
      const calendars = await getCalendars(userId, credentials);
      
      // Store each calendar in IndexedDB
      for (const calendar of calendars) {
        await this.storage.create('calendars', {
          ...calendar,
          userId
        });
      }

      // Initialize sync information
      await this.storage.create('syncInfo', {
        userId,
        lastSyncTime: null,
        syncToken: null,
        status: CALENDAR_SYNC_STATUS.NOT_CONNECTED,
        error: null
      });

      return true;
    } catch (error) {
      console.error('Failed to connect to Google Calendar:', error);
      throw createCalendarError('Failed to connect to Google Calendar', { userId, error });
    }
  }

  /**
   * Disconnects from Google Calendar
   * @param userId User ID for the disconnection
   * @returns Promise resolving to true if disconnection was successful
   */
  async disconnectCalendar(userId: string): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    try {
      // Get stored credentials
      const credentials = await this.getCredentials(userId);
      
      if (credentials) {
        // Revoke Google Calendar access
        await revokeGoogleCalendarAccess(userId, credentials);
        
        // Delete credentials from storage
        await this.storage.delete('credentials', userId);
      }
      
      // Update sync information
      const syncInfo = await this.getSyncStatus(userId);
      if (syncInfo) {
        await this.storage.update('syncInfo', userId, {
          ...syncInfo,
          status: CALENDAR_SYNC_STATUS.NOT_CONNECTED,
          lastSyncTime: null,
          syncToken: null
        });
      }
      
      // Stop any active sync
      this.stopSync(userId);
      
      return true;
    } catch (error) {
      console.error('Failed to disconnect from Google Calendar:', error);
      throw createCalendarError('Failed to disconnect from Google Calendar', { userId, error });
    }
  }

  /**
   * Retrieves the user's calendars from local storage
   * @param userId User ID to get calendars for
   * @returns Promise resolving to an array of calendars
   */
  async getCalendars(userId: string): Promise<ICalendar[]> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    try {
      // Query calendars for the specified user
      const calendars = await this.storage.query({
        storeName: 'calendars',
        indexName: 'userId',
        range: {
          lower: userId,
          upper: userId
        }
      });
      
      return calendars as ICalendar[];
    } catch (error) {
      console.error('Failed to get calendars:', error);
      throw createCalendarError('Failed to get calendars', { userId, error });
    }
  }

  /**
   * Retrieves events from local storage for the specified calendars and time range
   * @param userId User ID to get events for
   * @param calendarIds Array of calendar IDs to include
   * @param timeMin Start time for the events range
   * @param timeMax End time for the events range
   * @returns Promise resolving to an array of calendar events
   */
  async getEvents(
    userId: string,
    calendarIds: string[],
    timeMin: string,
    timeMax: string
  ): Promise<ICalendarEvent[]> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    if (!calendarIds || !calendarIds.length) {
      throw createCalendarError('Calendar IDs are required');
    }

    try {
      // Convert time strings to ISO format if they aren't already
      const isoTimeMin = typeof timeMin === 'string' ? timeMin : toISOString(new Date(timeMin));
      const isoTimeMax = typeof timeMax === 'string' ? timeMax : toISOString(new Date(timeMax));
      
      // Get events for each calendar within the time range
      let allEvents: ICalendarEvent[] = [];
      
      for (const calendarId of calendarIds) {
        // Query events for this calendar and time range
        const events = await this.storage.query({
          storeName: 'events',
          indexName: 'calendarId',
          range: {
            lower: calendarId,
            upper: calendarId
          },
          filter: (event: ICalendarEvent) => {
            // Filter by time range
            return (
              event.startTime <= isoTimeMax &&
              event.endTime >= isoTimeMin
            );
          }
        });
        
        allEvents = allEvents.concat(events as ICalendarEvent[]);
      }
      
      return allEvents;
    } catch (error) {
      console.error('Failed to get events:', error);
      throw createCalendarError('Failed to get events', { userId, calendarIds, timeMin, timeMax, error });
    }
  }

  /**
   * Creates a new calendar event in local storage and optionally in Google Calendar
   * @param userId User ID creating the event
   * @param request Event creation request
   * @returns Promise resolving to the created event
   */
  async createEvent(userId: string, request: ICreateEventRequest): Promise<ICalendarEvent> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    if (!request.calendarId || !request.title || !request.startTime || !request.endTime) {
      throw createCalendarError('Invalid event request: missing required fields');
    }

    try {
      // Generate a unique event ID
      const eventId = uuidv4();
      
      // Create the event object
      const event: ICalendarEvent = {
        eventId,
        calendarId: request.calendarId,
        googleEventId: null, // Will be set if we create in Google Calendar
        title: request.title,
        description: request.description || '',
        startTime: request.startTime,
        endTime: request.endTime,
        location: request.location || null,
        status: 'confirmed',
        isAgentCreated: request.isAgentCreated || false,
        attendees: request.attendees || [],
        recurrence: request.recurrence || null,
        lastModified: toISOString(new Date()),
        lastSynced: null,
        metadata: {}
      };
      
      // Store the event in local storage
      await this.storage.create('events', event);
      
      // If the calendar is connected to Google Calendar, create there too
      const credentials = await this.getCredentials(userId);
      if (credentials) {
        try {
          // Create the event in Google Calendar
          const googleEvent = await createCalendarEvent(userId, credentials, request);
          
          // Update the local event with the Google event ID
          if (googleEvent && googleEvent.googleEventId) {
            const updatedEvent = {
              ...event,
              googleEventId: googleEvent.googleEventId,
              lastSynced: toISOString(new Date())
            };
            
            await this.storage.update('events', eventId, updatedEvent);
            return updatedEvent;
          }
        } catch (error) {
          console.warn('Failed to create event in Google Calendar:', error);
          // Continue with local event only
        }
      }
      
      return event;
    } catch (error) {
      console.error('Failed to create event:', error);
      throw createCalendarError('Failed to create event', { userId, request, error });
    }
  }

  /**
   * Updates an existing calendar event in local storage and optionally in Google Calendar
   * @param userId User ID updating the event
   * @param request Event update request
   * @returns Promise resolving to the updated event
   */
  async updateEvent(userId: string, request: IUpdateEventRequest): Promise<ICalendarEvent> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    if (!request.eventId || !request.calendarId) {
      throw createCalendarError('Invalid update request: missing required fields');
    }

    try {
      // Get the existing event
      const existingEvent = await this.storage.read('events', request.eventId) as ICalendarEvent;
      
      if (!existingEvent) {
        throw createCalendarError('Event not found', { eventId: request.eventId });
      }
      
      // Apply updates to the event
      const updatedEvent: ICalendarEvent = {
        ...existingEvent,
        ...request.updates,
        lastModified: toISOString(new Date())
      };
      
      // Update the event in local storage
      await this.storage.update('events', request.eventId, updatedEvent);
      
      // If the event has a Google event ID, update it in Google Calendar too
      if (existingEvent.googleEventId) {
        const credentials = await this.getCredentials(userId);
        if (credentials) {
          try {
            // Update the event in Google Calendar
            const googleUpdatedEvent = await updateCalendarEvent(userId, credentials, {
              eventId: existingEvent.googleEventId,
              calendarId: request.calendarId,
              updates: request.updates
            });
            
            // Update the lastSynced property
            if (googleUpdatedEvent) {
              const finalEvent = {
                ...updatedEvent,
                lastSynced: toISOString(new Date())
              };
              
              await this.storage.update('events', request.eventId, finalEvent);
              return finalEvent;
            }
          } catch (error) {
            console.warn('Failed to update event in Google Calendar:', error);
            // Continue with local update only
          }
        }
      }
      
      return updatedEvent;
    } catch (error) {
      console.error('Failed to update event:', error);
      throw createCalendarError('Failed to update event', { userId, request, error });
    }
  }

  /**
   * Deletes a calendar event from local storage and optionally from Google Calendar
   * @param userId User ID deleting the event
   * @param request Event deletion request
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteEvent(userId: string, request: IDeleteEventRequest): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    if (!request.eventId || !request.calendarId) {
      throw createCalendarError('Invalid delete request: missing required fields');
    }

    try {
      // Get the event to check if it has a Google event ID
      const event = await this.storage.read('events', request.eventId) as ICalendarEvent;
      
      // Delete from local storage
      await this.storage.delete('events', request.eventId);
      
      // If the event has a Google event ID, delete it from Google Calendar too
      if (event && event.googleEventId) {
        const credentials = await this.getCredentials(userId);
        if (credentials) {
          try {
            // Delete from Google Calendar
            await deleteCalendarEvent(userId, credentials, {
              eventId: event.googleEventId,
              calendarId: request.calendarId
            });
          } catch (error) {
            console.warn('Failed to delete event from Google Calendar:', error);
            // Continue with local deletion only
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw createCalendarError('Failed to delete event', { userId, request, error });
    }
  }

  /**
   * Checks availability for the specified time range and calendars
   * @param userId User ID to check availability for
   * @param request Availability request parameters
   * @returns Promise resolving to availability information
   */
  async checkAvailability(userId: string, request: IAvailabilityRequest): Promise<IAvailabilityResponse> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    if (!request.startDate || !request.endDate || !request.calendarIds || !request.timeSlotDuration) {
      throw createCalendarError('Invalid availability request: missing required fields');
    }

    try {
      // Convert dates to ISO strings if they aren't already
      const startDate = typeof request.startDate === 'string' ? request.startDate : toISOString(new Date(request.startDate));
      const endDate = typeof request.endDate === 'string' ? request.endDate : toISOString(new Date(request.endDate));
      
      // Get events for the specified calendars and time range
      const events = await this.getEvents(userId, request.calendarIds, startDate, endDate);
      
      // Generate time slots
      const slots = getTimeSlots(
        new Date(startDate),
        new Date(endDate),
        request.timeSlotDuration
      );
      
      // Convert to ITimeSlot format and check availability
      const timeSlots = slots.map(slot => {
        const slotStart = slot.start.toISOString();
        const slotEnd = slot.end.toISOString();
        
        // Find conflicting events
        const conflictingEvents = events.filter(event => {
          // Check if this event overlaps with the time slot
          return (
            (event.startTime < slotEnd && event.endTime > slotStart)
          );
        });
        
        return {
          startTime: slotStart,
          endTime: slotEnd,
          available: conflictingEvents.length === 0,
          conflictingEvents
        };
      });
      
      // Return availability response
      return {
        userId,
        timeSlots,
        startDate,
        endDate
      };
    } catch (error) {
      console.error('Failed to check availability:', error);
      throw createCalendarError('Failed to check availability', { userId, request, error });
    }
  }

  /**
   * Synchronizes local calendar data with Google Calendar
   * @param userId User ID to sync calendars for
   * @param calendarIds Array of calendar IDs to sync
   * @param fullSync Whether to perform a full sync instead of incremental
   * @returns Promise resolving to sync results
   */
  async syncCalendars(
    userId: string,
    calendarIds: string[],
    fullSync: boolean = false
  ): Promise<ICalendarSyncResponse> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    if (!calendarIds || !calendarIds.length) {
      throw createCalendarError('Calendar IDs are required');
    }

    try {
      // Update sync status
      const syncInfo = await this.getSyncStatus(userId);
      if (syncInfo) {
        await this.storage.update('syncInfo', userId, {
          ...syncInfo,
          status: CALENDAR_SYNC_STATUS.SYNCING
        });
      }
      
      // Get credentials
      const credentials = await this.getCredentials(userId);
      if (!credentials) {
        throw createCalendarError('No Google Calendar credentials found');
      }
      
      // Create sync request
      const syncRequest: ICalendarSyncRequest = {
        userId,
        calendarIds,
        fullSync,
        timeMin: null,
        timeMax: null
      };
      
      if (!fullSync && syncInfo && syncInfo.syncToken) {
        syncRequest.syncToken = syncInfo.syncToken;
      }
      
      // Perform sync
      const syncResponse = await syncGoogleCalendar(userId, credentials, syncRequest);
      
      // Process sync response
      if (syncResponse) {
        // Add/update events
        for (const event of syncResponse.events) {
          // Check if the event already exists
          const existingEvent = await this.storage.query({
            storeName: 'events',
            indexName: 'googleEventId',
            range: {
              lower: event.googleEventId,
              upper: event.googleEventId
            }
          });
          
          if (existingEvent && existingEvent.length > 0) {
            // Update existing event
            await this.storage.update('events', existingEvent[0].eventId, {
              ...existingEvent[0],
              ...event,
              lastSynced: toISOString(new Date())
            });
          } else {
            // Create new event
            await this.storage.create('events', {
              ...event,
              lastSynced: toISOString(new Date())
            });
          }
        }
        
        // Delete events that were deleted in Google Calendar
        for (const deletedEventId of syncResponse.deletedEventIds) {
          // Find the local event by googleEventId
          const deletedEvents = await this.storage.query({
            storeName: 'events',
            indexName: 'googleEventId',
            range: {
              lower: deletedEventId,
              upper: deletedEventId
            }
          });
          
          if (deletedEvents && deletedEvents.length > 0) {
            // Delete from local storage
            await this.storage.delete('events', deletedEvents[0].eventId);
          }
        }
        
        // Update sync information
        if (syncInfo) {
          await this.storage.update('syncInfo', userId, {
            ...syncInfo,
            status: CALENDAR_SYNC_STATUS.SYNCED,
            lastSyncTime: toISOString(new Date()),
            syncToken: syncResponse.syncToken
          });
        }
      }
      
      return syncResponse;
    } catch (error) {
      console.error('Failed to sync calendars:', error);
      
      // Update sync status to ERROR
      const syncInfo = await this.getSyncStatus(userId);
      if (syncInfo) {
        await this.storage.update('syncInfo', userId, {
          ...syncInfo,
          status: CALENDAR_SYNC_STATUS.ERROR,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      throw createCalendarError('Failed to sync calendars', { userId, calendarIds, error });
    }
  }

  /**
   * Starts periodic synchronization with Google Calendar
   * @param userId User ID to sync calendars for
   * @param calendarIds Array of calendar IDs to sync
   * @returns Promise resolving to true if sync was started successfully
   */
  async startSync(userId: string, calendarIds: string[]): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    try {
      // Stop any existing sync interval
      this.stopSync(userId);
      
      // Perform initial sync
      await this.syncCalendars(userId, calendarIds, false);
      
      // Set up interval for periodic sync
      this.syncInterval = setInterval(async () => {
        try {
          await this.syncCalendars(userId, calendarIds, false);
        } catch (error) {
          console.error('Periodic sync failed:', error);
        }
      }, DEFAULT_CONFIG.CALENDAR_SYNC_INTERVAL);
      
      return true;
    } catch (error) {
      console.error('Failed to start sync:', error);
      throw createCalendarError('Failed to start calendar sync', { userId, calendarIds, error });
    }
  }

  /**
   * Stops periodic synchronization with Google Calendar
   * @param userId User ID to stop sync for
   * @returns Promise resolving to true if sync was stopped successfully
   */
  async stopSync(userId: string): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    try {
      // Clear the sync interval if it exists
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to stop sync:', error);
      throw createCalendarError('Failed to stop calendar sync', { userId, error });
    }
  }

  /**
   * Selects or deselects a calendar for synchronization and availability checking
   * @param userId User ID owning the calendar
   * @param calendarId Calendar ID to select/deselect
   * @param selected Whether the calendar should be selected
   * @returns Promise resolving to true if selection was updated successfully
   */
  async selectCalendar(userId: string, calendarId: string, selected: boolean): Promise<boolean> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    try {
      // Get the calendar
      const calendar = await this.storage.read('calendars', calendarId) as ICalendar;
      
      if (!calendar) {
        throw createCalendarError('Calendar not found', { calendarId });
      }
      
      // Update the isSelected property
      const updatedCalendar = {
        ...calendar,
        isSelected: selected
      };
      
      // Save the updated calendar
      await this.storage.update('calendars', calendarId, updatedCalendar);
      
      return true;
    } catch (error) {
      console.error('Failed to select calendar:', error);
      throw createCalendarError('Failed to select calendar', { userId, calendarId, selected, error });
    }
  }

  /**
   * Retrieves the current synchronization status
   * @param userId User ID to get sync status for
   * @returns Promise resolving to sync information or null if not found
   */
  async getSyncStatus(userId: string): Promise<ICalendarSyncInfo | null> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    try {
      // Get the sync info from storage
      const syncInfo = await this.storage.read('syncInfo', userId) as ICalendarSyncInfo;
      return syncInfo || null;
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return null;
    }
  }

  /**
   * Retrieves the stored OAuth credentials for Google Calendar
   * @param userId User ID to get credentials for
   * @returns Promise resolving to credentials or null if not found
   */
  async getCredentials(userId: string): Promise<ICalendarCredentials | null> {
    if (!this.isInitialized()) {
      throw createCalendarError('Calendar service not initialized');
    }

    try {
      // Get credentials from storage
      const credentials = await this.storage.read('credentials', userId) as ICalendarCredentials;
      return credentials || null;
    } catch (error) {
      console.error('Failed to get credentials:', error);
      return null;
    }
  }

  /**
   * Checks if the calendar service is initialized
   * @returns True if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.storage !== null;
  }
}

export { CALENDAR_SCHEMA };