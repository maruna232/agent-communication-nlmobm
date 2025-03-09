import { v4 as uuidv4 } from 'uuid';
import { 
  ICalendarEvent, 
  ICalendar, 
  ICalendarCredentials, 
  IEventAttendee,
  ITimeSlot,
  IAvailabilityRequest,
  IAvailabilityResponse,
  GoogleCalendarScope
} from '../lib/types/calendar.types';
import { Location } from '../lib/types/agent.types';

// Mock Google API configuration
export const MOCK_GOOGLE_API_CONFIG = {
  CLIENT_ID: 'mock-client-id',
  API_KEY: 'mock-api-key',
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
  SCOPES: {
    READ_ONLY: 'https://www.googleapis.com/auth/calendar.readonly',
    READ_WRITE: 'https://www.googleapis.com/auth/calendar'
  }
};

// Mock calendar data
export const mockCalendars: ICalendar[] = [
  {
    calendarId: 'primary',
    googleCalendarId: 'primary',
    title: 'Primary Calendar',
    description: "User's primary calendar",
    color: '#4285F4',
    isSelected: true,
    isReadOnly: false,
    isPrimary: true
  },
  {
    calendarId: 'work',
    googleCalendarId: 'work@example.com',
    title: 'Work Calendar',
    description: 'Work-related events',
    color: '#0B8043',
    isSelected: true,
    isReadOnly: false,
    isPrimary: false
  },
  {
    calendarId: 'personal',
    googleCalendarId: 'personal@example.com',
    title: 'Personal Calendar',
    description: 'Personal events',
    color: '#8E24AA',
    isSelected: true,
    isReadOnly: false,
    isPrimary: false
  }
];

// Mock event data
export const mockEvents: ICalendarEvent[] = [
  {
    eventId: 'event1',
    calendarId: 'primary',
    googleEventId: 'google_event1',
    title: 'Team Meeting',
    description: 'Weekly team sync',
    startTime: '2023-06-01T10:00:00Z',
    endTime: '2023-06-01T11:00:00Z',
    location: {
      name: 'Conference Room A',
      address: '123 Main St'
    } as Location,
    status: 'confirmed',
    isAgentCreated: false,
    attendees: [
      {
        email: 'user@example.com',
        name: 'User',
        responseStatus: 'accepted',
        optional: false
      },
      {
        email: 'colleague@example.com',
        name: 'Colleague',
        responseStatus: 'accepted',
        optional: false
      }
    ],
    recurrence: null,
    lastModified: '2023-05-25T12:00:00Z',
    lastSynced: '2023-05-25T12:00:00Z',
    metadata: {}
  },
  {
    eventId: 'event2',
    calendarId: 'work',
    googleEventId: 'google_event2',
    title: 'Project Review',
    description: 'Monthly project status review',
    startTime: '2023-06-02T14:00:00Z',
    endTime: '2023-06-02T15:30:00Z',
    location: {
      name: 'Conference Room B',
      address: '123 Main St'
    } as Location,
    status: 'confirmed',
    isAgentCreated: false,
    attendees: [
      {
        email: 'user@example.com',
        name: 'User',
        responseStatus: 'accepted',
        optional: false
      },
      {
        email: 'manager@example.com',
        name: 'Manager',
        responseStatus: 'accepted',
        optional: false
      }
    ],
    recurrence: null,
    lastModified: '2023-05-26T12:00:00Z',
    lastSynced: '2023-05-26T12:00:00Z',
    metadata: {}
  },
  {
    eventId: 'event3',
    calendarId: 'personal',
    googleEventId: 'google_event3',
    title: 'Doctor Appointment',
    description: 'Annual checkup',
    startTime: '2023-06-03T09:00:00Z',
    endTime: '2023-06-03T10:00:00Z',
    location: {
      name: 'Medical Center',
      address: '456 Health Ave'
    } as Location,
    status: 'confirmed',
    isAgentCreated: true,
    attendees: [
      {
        email: 'user@example.com',
        name: 'User',
        responseStatus: 'accepted',
        optional: false
      }
    ],
    recurrence: null,
    lastModified: '2023-05-27T12:00:00Z',
    lastSynced: '2023-05-27T12:00:00Z',
    metadata: {}
  }
];

// Mock implementation of Google API initialization
export const mockInitGoogleApi = async (): Promise<void> => {
  // Just return a resolved promise to simulate successful initialization
  return Promise.resolve();
};

// Mock implementation of Google Calendar authorization
export const mockAuthorizeGoogleCalendar = async (
  userId: string,
  scope: GoogleCalendarScope
): Promise<ICalendarCredentials> => {
  // Return mock credentials
  return {
    accessToken: `mock-access-token-${userId}-${Date.now()}`,
    refreshToken: `mock-refresh-token-${userId}`,
    expiresAt: Date.now() + 3600000, // 1 hour from now
    scope: scope
  };
};

// Mock implementation of token refresh
export const mockRefreshGoogleCalendarToken = async (
  credentials: ICalendarCredentials
): Promise<ICalendarCredentials> => {
  // Return updated mock credentials
  return {
    ...credentials,
    accessToken: `mock-access-token-refreshed-${Date.now()}`,
    expiresAt: Date.now() + 3600000 // 1 hour from now
  };
};

// Mock implementation of access revocation
export const mockRevokeGoogleCalendarAccess = async (
  userId: string,
  credentials: ICalendarCredentials
): Promise<boolean> => {
  // Just return true to indicate successful revocation
  return true;
};

// Mock implementation of Google Calendar mapping function
export const mockMapGoogleCalendarToCalendar = (googleCalendar: any): ICalendar => {
  // Return a pre-defined mock calendar
  return mockCalendars[0];
};

// Mock implementation of Google Event mapping function
export const mockMapGoogleEventToCalendarEvent = (googleEvent: any, calendarId: string): ICalendarEvent => {
  // Return a pre-defined mock event
  return mockEvents[0];
};

// Mock implementation of Calendar Event to Google format mapping function
export const mockMapCalendarEventToGoogleEvent = (event: ICalendarEvent): object => {
  // Return a simplified object with the same properties
  return { ...event };
};

// Helper function to generate time slots for availability testing
const getTimeSlots = (startDate: string, endDate: string, durationMinutes: number): ITimeSlot[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const slots: ITimeSlot[] = [];
  
  let currentSlotStart = new Date(start);
  
  while (currentSlotStart < end) {
    const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMinutes * 60000);
    
    if (currentSlotEnd > end) {
      break;
    }
    
    slots.push({
      startTime: currentSlotStart.toISOString(),
      endTime: currentSlotEnd.toISOString(),
      available: true,
      conflictingEvents: []
    });
    
    currentSlotStart = currentSlotEnd;
  }
  
  return slots;
};

// Helper function to find conflicts between events and time slots
const findEventConflicts = (timeSlots: ITimeSlot[], events: ICalendarEvent[]): ITimeSlot[] => {
  return timeSlots.map(slot => {
    const slotStart = new Date(slot.startTime).getTime();
    const slotEnd = new Date(slot.endTime).getTime();
    
    // Find conflicting events
    const conflictingEvents = events.filter(event => {
      const eventStart = new Date(event.startTime).getTime();
      const eventEnd = new Date(event.endTime).getTime();
      
      // Check for overlap
      return (eventStart < slotEnd && eventEnd > slotStart);
    });
    
    return {
      ...slot,
      available: conflictingEvents.length === 0,
      conflictingEvents
    };
  });
};

/**
 * Mock implementation of the GoogleCalendarClient for testing
 */
export class MockGoogleCalendarClient {
  private credentials: ICalendarCredentials;
  private initialized: boolean = false;
  private _mockCalendars: ICalendar[] = [...mockCalendars];
  private _mockEvents: ICalendarEvent[] = [...mockEvents];
  private _syncToken: string = `mock-sync-token-${Date.now()}`;
  
  constructor(credentials: ICalendarCredentials) {
    this.credentials = credentials;
  }
  
  /**
   * Mock implementation of the initialize method
   */
  async initialize(): Promise<void> {
    this.initialized = true;
    return Promise.resolve();
  }
  
  /**
   * Mock implementation of the getCalendars method
   */
  async getCalendars(): Promise<ICalendar[]> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }
    
    return Promise.resolve([...this._mockCalendars]);
  }
  
  /**
   * Mock implementation of the getEvents method
   */
  async getEvents(
    calendarId: string,
    timeMin?: string,
    timeMax?: string,
    syncToken?: string
  ): Promise<{ events: ICalendarEvent[], syncToken: string, deletedEventIds: string[] }> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }
    
    // Filter events by calendarId
    let filteredEvents = this._mockEvents.filter(event => event.calendarId === calendarId);
    
    // Filter by timeMin and timeMax if provided
    if (timeMin) {
      const minTime = new Date(timeMin).getTime();
      filteredEvents = filteredEvents.filter(
        event => new Date(event.endTime).getTime() > minTime
      );
    }
    
    if (timeMax) {
      const maxTime = new Date(timeMax).getTime();
      filteredEvents = filteredEvents.filter(
        event => new Date(event.startTime).getTime() < maxTime
      );
    }
    
    // Generate a new sync token
    const newSyncToken = `mock-sync-token-${Date.now()}`;
    
    return Promise.resolve({
      events: filteredEvents,
      syncToken: newSyncToken,
      deletedEventIds: []
    });
  }
  
  /**
   * Mock implementation of the createEvent method
   */
  async createEvent(event: ICalendarEvent): Promise<ICalendarEvent> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }
    
    // Create a copy with a mock Google event ID
    const createdEvent: ICalendarEvent = {
      ...event,
      googleEventId: `google-${uuidv4()}`,
      lastModified: new Date().toISOString(),
      lastSynced: new Date().toISOString()
    };
    
    // Add to mock events
    this._mockEvents.push(createdEvent);
    
    return Promise.resolve(createdEvent);
  }
  
  /**
   * Mock implementation of the updateEvent method
   */
  async updateEvent(event: ICalendarEvent): Promise<ICalendarEvent> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }
    
    // Find the event in mock events
    const existingEventIndex = this._mockEvents.findIndex(e => e.eventId === event.eventId);
    
    if (existingEventIndex === -1) {
      throw new Error(`Event with ID ${event.eventId} not found`);
    }
    
    // Update the event
    const updatedEvent: ICalendarEvent = {
      ...event,
      lastModified: new Date().toISOString(),
      lastSynced: new Date().toISOString()
    };
    
    this._mockEvents[existingEventIndex] = updatedEvent;
    
    return Promise.resolve(updatedEvent);
  }
  
  /**
   * Mock implementation of the deleteEvent method
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }
    
    // Find the event index
    const eventIndex = this._mockEvents.findIndex(
      e => e.calendarId === calendarId && e.eventId === eventId
    );
    
    if (eventIndex === -1) {
      throw new Error(`Event with ID ${eventId} in calendar ${calendarId} not found`);
    }
    
    // Remove the event
    this._mockEvents.splice(eventIndex, 1);
    
    return Promise.resolve(true);
  }
  
  /**
   * Mock implementation of the checkAvailability method
   */
  async checkAvailability(request: IAvailabilityRequest): Promise<IAvailabilityResponse> {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }
    
    const { userId, startDate, endDate, timeSlotDuration, calendarIds } = request;
    
    // Generate time slots
    let timeSlots = getTimeSlots(startDate, endDate, timeSlotDuration);
    
    // Find events in the requested time range and calendars
    const eventsInRange = this._mockEvents.filter(event => {
      const eventStart = new Date(event.startTime).getTime();
      const eventEnd = new Date(event.endTime).getTime();
      const rangeStart = new Date(startDate).getTime();
      const rangeEnd = new Date(endDate).getTime();
      
      return (
        calendarIds.includes(event.calendarId) &&
        eventStart < rangeEnd && 
        eventEnd > rangeStart
      );
    });
    
    // Mark time slots as unavailable if they conflict with events
    timeSlots = findEventConflicts(timeSlots, eventsInRange);
    
    return Promise.resolve({
      userId,
      timeSlots,
      startDate,
      endDate
    });
  }
}