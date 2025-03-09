/**
 * Calendar Type Definitions
 * 
 * This file contains TypeScript interfaces and types for calendar-related functionality.
 * These types support the calendar integration, event management, and scheduling features
 * while maintaining the privacy-first, local-first architecture of the application.
 */

import {
  CALENDAR_SYNC_STATUS,
  CALENDAR_EVENT_STATUS
} from '../constants';
import { Location } from '../types/agent.types';

/**
 * Represents a calendar event with support for both local and Google Calendar properties
 */
export interface ICalendarEvent {
  /** Unique identifier for the event in the local system */
  eventId: string;
  /** Identifier for the calendar containing this event */
  calendarId: string;
  /** Google Calendar event ID, if synchronized with Google Calendar */
  googleEventId: string | null;
  /** Title/summary of the event */
  title: string;
  /** Detailed description of the event */
  description: string;
  /** Start time in ISO 8601 format */
  startTime: string;
  /** End time in ISO 8601 format */
  endTime: string;
  /** Location information for the event */
  location: Location | null;
  /** Status of the event (confirmed, tentative, cancelled) */
  status: string;
  /** Whether the event was created by an agent */
  isAgentCreated: boolean;
  /** List of attendees for the event */
  attendees: IEventAttendee[];
  /** Recurrence rules for recurring events (RFC 5545 format) */
  recurrence: string[] | null;
  /** Last modified timestamp in ISO 8601 format */
  lastModified: string | null;
  /** Last synchronization timestamp in ISO 8601 format */
  lastSynced: string | null;
  /** Additional metadata for the event */
  metadata: Record<string, any>;
}

/**
 * Represents an attendee for a calendar event
 */
export interface IEventAttendee {
  /** Email address of the attendee */
  email: string;
  /** Display name of the attendee */
  name: string;
  /** Response status (accepted, tentative, declined, needs-action) */
  responseStatus: string;
  /** Whether the attendee is optional */
  optional: boolean;
}

/**
 * Represents a calendar with support for both local and Google Calendar properties
 */
export interface ICalendar {
  /** Unique identifier for the calendar in the local system */
  calendarId: string;
  /** Google Calendar ID, if synchronized with Google Calendar */
  googleCalendarId: string | null;
  /** Display title of the calendar */
  title: string;
  /** Description of the calendar */
  description: string;
  /** Color code for the calendar (hex format) */
  color: string;
  /** Whether the calendar is selected for display/operations */
  isSelected: boolean;
  /** Whether the calendar is read-only */
  isReadOnly: boolean;
  /** Whether this is the primary calendar for the user */
  isPrimary: boolean;
}

/**
 * Represents OAuth credentials for Google Calendar integration
 */
export interface ICalendarCredentials {
  /** OAuth access token */
  accessToken: string;
  /** OAuth refresh token */
  refreshToken: string;
  /** Timestamp when the access token expires (Unix timestamp) */
  expiresAt: number;
  /** OAuth scope that was granted */
  scope: string;
}

/**
 * Represents calendar synchronization information for tracking sync state
 */
export interface ICalendarSyncInfo {
  /** User ID associated with the sync */
  userId: string;
  /** Timestamp of the last successful synchronization in ISO 8601 format */
  lastSyncTime: string | null;
  /** Sync token from Google Calendar for incremental sync */
  syncToken: string | null;
  /** Current status of synchronization */
  status: string;
  /** Error message if synchronization failed */
  error: string | null;
}

/**
 * Represents a time slot for availability checking
 */
export interface ITimeSlot {
  /** Start time of the slot in ISO 8601 format */
  startTime: string;
  /** End time of the slot in ISO 8601 format */
  endTime: string;
  /** Whether the slot is available */
  available: boolean;
  /** Events conflicting with this time slot, if not available */
  conflictingEvents: ICalendarEvent[];
}

/**
 * Represents a request to create a new calendar event
 */
export interface ICreateEventRequest {
  /** Identifier for the target calendar */
  calendarId: string;
  /** Title/summary of the event */
  title: string;
  /** Detailed description of the event */
  description: string;
  /** Start time in ISO 8601 format */
  startTime: string;
  /** End time in ISO 8601 format */
  endTime: string;
  /** Location information for the event */
  location: Location | null;
  /** List of attendees for the event */
  attendees: IEventAttendee[];
  /** Whether the event is being created by an agent */
  isAgentCreated: boolean;
  /** Recurrence rules for recurring events (RFC 5545 format) */
  recurrence: string[] | null;
}

/**
 * Represents a request to update an existing calendar event
 */
export interface IUpdateEventRequest {
  /** Identifier for the event to update */
  eventId: string;
  /** Identifier for the calendar containing the event */
  calendarId: string;
  /** Partial event object with properties to update */
  updates: Partial<ICalendarEvent>;
}

/**
 * Represents a request to delete a calendar event
 */
export interface IDeleteEventRequest {
  /** Identifier for the event to delete */
  eventId: string;
  /** Identifier for the calendar containing the event */
  calendarId: string;
}

/**
 * Represents a request to check availability for scheduling
 */
export interface IAvailabilityRequest {
  /** User ID to check availability for */
  userId: string;
  /** Start date in ISO 8601 format */
  startDate: string;
  /** End date in ISO 8601 format */
  endDate: string;
  /** List of calendar IDs to check */
  calendarIds: string[];
  /** Duration of time slots in minutes */
  timeSlotDuration: number;
}

/**
 * Represents a response with availability information
 */
export interface IAvailabilityResponse {
  /** User ID the availability is for */
  userId: string;
  /** List of time slots with availability information */
  timeSlots: ITimeSlot[];
  /** Start date of the availability check in ISO 8601 format */
  startDate: string;
  /** End date of the availability check in ISO 8601 format */
  endDate: string;
}

/**
 * Represents a request to synchronize calendars
 */
export interface ICalendarSyncRequest {
  /** User ID to synchronize calendars for */
  userId: string;
  /** List of calendar IDs to synchronize */
  calendarIds: string[];
  /** Whether to perform a full sync or incremental sync */
  fullSync: boolean;
  /** Minimum time boundary for events in ISO 8601 format */
  timeMin: string | null;
  /** Maximum time boundary for events in ISO 8601 format */
  timeMax: string | null;
}

/**
 * Represents a response from calendar synchronization
 */
export interface ICalendarSyncResponse {
  /** User ID the sync was performed for */
  userId: string;
  /** New sync token for future incremental syncs */
  syncToken: string;
  /** List of events that were added or updated */
  events: ICalendarEvent[];
  /** List of event IDs that were deleted */
  deletedEventIds: string[];
  /** Timestamp of the synchronization in ISO 8601 format */
  timestamp: string;
}

/**
 * Available OAuth scopes for Google Calendar integration
 */
export enum GoogleCalendarScope {
  /** Read-only access to calendars */
  READ_ONLY = 'https://www.googleapis.com/auth/calendar.readonly',
  /** Read and write access to calendars */
  READ_WRITE = 'https://www.googleapis.com/auth/calendar'
}

/**
 * Represents the state structure for calendar-related data in the application
 */
export interface ICalendarState {
  /** List of available calendars */
  calendars: ICalendar[];
  /** List of calendar events */
  events: ICalendarEvent[];
  /** Synchronization information */
  syncInfo: ICalendarSyncInfo | null;
  /** Whether calendar data is currently loading */
  loading: boolean;
  /** Error message if an operation failed */
  error: string | null;
}

/**
 * Represents the actions available for interacting with calendars
 */
export interface ICalendarActions {
  /** Connect to Google Calendar */
  connectCalendar: (userId: string, scope: GoogleCalendarScope) => Promise<boolean>;
  /** Disconnect from Google Calendar */
  disconnectCalendar: (userId: string) => Promise<boolean>;
  /** Get list of available calendars */
  getCalendars: (userId: string) => Promise<ICalendar[]>;
  /** Get events for specified calendars and time range */
  getEvents: (userId: string, calendarIds: string[], timeMin: string, timeMax: string) => Promise<ICalendarEvent[]>;
  /** Create a new calendar event */
  createEvent: (userId: string, request: ICreateEventRequest) => Promise<ICalendarEvent>;
  /** Update an existing calendar event */
  updateEvent: (userId: string, request: IUpdateEventRequest) => Promise<ICalendarEvent>;
  /** Delete a calendar event */
  deleteEvent: (userId: string, request: IDeleteEventRequest) => Promise<boolean>;
  /** Check availability for scheduling */
  checkAvailability: (userId: string, request: IAvailabilityRequest) => Promise<IAvailabilityResponse>;
  /** Select or deselect a calendar for operations */
  selectCalendar: (userId: string, calendarId: string, selected: boolean) => Promise<boolean>;
  /** Initialize calendar synchronization */
  initializeSync: (userId: string) => Promise<ICalendarSyncInfo>;
  /** Start periodic calendar synchronization */
  startSync: (userId: string, calendarIds: string[]) => Promise<boolean>;
  /** Stop periodic calendar synchronization */
  stopSync: (userId: string) => Promise<boolean>;
  /** Trigger immediate calendar synchronization */
  syncNow: (userId: string, calendarIds: string[], fullSync?: boolean) => Promise<ICalendarSyncResponse>;
}