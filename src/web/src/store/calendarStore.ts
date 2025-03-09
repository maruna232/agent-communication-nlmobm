import { create } from 'zustand'; // v4.4.0
import { persist } from 'zustand/middleware'; // v4.4.0
import { createJSONStorage } from 'zustand/middleware'; // v4.4.0

import {
  ICalendarState,
  ICalendarActions,
  ICalendar,
  ICalendarEvent,
  ICalendarSyncInfo,
  ICreateEventRequest,
  IUpdateEventRequest,
  IDeleteEventRequest,
  IAvailabilityRequest,
  GoogleCalendarScope
} from '../lib/types/calendar.types';
import { CALENDAR_SYNC_STATUS, STORAGE_KEYS } from '../lib/constants';
import { CalendarService } from '../services/calendar.service';
import { useAuthStore } from './authStore';
import { toISOString, fromISOString } from '../lib/utils/dateTime';

/**
 * Defines the structure of the calendar store
 */
type CalendarStore = ICalendarState & ICalendarActions;

/**
 * Returns the initial calendar state
 * @returns Initial calendar state
 */
const getInitialState = (): ICalendarState => ({
  calendars: [],
  events: [],
  syncInfo: null,
  loading: false,
  error: null,
});

/**
 * Creates a slice of the calendar store related to calendar state
 * @param set Zustand set function
 * @param get Zustand get function
 * @returns Calendar state slice with state setters
 */
const createCalendarSlice = (set: any, get: any) => ({
  calendars: [],
  events: [],
  syncInfo: null,
  loading: false,
  error: null,
  setCalendars: (calendars: ICalendar[]) => set({ calendars }),
  setEvents: (events: ICalendarEvent[]) => set({ events }),
  setSyncInfo: (syncInfo: ICalendarSyncInfo | null) => set({ syncInfo }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
});

/**
 * Creates a slice of the calendar store related to calendar actions
 * @param set Zustand set function
 * @param get Zustand get function
 * @returns Calendar actions slice
 */
const createCalendarActionsSlice = (set: any, get: any): ICalendarActions => {
  const calendarService = new CalendarService();

  return {
    initializeSync: async (userId: string) => {
      try {
        set({ loading: true, error: null });
        await calendarService.initialize();
        const syncInfo = await calendarService.getSyncStatus(userId);
        set({ syncInfo, loading: false });
        return syncInfo;
      } catch (error: any) {
        set({ error: error.message || 'Failed to initialize calendar sync', loading: false });
      }
    },
    connectCalendar: async (userId: string, scope: GoogleCalendarScope) => {
      try {
        set({ loading: true, error: null });
        const success = await calendarService.connectCalendar(userId, scope);
        if (success) {
          const calendars = await calendarService.getCalendars(userId);
          set({ calendars, loading: false, error: null });
        }
        return success;
      } catch (error: any) {
        set({ error: error.message || 'Failed to connect to Google Calendar', loading: false });
        return false;
      }
    },
    disconnectCalendar: async (userId: string) => {
      try {
        set({ loading: true, error: null });
        const success = await calendarService.disconnectCalendar(userId);
        if (success) {
          set({ calendars: [], events: [], syncInfo: null, loading: false, error: null });
        }
        return success;
      } catch (error: any) {
        set({ error: error.message || 'Failed to disconnect from Google Calendar', loading: false });
        return false;
      }
    },
    getCalendars: async (userId: string) => {
      try {
        set({ loading: true, error: null });
        const calendars = await calendarService.getCalendars(userId);
        set({ calendars, loading: false, error: null });
        return calendars;
      } catch (error: any) {
        set({ error: error.message || 'Failed to get calendars', loading: false });
      }
    },
    getEvents: async (userId: string, calendarIds: string[], timeMin: string, timeMax: string) => {
      try {
        set({ loading: true, error: null });
        const events = await calendarService.getEvents(userId, calendarIds, timeMin, timeMax);
        set({ events, loading: false, error: null });
        return events;
      } catch (error: any) {
        set({ error: error.message || 'Failed to get events', loading: false });
      }
    },
    createEvent: async (userId: string, request: ICreateEventRequest) => {
      try {
        set({ loading: true, error: null });
        const event = await calendarService.createEvent(userId, request);
        set((state: CalendarStore) => ({ events: [...state.events, event], loading: false, error: null }));
        return event;
      } catch (error: any) {
        set({ error: error.message || 'Failed to create event', loading: false });
      }
    },
    updateEvent: async (userId: string, request: IUpdateEventRequest) => {
      try {
        set({ loading: true, error: null });
        const updatedEvent = await calendarService.updateEvent(userId, request);
        set((state: CalendarStore) => ({
          events: state.events.map(event => (event.eventId === request.eventId ? updatedEvent : event)),
          loading: false,
          error: null,
        }));
        return updatedEvent;
      } catch (error: any) {
        set({ error: error.message || 'Failed to update event', loading: false });
      }
    },
    deleteEvent: async (userId: string, request: IDeleteEventRequest) => {
      try {
        set({ loading: true, error: null });
        const success = await calendarService.deleteEvent(userId, request);
        if (success) {
          set((state: CalendarStore) => ({
            events: state.events.filter(event => event.eventId !== request.eventId),
            loading: false,
            error: null,
          }));
        }
        return success;
      } catch (error: any) {
        set({ error: error.message || 'Failed to delete event', loading: false });
        return false;
      }
    },
    checkAvailability: async (userId: string, request: IAvailabilityRequest) => {
      try {
        set({ loading: true, error: null });
        const availability = await calendarService.checkAvailability(userId, request);
        set({ loading: false, error: null });
        return availability;
      } catch (error: any) {
        set({ error: error.message || 'Failed to check availability', loading: false });
      }
    },
    selectCalendar: async (userId: string, calendarId: string, selected: boolean) => {
      try {
        set({ loading: true, error: null });
        const success = await calendarService.selectCalendar(userId, calendarId, selected);
        if (success) {
          set((state: CalendarStore) => ({
            calendars: state.calendars.map(calendar =>
              calendar.calendarId === calendarId ? { ...calendar, isSelected: selected } : calendar
            ),
            loading: false,
            error: null,
          }));
        }
        return success;
      } catch (error: any) {
        set({ error: error.message || 'Failed to select calendar', loading: false });
        return false;
      }
    },
    startSync: async (userId: string, calendarIds: string[]) => {
      try {
        set({ loading: true, error: null });
        const success = await calendarService.startSync(userId, calendarIds);
        set({ loading: false, error: null });
        return success;
      } catch (error: any) {
        set({ error: error.message || 'Failed to start calendar sync', loading: false });
        return false;
      }
    },
    stopSync: async (userId: string) => {
      try {
        set({ loading: true, error: null });
        const success = await calendarService.stopSync(userId);
        set({ loading: false, error: null });
        return success;
      } catch (error: any) {
        set({ error: error.message || 'Failed to stop calendar sync', loading: false });
        return false;
      }
    },
    syncNow: async (userId: string, calendarIds: string[], fullSync: boolean = false) => {
      try {
        set({ loading: true, error: null });
        const syncResponse = await calendarService.syncCalendars(userId, calendarIds, fullSync);
        set({ loading: false, error: null });
        return syncResponse;
      } catch (error: any) {
        set({ error: error.message || 'Failed to sync calendars', loading: false });
      }
    },
  };
};

/**
 * Global state store for calendar management
 */
export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      ...createCalendarSlice(set, get),
      ...createCalendarActionsSlice(set, get),
    }),
    {
      name: 'calendar-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        calendars: state.calendars,
        events: state.events,
        syncInfo: state.syncInfo,
      }),
    }
  )
);