/**
 * eventUtils.ts
 * 
 * Provides utility functions for calendar event manipulation, conversion between
 * Google Calendar and local event formats, and event management operations.
 * These utilities are essential for the calendar integration functionality
 * while supporting the privacy-first approach by handling event data transformations locally.
 */

import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { calendar_v3 } from '@googleapis/calendar'; // v6.0.0
import { 
  ICalendarEvent, 
  IEventAttendee,
  ITimeSlot
} from '../types/calendar.types';
import { Location } from '../types/agent.types';
import { CALENDAR_EVENT_STATUS } from '../constants';
import { 
  toISOString, 
  fromISOString,
  isOverlapping
} from '../utils/dateTime';
import { createCalendarError } from '../utils/errorHandling';

// Default event duration in minutes if not specified
export const DEFAULT_EVENT_DURATION_MINUTES = 60;

/**
 * Creates a new local calendar event with default values
 * 
 * @param eventData - Partial event data to initialize the event with
 * @returns A new calendar event with generated ID and default values
 */
export function createLocalEvent(eventData: Partial<ICalendarEvent>): ICalendarEvent {
  const now = new Date();
  const nowISOString = toISOString(now);
  const defaultEndTime = toISOString(
    new Date(now.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60 * 1000)
  );

  const event: ICalendarEvent = {
    eventId: uuidv4(),
    calendarId: eventData.calendarId || '',
    googleEventId: eventData.googleEventId || null,
    title: eventData.title || '',
    description: eventData.description || '',
    startTime: eventData.startTime || nowISOString,
    endTime: eventData.endTime || defaultEndTime,
    location: eventData.location || null,
    status: eventData.status || CALENDAR_EVENT_STATUS.CONFIRMED,
    isAgentCreated: eventData.isAgentCreated || false,
    attendees: eventData.attendees || [],
    recurrence: eventData.recurrence || null,
    lastModified: nowISOString,
    lastSynced: eventData.lastSynced || null,
    metadata: eventData.metadata || {}
  };

  return event;
}

/**
 * Converts a Google Calendar event to the local event format
 * 
 * @param googleEvent - The Google Calendar event to convert
 * @param calendarId - The local calendar ID to associate the event with
 * @returns The converted local calendar event
 */
export function convertGoogleEventToLocal(
  googleEvent: calendar_v3.Schema$Event,
  calendarId: string
): ICalendarEvent {
  if (!googleEvent.id) {
    throw createCalendarError('Google event is missing ID');
  }

  // Extract and format start/end times
  let startTime: string, endTime: string;
  
  if (googleEvent.start?.dateTime) {
    startTime = toISOString(new Date(googleEvent.start.dateTime));
  } else if (googleEvent.start?.date) {
    // All-day event, use start of day
    const startDate = new Date(googleEvent.start.date);
    startDate.setHours(0, 0, 0, 0);
    startTime = toISOString(startDate);
  } else {
    throw createCalendarError('Google event is missing start time');
  }

  if (googleEvent.end?.dateTime) {
    endTime = toISOString(new Date(googleEvent.end.dateTime));
  } else if (googleEvent.end?.date) {
    // All-day event, use end of day
    const endDate = new Date(googleEvent.end.date);
    endDate.setHours(23, 59, 59, 999);
    endTime = toISOString(endDate);
  } else {
    throw createCalendarError('Google event is missing end time');
  }

  // Convert location
  let location: Location | null = null;
  if (googleEvent.location) {
    location = {
      name: googleEvent.location,
      address: googleEvent.location,
      locationType: 'other' as any, // Using 'other' as default
      coordinates: { latitude: 0, longitude: 0 }
    };
  }

  // Convert attendees
  const attendees: IEventAttendee[] = googleEvent.attendees?.map(attendee => ({
    email: attendee.email || '',
    name: attendee.displayName || '',
    responseStatus: attendee.responseStatus || 'needsAction',
    optional: attendee.optional || false
  })) || [];

  // Map Google status to local status
  let status = CALENDAR_EVENT_STATUS.CONFIRMED;
  if (googleEvent.status === 'cancelled') {
    status = CALENDAR_EVENT_STATUS.CANCELLED;
  } else if (googleEvent.status === 'tentative') {
    status = CALENDAR_EVENT_STATUS.TENTATIVE;
  }

  // Check if the event was created by an agent (from description or metadata)
  const isAgentCreated = 
    googleEvent.description?.includes('Created by AI Agent') || 
    (googleEvent.extendedProperties?.private?.isAgentCreated === 'true');

  return {
    eventId: uuidv4(), // Generate a new local ID
    calendarId,
    googleEventId: googleEvent.id,
    title: googleEvent.summary || '',
    description: googleEvent.description || '',
    startTime,
    endTime,
    location,
    status,
    isAgentCreated,
    attendees,
    recurrence: googleEvent.recurrence || null,
    lastModified: googleEvent.updated ? toISOString(new Date(googleEvent.updated)) : toISOString(new Date()),
    lastSynced: toISOString(new Date()),
    metadata: googleEvent.extendedProperties?.private || {}
  };
}

/**
 * Converts a local calendar event to Google Calendar format
 * 
 * @param localEvent - The local calendar event to convert
 * @returns The converted Google Calendar event
 */
export function convertLocalEventToGoogle(
  localEvent: ICalendarEvent
): calendar_v3.Schema$Event {
  const googleEvent: calendar_v3.Schema$Event = {
    // Use googleEventId if it exists (for updates)
    id: localEvent.googleEventId || undefined,
    summary: localEvent.title,
    description: localEvent.description,
    start: {
      dateTime: new Date(localEvent.startTime).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: new Date(localEvent.endTime).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    location: localEvent.location ? 
      `${localEvent.location.name}${localEvent.location.address ? ' - ' + localEvent.location.address : ''}` : 
      undefined,
    status: localEvent.status === CALENDAR_EVENT_STATUS.CANCELLED ? 
      'cancelled' : 
      localEvent.status === CALENDAR_EVENT_STATUS.TENTATIVE ? 
        'tentative' : 
        'confirmed',
    attendees: localEvent.attendees.map(attendee => ({
      email: attendee.email,
      displayName: attendee.name,
      responseStatus: attendee.responseStatus,
      optional: attendee.optional
    })),
    recurrence: localEvent.recurrence || undefined,
    extendedProperties: {
      private: {
        ...localEvent.metadata,
        isAgentCreated: localEvent.isAgentCreated ? 'true' : 'false',
        localEventId: localEvent.eventId
      }
    }
  };

  return googleEvent;
}

/**
 * Merges properties from source event into target event, with conflict resolution
 * 
 * @param targetEvent - The event to merge into
 * @param sourceEvent - The event to merge from
 * @returns The merged event
 */
export function mergeEvents(
  targetEvent: ICalendarEvent,
  sourceEvent: ICalendarEvent
): ICalendarEvent {
  // Create a copy of the target event to avoid mutating the original
  const mergedEvent: ICalendarEvent = { ...targetEvent };

  // Merge simple properties
  for (const key in sourceEvent) {
    if (key === 'eventId' || key === 'calendarId') {
      // Preserve original IDs
      continue;
    }

    if (
      sourceEvent[key as keyof ICalendarEvent] !== null &&
      sourceEvent[key as keyof ICalendarEvent] !== undefined
    ) {
      // @ts-ignore - TypeScript can't infer this is safe
      mergedEvent[key] = sourceEvent[key];
    }
  }

  // Handle complex properties that need special merging logic
  if (sourceEvent.location && targetEvent.location) {
    mergedEvent.location = { ...targetEvent.location, ...sourceEvent.location };
  }

  if (sourceEvent.attendees && sourceEvent.attendees.length > 0) {
    // Merge attendees by email (as unique identifier)
    const attendeeMap = new Map<string, IEventAttendee>();
    
    targetEvent.attendees.forEach(attendee => {
      attendeeMap.set(attendee.email, attendee);
    });
    
    sourceEvent.attendees.forEach(attendee => {
      attendeeMap.set(attendee.email, attendee);
    });
    
    mergedEvent.attendees = Array.from(attendeeMap.values());
  }

  if (sourceEvent.metadata && Object.keys(sourceEvent.metadata).length > 0) {
    mergedEvent.metadata = { 
      ...targetEvent.metadata || {}, 
      ...sourceEvent.metadata 
    };
  }

  // Update last modified time
  mergedEvent.lastModified = toISOString(new Date());

  return mergedEvent;
}

/**
 * Finds calendar events that conflict with a given time range
 * 
 * @param events - Array of calendar events to check
 * @param startTime - Start time of the range to check
 * @param endTime - End time of the range to check
 * @returns Array of conflicting events
 */
export function findEventConflicts(
  events: ICalendarEvent[],
  startTime: string,
  endTime: string
): ICalendarEvent[] {
  // Convert input times to Date objects
  const start = new Date(startTime);
  const end = new Date(endTime);

  // Filter events that overlap with the given time range
  return events.filter(event => {
    // Skip cancelled events
    if (event.status === CALENDAR_EVENT_STATUS.CANCELLED) {
      return false;
    }

    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    return isOverlapping(start, end, eventStart, eventEnd);
  });
}

/**
 * Generates available time slots based on existing events
 * 
 * @param events - Array of calendar events to check against
 * @param startDate - Start date for the time slots
 * @param endDate - End date for the time slots
 * @param durationMinutes - Duration of each time slot in minutes
 * @returns Array of time slots with availability information
 */
export function generateTimeSlots(
  events: ICalendarEvent[],
  startDate: string,
  endDate: string,
  durationMinutes: number = DEFAULT_EVENT_DURATION_MINUTES
): ITimeSlot[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const slots: ITimeSlot[] = [];

  // Sort events by start time
  const sortedEvents = sortEventsByStartTime([...events]);

  // Generate time slots for each day in the range
  const currentDay = new Date(start);
  while (currentDay < end) {
    // For simplicity, use 9 AM to 5 PM for each day
    // This could be enhanced to use user preferences
    const dayStart = new Date(currentDay);
    dayStart.setHours(9, 0, 0, 0);
    
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(17, 0, 0, 0);

    // Skip if the day is outside the overall range
    if (dayStart >= end || dayEnd <= start) {
      currentDay.setDate(currentDay.getDate() + 1);
      continue;
    }

    // Adjust start and end times if needed
    const slotStart = dayStart < start ? start : dayStart;
    const slotEnd = dayEnd > end ? end : dayEnd;

    // Generate slots for this day
    let currentSlotStart = new Date(slotStart);
    while (currentSlotStart.getTime() + durationMinutes * 60 * 1000 <= slotEnd.getTime()) {
      const currentSlotEnd = new Date(
        currentSlotStart.getTime() + durationMinutes * 60 * 1000
      );

      // Check for conflicts with this slot
      const conflictingEvents = findEventConflicts(
        sortedEvents,
        toISOString(currentSlotStart),
        toISOString(currentSlotEnd)
      );

      slots.push({
        startTime: toISOString(currentSlotStart),
        endTime: toISOString(currentSlotEnd),
        available: conflictingEvents.length === 0,
        conflictingEvents
      });

      // Move to next slot
      currentSlotStart = new Date(
        currentSlotStart.getTime() + durationMinutes * 60 * 1000
      );
    }

    // Move to next day
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return slots;
}

/**
 * Sorts an array of calendar events by start time
 * 
 * @param events - Array of calendar events to sort
 * @returns Sorted array of events
 */
export function sortEventsByStartTime(events: ICalendarEvent[]): ICalendarEvent[] {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.startTime);
    const dateB = new Date(b.startTime);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Groups calendar events by day for display in calendar views
 * 
 * @param events - Array of calendar events to group
 * @returns Events grouped by date string (YYYY-MM-DD)
 */
export function groupEventsByDay(
  events: ICalendarEvent[]
): Record<string, ICalendarEvent[]> {
  const grouped: Record<string, ICalendarEvent[]> = {};

  events.forEach(event => {
    const date = new Date(event.startTime);
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!grouped[dateString]) {
      grouped[dateString] = [];
    }
    
    grouped[dateString].push(event);
  });

  // Sort events within each day
  for (const day in grouped) {
    grouped[day] = sortEventsByStartTime(grouped[day]);
  }

  return grouped;
}

/**
 * Filters events to include only those from specified calendars
 * 
 * @param events - Array of calendar events to filter
 * @param calendarIds - Array of calendar IDs to include
 * @returns Filtered events
 */
export function filterEventsByCalendar(
  events: ICalendarEvent[],
  calendarIds: string[]
): ICalendarEvent[] {
  if (!calendarIds || calendarIds.length === 0) {
    return events;
  }

  return events.filter(event => calendarIds.includes(event.calendarId));
}

/**
 * Filters events to include only those within a specified date range
 * 
 * @param events - Array of calendar events to filter
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @returns Filtered events
 */
export function filterEventsByDateRange(
  events: ICalendarEvent[],
  startDate: string,
  endDate: string
): ICalendarEvent[] {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return events.filter(event => {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    // Include if event starts before range end AND event ends after range start
    return eventStart < end && eventEnd > start;
  });
}

/**
 * Calculates the duration of an event in minutes
 * 
 * @param event - The calendar event
 * @returns Duration in minutes
 */
export function getEventDuration(event: ICalendarEvent): number {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  
  return Math.round((end.getTime() - start.getTime()) / (60 * 1000));
}

/**
 * Checks if an event has already occurred
 * 
 * @param event - The calendar event
 * @returns True if the event is in the past
 */
export function isEventInPast(event: ICalendarEvent): boolean {
  const now = new Date();
  const eventEnd = new Date(event.endTime);
  
  return eventEnd < now;
}

/**
 * Checks if an event has been cancelled
 * 
 * @param event - The calendar event
 * @returns True if the event is cancelled
 */
export function isEventCancelled(event: ICalendarEvent): boolean {
  return event.status === CALENDAR_EVENT_STATUS.CANCELLED;
}

/**
 * Formats an event for display in the UI
 * 
 * @param event - The calendar event to format
 * @returns Formatted event with display-friendly properties
 */
export function formatEventForDisplay(event: ICalendarEvent): any {
  const formattedEvent = { ...event };
  
  // Add formatted start and end times
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  
  formattedEvent.formattedDate = startDate.toLocaleDateString();
  formattedEvent.formattedStartTime = startDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit'
  });
  formattedEvent.formattedEndTime = endDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  formattedEvent.formattedTimeRange = 
    `${formattedEvent.formattedStartTime} - ${formattedEvent.formattedEndTime}`;
  
  // Add duration in minutes
  formattedEvent.durationMinutes = getEventDuration(event);
  
  // Add flags for easy UI rendering
  formattedEvent.isPast = isEventInPast(event);
  formattedEvent.isCancelled = isEventCancelled(event);
  
  // Format location
  formattedEvent.formattedLocation = event.location ? 
    `${event.location.name}${event.location.address ? ' - ' + event.location.address : ''}` : 
    '';
  
  // Format attendees
  formattedEvent.formattedAttendees = event.attendees.map(a => a.name || a.email).join(', ');
  
  return formattedEvent;
}