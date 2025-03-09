import { NextRequest, NextResponse } from 'next/server'; // next/server v14.0+
import { CalendarService } from '../../../services/calendar.service';
import { authService } from '../../../services/auth.service';
import { StorageService } from '../../../services/storage.service';
import {
  ICreateEventRequest,
  IUpdateEventRequest,
  IDeleteEventRequest,
  IAvailabilityRequest,
  ICalendarSyncRequest,
  GoogleCalendarScope,
  ICalendarSyncRequest
} from '../../../lib/types/calendar.types';
import { createCalendarError } from '../../../lib/utils/errorHandling';

// Initialize services
const storageService = new StorageService();
const calendarService = new CalendarService();

/**
 * Initializes the required services if they haven't been initialized yet
 * @returns Promise resolving to true if initialization was successful
 */
async function initializeServices(): Promise<boolean> {
  if (!storageService.isInitialized()) {
    await storageService.initialize();
  }

  if (!calendarService.isInitialized()) {
    await calendarService.initialize();
  }

  return true;
}

/**
 * Verifies that the user is authenticated before processing calendar operations
 * @returns Promise resolving to true if user is authenticated
 */
async function verifyAuthentication(): Promise<boolean> {
  if (!(await authService.isAuthenticated())) {
    throw createCalendarError('User not authenticated', {
      code: 'auth/unauthorized',
      status: 401
    });
  }
  return true;
}

/**
 * Handles errors in API routes and returns appropriate responses
 * @param error The error to handle
 * @returns Error response with appropriate status code and message
 */
function handleError(error: any): NextResponse {
  let status = 500;
  let message = 'Internal Server Error';

  if (error.message === 'User not authenticated') {
    status = 401;
    message = 'Unauthorized';
  } else if (error.message.includes('Invalid') || error.message.includes('missing')) {
    status = 400;
    message = 'Bad Request: ' + error.message;
  } else if (error.message.includes('not found')) {
    status = 404;
    message = 'Not Found: ' + error.message;
  } else if (error.message.includes('Google Calendar API')) {
    status = 502;
    message = 'Bad Gateway: ' + error.message;
  } else {
    message = 'Internal Server Error: ' + error.message;
  }

  return NextResponse.json({ error: message }, { status });
}

/**
 * Handle GET requests for calendar operations including fetching calendars, events, and availability
 * @param request Next.js API request
 * @returns JSON response with requested calendar data or error
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize services if not already initialized
    await initializeServices();

    // Verify user authentication
    await verifyAuthentication();

    // Extract operation type from URL search parameters
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');

    // Extract userId from authenticated user
    const user = await authService.getCurrentUser();
    const userId = user?.userId;

    if (!userId) {
      throw createCalendarError('User ID not found', {
        code: 'user/not-found',
        status: 404
      });
    }

    let data;

    // Call appropriate calendarService method based on operation type
    switch (operation) {
      case 'calendars':
        data = await calendarService.getCalendars(userId);
        break;
      case 'events':
        const calendarIds = searchParams.getAll('calendarId');
        const timeMin = searchParams.get('timeMin') as string;
        const timeMax = searchParams.get('timeMax') as string;
        data = await calendarService.getEvents(userId, calendarIds, timeMin, timeMax);
        break;
      case 'availability':
        const startDate = searchParams.get('startDate') as string;
        const endDate = searchParams.get('endDate') as string;
        const calendarIdsAvailability = searchParams.getAll('calendarId');
        const timeSlotDuration = parseInt(searchParams.get('timeSlotDuration') || '30', 10);

        const availabilityRequest: IAvailabilityRequest = {
          userId,
          startDate,
          endDate,
          calendarIds: calendarIdsAvailability,
          timeSlotDuration
        };
        data = await calendarService.checkAvailability(userId, availabilityRequest);
        break;
      case 'sync-status':
          data = await calendarService.getSyncStatus(userId);
          break;
      default:
        throw createCalendarError('Invalid operation', {
          code: 'operation/invalid',
          status: 400
        });
    }

    // Return NextResponse with JSON data and 200 status code
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    // Handle errors by returning appropriate error responses with status codes
    return handleError(error);
  }
}

/**
 * Handles POST requests for calendar operations including connecting calendar, creating events, and syncing
 * @param request Next.js API request
 * @returns JSON response with operation result or error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize services if not already initialized
    await initializeServices();

    // Verify user authentication
    await verifyAuthentication();

    // Extract operation type from URL search parameters
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');

    // Extract userId from authenticated user
    const user = await authService.getCurrentUser();
    const userId = user?.userId;

    if (!userId) {
      throw createCalendarError('User ID not found', {
        code: 'user/not-found',
        status: 404
      });
    }

    // Parse request body as JSON
    const body = await request.json();

    let data;
    let status = 200;

    // Call appropriate calendarService method based on operation type
    switch (operation) {
      case 'connect':
        const scope = body.scope as GoogleCalendarScope;
        data = await calendarService.connectCalendar(userId, scope);
        break;
      case 'create-event':
        const createEventRequest: ICreateEventRequest = body;
        data = await calendarService.createEvent(userId, createEventRequest);
        status = 201; // Created
        break;
      case 'sync':
        const syncRequest: ICalendarSyncRequest = body;
        data = await calendarService.syncCalendars(userId, syncRequest.calendarIds, syncRequest.fullSync);
        break;
      default:
        throw createCalendarError('Invalid operation', {
          code: 'operation/invalid',
          status: 400
        });
    }

    // Return NextResponse with JSON result and 200/201 status code
    return NextResponse.json({ data }, { status });
  } catch (error) {
    // Handle errors by returning appropriate error responses with status codes
    return handleError(error);
  }
}

/**
 * Handles PUT requests for updating calendar events
 * @param request Next.js API request
 * @returns JSON response with updated event or error
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize services if not already initialized
    await initializeServices();

    // Verify user authentication
    await verifyAuthentication();

    // Extract userId from authenticated user
    const user = await authService.getCurrentUser();
    const userId = user?.userId;

    if (!userId) {
      throw createCalendarError('User ID not found', {
        code: 'user/not-found',
        status: 404
      });
    }

    // Parse request body as JSON
    const body = await request.json();

    // Validate request body against IUpdateEventRequest
    const updateEventRequest: IUpdateEventRequest = body;

    // Call calendarService.updateEvent with userId and request body
    const data = await calendarService.updateEvent(userId, updateEventRequest);

    // Return NextResponse with updated event and 200 status code
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    // Handle errors by returning appropriate error responses with status codes
    return handleError(error);
  }
}

/**
 * Handles DELETE requests for removing calendar events
 * @param request Next.js API request
 * @returns JSON response with deletion result or error
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize services if not already initialized
    await initializeServices();

    // Verify user authentication
    await verifyAuthentication();

    // Extract userId from authenticated user
    const user = await authService.getCurrentUser();
    const userId = user?.userId;

    if (!userId) {
      throw createCalendarError('User ID not found', {
        code: 'user/not-found',
        status: 404
      });
    }

    // Parse URL search parameters for eventId and calendarId
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const calendarId = searchParams.get('calendarId');

    // Validate that both eventId and calendarId are provided
    if (!eventId || !calendarId) {
      throw createCalendarError('Event ID and Calendar ID are required', {
        code: 'request/invalid',
        status: 400
      });
    }

    // Create delete request object conforming to IDeleteEventRequest
    const deleteRequest: IDeleteEventRequest = {
      eventId,
      calendarId
    };

    // Call calendarService.deleteEvent with userId and delete request
    const data = await calendarService.deleteEvent(userId, deleteRequest);

    // Return NextResponse with success message and 200 status code
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    // Handle errors by returning appropriate error responses with status codes
    return handleError(error);
  }
}