import { v4 as uuidv4 } from 'uuid'; // v9.0.0

import {
  ICalendarEvent,
  ICalendar,
  ICalendarCredentials,
  ICalendarSyncInfo,
  ICalendarSyncRequest,
  ICalendarSyncResponse,
  ICreateEventRequest,
  IUpdateEventRequest,
  IDeleteEventRequest,
  IAvailabilityRequest,
  IAvailabilityResponse,
  GoogleCalendarScope
} from '../types/calendar.types';

import { CALENDAR_SYNC_STATUS } from '../constants';

import { GoogleCalendarClient } from '../calendar/googleCalendar';
import { createCalendarError, handleError } from '../utils/errorHandling';
import { toISOString, fromISOString } from '../utils/dateTime';

/**
 * Retrieves the list of calendars for a user from Google Calendar
 * 
 * @param userId - User ID for the request
 * @param credentials - OAuth credentials for Google Calendar
 * @returns Promise resolving to a list of calendars
 */
export async function getCalendars(
  userId: string,
  credentials: ICalendarCredentials
): Promise<ICalendar[]> {
  try {
    // Create a new GoogleCalendarClient with the provided credentials
    const client = new GoogleCalendarClient(credentials);
    
    // Call the getCalendars method to retrieve the user's calendars
    const calendars = await client.getCalendars();
    
    return calendars;
  } catch (error) {
    throw createCalendarError('Failed to retrieve calendars', {
      userId,
      error
    });
  }
}

/**
 * Retrieves events from Google Calendar for specified calendars and time range
 * 
 * @param userId - User ID for the request
 * @param credentials - OAuth credentials for Google Calendar
 * @param calendarId - Calendar ID to retrieve events from
 * @param timeMin - Start time for the events range (ISO string)
 * @param timeMax - End time for the events range (ISO string)
 * @param syncToken - Optional sync token for incremental sync
 * @returns Promise resolving to events, sync token, and deleted event IDs
 */
export async function getCalendarEvents(
  userId: string,
  credentials: ICalendarCredentials,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  syncToken?: string
): Promise<{ events: ICalendarEvent[], syncToken: string, deletedEventIds: string[] }> {
  try {
    // Create a new GoogleCalendarClient with the provided credentials
    const client = new GoogleCalendarClient(credentials);
    
    // Call the getEvents method to retrieve events
    const result = await client.getEvents(calendarId, timeMin, timeMax, syncToken);
    
    return result;
  } catch (error) {
    throw createCalendarError('Failed to retrieve calendar events', {
      userId,
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
 * @param userId - User ID for the request
 * @param credentials - OAuth credentials for Google Calendar
 * @param request - Event creation request
 * @returns Promise resolving to the created calendar event
 */
export async function createCalendarEvent(
  userId: string,
  credentials: ICalendarCredentials,
  request: ICreateEventRequest
): Promise<ICalendarEvent> {
  try {
    // Create a new GoogleCalendarClient with the provided credentials
    const client = new GoogleCalendarClient(credentials);
    
    // Create a calendar event from the request
    const event: ICalendarEvent = {
      eventId: uuidv4(), // Generate a new ID for the event
      calendarId: request.calendarId,
      googleEventId: null, // Will be set after creation
      title: request.title,
      description: request.description || '',
      startTime: request.startTime,
      endTime: request.endTime,
      location: request.location || null,
      status: 'confirmed',
      isAgentCreated: request.isAgentCreated || false,
      attendees: request.attendees || [],
      recurrence: request.recurrence || null,
      lastModified: null,
      lastSynced: null,
      metadata: {}
    };
    
    // Call the createEvent method to create the event in Google Calendar
    const createdEvent = await client.createEvent(event);
    
    return createdEvent;
  } catch (error) {
    throw createCalendarError('Failed to create calendar event', {
      userId,
      request,
      error
    });
  }
}

/**
 * Updates an existing event in Google Calendar
 * 
 * @param userId - User ID for the request
 * @param credentials - OAuth credentials for Google Calendar
 * @param request - Event update request
 * @returns Promise resolving to the updated calendar event
 */
export async function updateCalendarEvent(
  userId: string,
  credentials: ICalendarCredentials,
  request: IUpdateEventRequest
): Promise<ICalendarEvent> {
  try {
    // Create a new GoogleCalendarClient with the provided credentials
    const client = new GoogleCalendarClient(credentials);
    
    // First, we need to get the original event
    // Note: In a real implementation, this would come from your local database
    // or by fetching from Google Calendar first
    let existingEvent: ICalendarEvent;
    
    // For this implementation, we'll assume the existing event is passed
    // within the updates object with all necessary fields
    existingEvent = {
      eventId: request.eventId,
      calendarId: request.calendarId,
      googleEventId: request.updates.googleEventId || null,
      title: request.updates.title || '',
      description: request.updates.description || '',
      startTime: request.updates.startTime || '',
      endTime: request.updates.endTime || '',
      location: request.updates.location || null,
      status: request.updates.status || 'confirmed',
      isAgentCreated: request.updates.isAgentCreated || false,
      attendees: request.updates.attendees || [],
      recurrence: request.updates.recurrence || null,
      lastModified: toISOString(new Date()),
      lastSynced: request.updates.lastSynced || null,
      metadata: request.updates.metadata || {}
    };
    
    // Apply updates to the event
    const updatedEvent: ICalendarEvent = {
      ...existingEvent,
      ...request.updates,
      lastModified: toISOString(new Date())
    };
    
    // Call the updateEvent method to update the event in Google Calendar
    const result = await client.updateEvent(updatedEvent);
    
    return result;
  } catch (error) {
    throw createCalendarError('Failed to update calendar event', {
      userId,
      request,
      error
    });
  }
}

/**
 * Deletes an event from Google Calendar
 * 
 * @param userId - User ID for the request
 * @param credentials - OAuth credentials for Google Calendar
 * @param request - Event deletion request
 * @returns Promise resolving to a boolean indicating success
 */
export async function deleteCalendarEvent(
  userId: string,
  credentials: ICalendarCredentials,
  request: IDeleteEventRequest
): Promise<boolean> {
  try {
    // Create a new GoogleCalendarClient with the provided credentials
    const client = new GoogleCalendarClient(credentials);
    
    // Note: In a real implementation, you would need to:
    // 1. Fetch the event to get the googleEventId if not already known
    // 2. Use the googleEventId for deletion
    
    // For this implementation, we'll assume we can retrieve the googleEventId
    // from some local storage or it's provided in the request
    const googleEventId = request.eventId; // This is a simplification
    
    // Call the deleteEvent method to delete the event from Google Calendar
    const result = await client.deleteEvent(request.calendarId, googleEventId);
    
    return result;
  } catch (error) {
    throw createCalendarError('Failed to delete calendar event', {
      userId,
      request,
      error
    });
  }
}

/**
 * Checks availability in Google Calendar for a specific time range
 * 
 * @param userId - User ID for the request
 * @param credentials - OAuth credentials for Google Calendar
 * @param request - Availability request
 * @returns Promise resolving to availability information
 */
export async function checkCalendarAvailability(
  userId: string,
  credentials: ICalendarCredentials,
  request: IAvailabilityRequest
): Promise<IAvailabilityResponse> {
  try {
    // Create a new GoogleCalendarClient with the provided credentials
    const client = new GoogleCalendarClient(credentials);
    
    // Call the checkAvailability method to check availability in Google Calendar
    const availability = await client.checkAvailability(request);
    
    return availability;
  } catch (error) {
    throw createCalendarError('Failed to check calendar availability', {
      userId,
      request,
      error
    });
  }
}

/**
 * Synchronizes calendar events between local storage and Google Calendar
 * 
 * @param userId - User ID for the request
 * @param credentials - OAuth credentials for Google Calendar
 * @param request - Sync request
 * @returns Promise resolving to sync results
 */
export async function syncGoogleCalendar(
  userId: string,
  credentials: ICalendarCredentials,
  request: ICalendarSyncRequest
): Promise<ICalendarSyncResponse> {
  try {
    // Create a new GoogleCalendarClient with the provided credentials
    const client = new GoogleCalendarClient(credentials);
    
    const { calendarIds, fullSync } = request;
    
    // Default time range for full sync (last 30 days to 90 days in the future)
    const defaultTimeMin = fullSync ? toISOString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) : null;
    const defaultTimeMax = fullSync ? toISOString(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) : null;
    
    // Use provided time boundaries or defaults
    const timeMin = request.timeMin || defaultTimeMin;
    const timeMax = request.timeMax || defaultTimeMax;
    
    // Initialize variables to collect results from all calendars
    let allEvents: ICalendarEvent[] = [];
    let allDeletedEventIds: string[] = [];
    let latestSyncToken = '';
    
    // Sync each calendar
    for (const calendarId of calendarIds) {
      // If fullSync is true or no syncToken is provided, do a full sync
      // Otherwise, do an incremental sync with the provided syncToken
      const syncParams = {
        calendarId,
        timeMin: timeMin as string,
        timeMax: timeMax as string,
        syncToken: fullSync ? undefined : request.syncToken || undefined
      };
      
      // Get events from this calendar
      const result = await client.getEvents(
        syncParams.calendarId,
        syncParams.timeMin,
        syncParams.timeMax,
        syncParams.syncToken
      );
      
      // Add events and deletedEventIds to our collections
      allEvents = allEvents.concat(result.events);
      allDeletedEventIds = allDeletedEventIds.concat(result.deletedEventIds);
      
      // Keep track of the latest syncToken
      latestSyncToken = result.syncToken;
    }
    
    // Create the sync response
    const syncResponse: ICalendarSyncResponse = {
      userId,
      syncToken: latestSyncToken,
      events: allEvents,
      deletedEventIds: allDeletedEventIds,
      timestamp: toISOString(new Date())
    };
    
    return syncResponse;
  } catch (error) {
    throw createCalendarError('Failed to synchronize Google Calendar', {
      userId,
      request,
      error
    });
  }
}

/**
 * Authorizes the application to access Google Calendar with the specified scope
 * 
 * @param userId - User ID for the request
 * @param scope - OAuth scope for Google Calendar
 * @returns Promise resolving to OAuth credentials
 */
export async function authorizeGoogleCalendar(
  userId: string,
  scope: GoogleCalendarScope
): Promise<ICalendarCredentials> {
  try {
    // Import the authorization function from the googleCalendar module
    const { authorizeGoogleCalendar: authorize } = await import('../calendar/googleCalendar');
    
    // Call the authorization function
    const credentials = await authorize(userId, scope);
    
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
 * Revokes the application's access to Google Calendar
 * 
 * @param userId - User ID for the request
 * @param credentials - OAuth credentials for Google Calendar
 * @returns Promise resolving to a boolean indicating success
 */
export async function revokeGoogleCalendarAccess(
  userId: string,
  credentials: ICalendarCredentials
): Promise<boolean> {
  try {
    // Import the revocation function from the googleCalendar module
    const { revokeGoogleCalendarAccess: revoke } = await import('../calendar/googleCalendar');
    
    // Call the revocation function
    const result = await revoke(userId, credentials);
    
    return result;
  } catch (error) {
    throw createCalendarError('Failed to revoke Google Calendar access', {
      userId,
      error
    });
  }
}