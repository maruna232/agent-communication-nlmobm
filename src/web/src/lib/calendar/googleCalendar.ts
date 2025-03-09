/**
 * Google Calendar Integration
 * 
 * Implements the Google Calendar integration for the AI Agent Network application,
 * providing a client for interacting with the Google Calendar API.
 * This module handles OAuth authentication, calendar retrieval, event management, 
 * and availability checking while maintaining the privacy-first approach of the application.
 */

import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { gapi } from 'gapi-script'; // v1.2.0

import {
  ICalendarEvent,
  ICalendar,
  ICalendarCredentials,
  IEventAttendee,
  ITimeSlot,
  IAvailabilityRequest,
  IAvailabilityResponse,
  GoogleCalendarScope
} from '../types/calendar.types';

import {
  CALENDAR_SYNC_STATUS,
  CALENDAR_EVENT_STATUS,
  DEFAULT_CONFIG
} from '../constants';

import { createCalendarError } from '../utils/errorHandling';
import { 
  toISOString, 
  fromISOString, 
  getTimeSlots 
} from '../utils/dateTime';
import { 
  encryptWithPassword, 
  decryptWithPassword 
} from '../utils/encryption';

// Google API Configuration Constants
export const GOOGLE_API_CONFIG = {
  CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
  SCOPES: {
    READ_ONLY: 'https://www.googleapis.com/auth/calendar.readonly',
    READ_WRITE: 'https://www.googleapis.com/auth/calendar'
  }
};

/**
 * Initializes the Google API client with the necessary configuration
 * 
 * @returns Promise that resolves when the API is initialized
 */
export async function initGoogleApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if the client is already loaded
    if (gapi.client) {
      resolve();
      return;
    }

    // Load the client library
    gapi.load('client:auth2', async () => {
      try {
        // Initialize the client
        await gapi.client.init({
          apiKey: GOOGLE_API_CONFIG.API_KEY,
          clientId: GOOGLE_API_CONFIG.CLIENT_ID,
          discoveryDocs: GOOGLE_API_CONFIG.DISCOVERY_DOCS,
          scope: GOOGLE_API_CONFIG.SCOPES.READ_ONLY
        });
        
        resolve();
      } catch (error) {
        reject(createCalendarError('Failed to initialize Google API client', { error }));
      }
    });
  });
}

/**
 * Initiates the OAuth flow to authorize access to Google Calendar
 * 
 * @param userId - User ID for encryption
 * @param scope - Requested access scope
 * @returns OAuth credentials for Google Calendar
 */
export async function authorizeGoogleCalendar(
  userId: string,
  scope: GoogleCalendarScope
): Promise<ICalendarCredentials> {
  try {
    // Initialize the Google API client
    await initGoogleApi();
    
    // Determine the scope
    const requestedScope = scope === GoogleCalendarScope.READ_ONLY
      ? GOOGLE_API_CONFIG.SCOPES.READ_ONLY
      : GOOGLE_API_CONFIG.SCOPES.READ_WRITE;
    
    // Initiate OAuth flow
    const authResponse = await gapi.auth2.getAuthInstance().signIn({
      scope: requestedScope
    });
    
    // Get the auth instance
    const authInstance = gapi.auth2.getAuthInstance();
    const currentUser = authInstance.currentUser.get();
    
    // Extract tokens
    const authObj = currentUser.getAuthResponse(true);
    const accessToken = authObj.access_token;
    const refreshToken = authObj.refresh_token;
    const expiresIn = authObj.expires_in;
    
    // Calculate expiration time
    const expiresAt = Date.now() + expiresIn * 1000;
    
    // Create credentials object
    const credentials: ICalendarCredentials = {
      accessToken,
      refreshToken,
      expiresAt,
      scope: requestedScope
    };
    
    // Encrypt sensitive data using userId as encryption key
    const encryptedCredentials = encryptWithPassword(
      JSON.stringify(credentials), 
      userId
    );
    
    return credentials;
  } catch (error) {
    throw createCalendarError('Failed to authorize Google Calendar', { 
      userId,
      scope,
      error 
    });
  }
}

/**
 * Refreshes an expired Google Calendar OAuth token
 * 
 * @param credentials - Current credentials
 * @returns Updated OAuth credentials
 */
export async function refreshGoogleCalendarToken(
  credentials: ICalendarCredentials
): Promise<ICalendarCredentials> {
  try {
    // Check if token needs refresh
    if (Date.now() < credentials.expiresAt - DEFAULT_CONFIG.TOKEN_REFRESH_THRESHOLD) {
      return credentials;
    }
    
    // Initialize the Google API client
    await initGoogleApi();
    
    // Refresh the token
    const authInstance = gapi.auth2.getAuthInstance();
    const currentUser = authInstance.currentUser.get();
    
    // Force token refresh
    await currentUser.reloadAuthResponse();
    
    // Get the new auth response
    const authObj = currentUser.getAuthResponse(true);
    const accessToken = authObj.access_token;
    const expiresIn = authObj.expires_in;
    
    // Calculate new expiration time
    const expiresAt = Date.now() + expiresIn * 1000;
    
    // Create updated credentials
    const updatedCredentials: ICalendarCredentials = {
      ...credentials,
      accessToken,
      expiresAt
    };
    
    return updatedCredentials;
  } catch (error) {
    throw createCalendarError('Failed to refresh Google Calendar token', {
      error
    });
  }
}

/**
 * Revokes the application's access to Google Calendar
 * 
 * @param userId - User ID
 * @param credentials - OAuth credentials
 * @returns True if access was successfully revoked
 */
export async function revokeGoogleCalendarAccess(
  userId: string,
  credentials: ICalendarCredentials
): Promise<boolean> {
  try {
    // Initialize the Google API client
    await initGoogleApi();
    
    // Revoke access
    const authInstance = gapi.auth2.getAuthInstance();
    await authInstance.signOut();
    await authInstance.disconnect();
    
    // Clear any stored credentials
    // Note: actual storage clearing would be handled by the calling component
    
    return true;
  } catch (error) {
    throw createCalendarError('Failed to revoke Google Calendar access', {
      userId,
      error
    });
  }
}

/**
 * Maps a Google Calendar object to the application's ICalendar interface
 * 
 * @param googleCalendar - Google Calendar object
 * @returns Mapped calendar object
 */
export function mapGoogleCalendarToCalendar(googleCalendar: any): ICalendar {
  const calendar: ICalendar = {
    calendarId: uuidv4(),
    googleCalendarId: googleCalendar.id,
    title: googleCalendar.summary || 'Untitled Calendar',
    description: googleCalendar.description || '',
    color: googleCalendar.backgroundColor || '#4285F4',
    isSelected: true,
    isReadOnly: googleCalendar.accessRole === 'reader',
    isPrimary: googleCalendar.primary === true
  };
  
  return calendar;
}

/**
 * Maps a Google Calendar event to the application's ICalendarEvent interface
 * 
 * @param googleEvent - Google Calendar event
 * @param calendarId - Calendar ID for the event
 * @returns Mapped calendar event object
 */
export function mapGoogleEventToCalendarEvent(googleEvent: any, calendarId: string): ICalendarEvent {
  // Create attendees array
  const attendees: IEventAttendee[] = (googleEvent.attendees || []).map((attendee: any) => ({
    email: attendee.email,
    name: attendee.displayName || attendee.email,
    responseStatus: attendee.responseStatus || 'needsAction',
    optional: attendee.optional || false
  }));
  
  // Map location
  let location = null;
  if (googleEvent.location) {
    location = {
      name: googleEvent.location,
      address: googleEvent.location,
      locationType: 'other',
      coordinates: {
        latitude: 0,
        longitude: 0
      }
    };
  }
  
  // Determine status
  let status = CALENDAR_EVENT_STATUS.CONFIRMED;
  if (googleEvent.status === 'tentative') {
    status = CALENDAR_EVENT_STATUS.TENTATIVE;
  } else if (googleEvent.status === 'cancelled') {
    status = CALENDAR_EVENT_STATUS.CANCELLED;
  }
  
  // Create the event object
  const event: ICalendarEvent = {
    eventId: uuidv4(),
    calendarId: calendarId,
    googleEventId: googleEvent.id,
    title: googleEvent.summary || 'Untitled Event',
    description: googleEvent.description || '',
    startTime: googleEvent.start?.dateTime || googleEvent.start?.date,
    endTime: googleEvent.end?.dateTime || googleEvent.end?.date,
    location: location,
    status: status,
    isAgentCreated: Boolean(googleEvent.extendedProperties?.private?.isAgentCreated) || false,
    attendees: attendees,
    recurrence: googleEvent.recurrence || null,
    lastModified: googleEvent.updated || null,
    lastSynced: toISOString(new Date()),
    metadata: {
      googleResourceId: googleEvent.id,
      iCalUID: googleEvent.iCalUID,
      htmlLink: googleEvent.htmlLink,
      colorId: googleEvent.colorId
    }
  };
  
  return event;
}

/**
 * Maps the application's ICalendarEvent to a Google Calendar event format
 * 
 * @param event - Calendar event to map
 * @returns Google Calendar event object
 */
export function mapCalendarEventToGoogleEvent(event: ICalendarEvent): object {
  // Create the Google Calendar event object
  const googleEvent: any = {
    summary: event.title,
    description: event.description,
    start: {
      dateTime: event.startTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: event.endTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    extendedProperties: {
      private: {
        isAgentCreated: event.isAgentCreated,
        eventId: event.eventId
      }
    }
  };
  
  // Add location if available
  if (event.location) {
    googleEvent.location = event.location.name || event.location.address;
  }
  
  // Add attendees if available
  if (event.attendees && event.attendees.length > 0) {
    googleEvent.attendees = event.attendees.map(attendee => ({
      email: attendee.email,
      displayName: attendee.name,
      responseStatus: attendee.responseStatus,
      optional: attendee.optional
    }));
  }
  
  // Add recurrence if present
  if (event.recurrence) {
    googleEvent.recurrence = event.recurrence;
  }
  
  // Map status
  if (event.status === CALENDAR_EVENT_STATUS.TENTATIVE) {
    googleEvent.status = 'tentative';
  } else if (event.status === CALENDAR_EVENT_STATUS.CANCELLED) {
    googleEvent.status = 'cancelled';
  } else {
    googleEvent.status = 'confirmed';
  }
  
  return googleEvent;
}

/**
 * Client for interacting with the Google Calendar API
 */
export class GoogleCalendarClient {
  private credentials: ICalendarCredentials;
  private initialized: boolean = false;
  
  /**
   * Creates a new GoogleCalendarClient instance
   * 
   * @param credentials - OAuth credentials
   */
  constructor(credentials: ICalendarCredentials) {
    this.credentials = credentials;
  }
  
  /**
   * Initializes the Google Calendar client
   * 
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Initialize Google API
      await initGoogleApi();
      
      // Set auth token
      gapi.client.setToken({
        access_token: this.credentials.accessToken
      });
      
      this.initialized = true;
    } catch (error) {
      throw createCalendarError('Failed to initialize Google Calendar client', {
        error
      });
    }
  }
  
  /**
   * Retrieves the list of calendars for the authenticated user
   * 
   * @returns List of user's calendars
   */
  async getCalendars(): Promise<ICalendar[]> {
    try {
      // Ensure client is initialized
      await this.initialize();
      
      // Call the Google Calendar API
      const response = await gapi.client.calendar.calendarList.list();
      const calendarList = response.result.items || [];
      
      // Map to our calendar format
      const calendars: ICalendar[] = calendarList.map(googleCalendar => 
        mapGoogleCalendarToCalendar(googleCalendar)
      );
      
      return calendars;
    } catch (error) {
      throw createCalendarError('Failed to retrieve calendars', {
        error
      });
    }
  }
  
  /**
   * Retrieves events from a specific calendar within a time range
   * 
   * @param calendarId - Google Calendar ID
   * @param timeMin - Start time for events
   * @param timeMax - End time for events
   * @param syncToken - Token for incremental sync
   * @returns Calendar events, sync token, and deleted event IDs
   */
  async getEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string,
    syncToken?: string
  ): Promise<{ events: ICalendarEvent[], syncToken: string, deletedEventIds: string[] }> {
    try {
      // Ensure client is initialized
      await this.initialize();
      
      // Prepare request parameters
      const params: any = {
        calendarId: calendarId,
        singleEvents: true,
        maxResults: 2500, // Maximum allowed by Google
        orderBy: 'startTime'
      };
      
      // Add timeMin and timeMax if no syncToken
      if (!syncToken) {
        params.timeMin = timeMin;
        params.timeMax = timeMax;
      } else {
        params.syncToken = syncToken;
      }
      
      // Call the Google Calendar API
      const response = await gapi.client.calendar.events.list(params);
      const googleEvents = response.result.items || [];
      const nextSyncToken = response.result.nextSyncToken || '';
      
      // Track deleted events when using syncToken
      const deletedEventIds: string[] = [];
      
      if (syncToken) {
        googleEvents.forEach((event: any) => {
          if (event.status === 'cancelled') {
            deletedEventIds.push(event.id);
          }
        });
      }
      
      // Map to our event format (filter out cancelled events)
      const events: ICalendarEvent[] = googleEvents
        .filter((event: any) => event.status !== 'cancelled')
        .map((event: any) => mapGoogleEventToCalendarEvent(event, calendarId));
      
      return {
        events,
        syncToken: nextSyncToken,
        deletedEventIds
      };
    } catch (error) {
      throw createCalendarError('Failed to retrieve events', {
        calendarId,
        timeMin,
        timeMax,
        error
      });
    }
  }
  
  /**
   * Creates a new event in Google Calendar
   * 
   * @param event - Calendar event to create
   * @returns Created calendar event with Google Calendar ID
   */
  async createEvent(event: ICalendarEvent): Promise<ICalendarEvent> {
    try {
      // Ensure client is initialized
      await this.initialize();
      
      // Map to Google Calendar format
      const googleEvent = mapCalendarEventToGoogleEvent(event);
      
      // Call the Google Calendar API
      const response = await gapi.client.calendar.events.insert({
        calendarId: event.calendarId,
        resource: googleEvent
      });
      
      // Map the response back to our format
      const createdEvent = mapGoogleEventToCalendarEvent(
        response.result,
        event.calendarId
      );
      
      return createdEvent;
    } catch (error) {
      throw createCalendarError('Failed to create event', {
        event,
        error
      });
    }
  }
  
  /**
   * Updates an existing event in Google Calendar
   * 
   * @param event - Calendar event to update
   * @returns Updated calendar event
   */
  async updateEvent(event: ICalendarEvent): Promise<ICalendarEvent> {
    try {
      // Ensure client is initialized
      await this.initialize();
      
      // Check if the event has a Google Calendar ID
      if (!event.googleEventId) {
        throw createCalendarError('Cannot update event: missing Google Calendar ID', {
          event
        });
      }
      
      // Map to Google Calendar format
      const googleEvent = mapCalendarEventToGoogleEvent(event);
      
      // Call the Google Calendar API
      const response = await gapi.client.calendar.events.update({
        calendarId: event.calendarId,
        eventId: event.googleEventId,
        resource: googleEvent
      });
      
      // Map the response back to our format
      const updatedEvent = mapGoogleEventToCalendarEvent(
        response.result,
        event.calendarId
      );
      
      return updatedEvent;
    } catch (error) {
      throw createCalendarError('Failed to update event', {
        event,
        error
      });
    }
  }
  
  /**
   * Deletes an event from Google Calendar
   * 
   * @param calendarId - Calendar ID
   * @param eventId - Google Calendar event ID
   * @returns True if deletion was successful
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<boolean> {
    try {
      // Ensure client is initialized
      await this.initialize();
      
      // Call the Google Calendar API
      await gapi.client.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId
      });
      
      return true;
    } catch (error) {
      throw createCalendarError('Failed to delete event', {
        calendarId,
        eventId,
        error
      });
    }
  }
  
  /**
   * Checks availability in Google Calendar for a specific time range
   * 
   * @param request - Availability request parameters
   * @returns Availability information with time slots
   */
  async checkAvailability(request: IAvailabilityRequest): Promise<IAvailabilityResponse> {
    try {
      // Ensure client is initialized
      await this.initialize();
      
      const { startDate, endDate, timeSlotDuration, calendarIds = ['primary'] } = request;
      
      // Create freebusy request
      const freebusyRequest = {
        timeMin: startDate,
        timeMax: endDate,
        items: calendarIds.map(id => ({ id }))
      };
      
      // Call the Google Calendar API
      const response = await gapi.client.calendar.freebusy.query({
        resource: freebusyRequest
      });
      
      // Process the freebusy information
      const busyPeriods: any[] = [];
      
      // Combine busy periods from all calendars
      Object.keys(response.result.calendars || {}).forEach(calId => {
        const calendarBusy = response.result.calendars[calId].busy || [];
        busyPeriods.push(...calendarBusy);
      });
      
      // Generate time slots
      const timeSlots = getTimeSlots(
        new Date(startDate),
        new Date(endDate),
        timeSlotDuration
      ).map(slot => {
        const slotStart = slot.start.toISOString();
        const slotEnd = slot.end.toISOString();
        
        // Check if this slot overlaps with any busy period
        const isAvailable = !busyPeriods.some(period => {
          const busyStart = period.start;
          const busyEnd = period.end;
          
          // Check for overlap
          return (
            (busyStart < slotEnd && busyEnd > slotStart) ||
            (slotStart < busyEnd && slotEnd > busyStart)
          );
        });
        
        return {
          startTime: slotStart,
          endTime: slotEnd,
          available: isAvailable,
          conflictingEvents: []
        };
      });
      
      // Return availability response
      return {
        userId: request.userId,
        timeSlots: timeSlots,
        startDate: startDate,
        endDate: endDate
      };
    } catch (error) {
      throw createCalendarError('Failed to check availability', {
        request,
        error
      });
    }
  }
}