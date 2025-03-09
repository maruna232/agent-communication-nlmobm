import { useEffect, useCallback, useMemo } from 'react'; // v18.0.0
import {
  useCalendarStore,
  ICalendar,
  ICalendarEvent,
  ICalendarSyncInfo,
  ICreateEventRequest,
  IUpdateEventRequest,
  IDeleteEventRequest,
  IAvailabilityRequest,
} from '../store/calendarStore';
import { useAuth } from './useAuth';
import {
  ICalendarEvent as ICalendarEventInterface,
  ICalendar as ICalendarInterface,
  ICalendarSyncInfo as ICalendarSyncInfoInterface,
} from '../lib/types/calendar.types';
import { GoogleCalendarScope } from '../lib/types/calendar.types';
import { CALENDAR_SYNC_STATUS } from '../lib/constants';

/**
 * Interface for the return value of the useCalendar hook
 */
interface UseCalendarReturn {
  calendars: ICalendar[];
  events: ICalendarEvent[];
  syncInfo: ICalendarSyncInfo;
  loading: boolean;
  error: string | null;
  connectCalendar: (userId: string, scope: GoogleCalendarScope) => Promise<boolean>;
  disconnectCalendar: (userId: string) => Promise<boolean>;
  getCalendars: (userId: string) => Promise<ICalendar[]>;
  getEvents: (userId: string, calendarIds: string[], timeMin: string, timeMax: string) => Promise<ICalendarEvent[]>;
  createEvent: (userId: string, request: ICreateEventRequest) => Promise<ICalendarEvent>;
  updateEvent: (userId: string, request: IUpdateEventRequest) => Promise<ICalendarEvent>;
  deleteEvent: (userId: string, request: IDeleteEventRequest) => Promise<boolean>;
  checkAvailability: (userId: string, request: IAvailabilityRequest) => Promise<any>;
  selectCalendar: (userId: string, calendarId: string, selected: boolean) => Promise<boolean>;
  startSync: (userId: string, calendarIds: string[]) => Promise<boolean>;
  stopSync: (userId: string) => Promise<boolean>;
  syncNow: (userId: string, calendarIds: string[], fullSync?: boolean) => Promise<any>;
  isCalendarConnected: () => boolean;
  isSyncing: () => boolean;
  getSelectedCalendars: () => ICalendar[];
}

/**
 * Custom React hook that provides calendar functionality
 * @returns {object} Calendar state and actions for components
 */
export const useCalendar = (): UseCalendarReturn => {
  // LD1: Get calendar state and actions from useCalendarStore
  const {
    calendars,
    events,
    syncInfo,
    loading,
    error,
    connectCalendar: connectCalendarAction,
    disconnectCalendar: disconnectCalendarAction,
    getCalendars: getCalendarsAction,
    getEvents: getEventsAction,
    createEvent: createEventAction,
    updateEvent: updateEventAction,
    deleteEvent: deleteEventAction,
    checkAvailability: checkAvailabilityAction,
    selectCalendar: selectCalendarAction,
    initializeSync,
    startSync: startSyncAction,
    stopSync: stopSyncAction,
    syncNow: syncNowAction,
    setCalendars,
    setEvents,
    setSyncInfo,
    setLoading,
    setError,
  } = useCalendarStore();

  // LD1: Get authentication state from useAuth hook
  const { user, isAuthenticated } = useAuth();

  // LD1: Initialize calendar synchronization on component mount if user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeSync(user.userId);
    }
  }, [isAuthenticated, user, initializeSync]);

  // LD1: Memoize connectCalendar function to prevent unnecessary re-renders
  const connectCalendar = useCallback(
    async (scope: GoogleCalendarScope) => {
      if (user) {
        return connectCalendarAction(user.userId, scope);
      }
      return false;
    },
    [connectCalendarAction, user]
  );

  // LD1: Memoize disconnectCalendar function to prevent unnecessary re-renders
  const disconnectCalendar = useCallback(
    async () => {
      if (user) {
        return disconnectCalendarAction(user.userId);
      }
      return false;
    },
    [disconnectCalendarAction, user]
  );

  // LD1: Memoize getCalendars function to prevent unnecessary re-renders
  const getCalendars = useCallback(
    async () => {
      if (user) {
        return getCalendarsAction(user.userId);
      }
      return [];
    },
    [getCalendarsAction, user]
  );

  // LD1: Memoize getEvents function to prevent unnecessary re-renders
  const getEvents = useCallback(
    async (calendarIds: string[], timeMin: string, timeMax: string) => {
      if (user) {
        return getEventsAction(user.userId, calendarIds, timeMin, timeMax);
      }
      return [];
    },
    [getEventsAction, user]
  );

  // LD1: Memoize createEvent function to prevent unnecessary re-renders
  const createEvent = useCallback(
    async (request: ICreateEventRequest) => {
      if (user) {
        return createEventAction(user.userId, request);
      }
      return null as any;
    },
    [createEventAction, user]
  );

  // LD1: Memoize updateEvent function to prevent unnecessary re-renders
  const updateEvent = useCallback(
    async (request: IUpdateEventRequest) => {
      if (user) {
        return updateEventAction(user.userId, request);
      }
      return null as any;
    },
    [updateEventAction, user]
  );

  // LD1: Memoize deleteEvent function to prevent unnecessary re-renders
  const deleteEvent = useCallback(
    async (request: IDeleteEventRequest) => {
      if (user) {
        return deleteEventAction(user.userId, request);
      }
      return false;
    },
    [deleteEventAction, user]
  );

  // LD1: Memoize checkAvailability function to prevent unnecessary re-renders
  const checkAvailability = useCallback(
    async (request: IAvailabilityRequest) => {
      if (user) {
        return checkAvailabilityAction(user.userId, request);
      }
      return null as any;
    },
    [checkAvailabilityAction, user]
  );

  // LD1: Memoize selectCalendar function to prevent unnecessary re-renders
  const selectCalendar = useCallback(
    async (calendarId: string, selected: boolean) => {
      if (user) {
        return selectCalendarAction(user.userId, calendarId, selected);
      }
      return false;
    },
    [selectCalendarAction, user]
  );

    // LD1: Memoize startSync function to prevent unnecessary re-renders
    const startSync = useCallback(
      async (calendarIds: string[]) => {
        if (user) {
          return startSyncAction(user.userId, calendarIds);
        }
        return false;
      },
      [startSyncAction, user]
    );
  
    // LD1: Memoize stopSync function to prevent unnecessary re-renders
    const stopSync = useCallback(
      async () => {
        if (user) {
          return stopSyncAction(user.userId);
        }
        return false;
      },
      [stopSyncAction, user]
    );
  
    // LD1: Memoize syncNow function to prevent unnecessary re-renders
    const syncNow = useCallback(
      async (calendarIds: string[], fullSync?: boolean) => {
        if (user) {
          return syncNowAction(user.userId, calendarIds, fullSync);
        }
        return null as any;
      },
      [syncNowAction, user]
    );

  // LD1: Memoize isCalendarConnected function to check if calendar is connected
  const isCalendarConnected = useCallback(() => {
    return syncInfo?.status !== CALENDAR_SYNC_STATUS.NOT_CONNECTED;
  }, [syncInfo?.status]);

  // LD1: Memoize isSyncing function to check if calendar is currently syncing
  const isSyncing = useCallback(() => {
    return syncInfo?.status === CALENDAR_SYNC_STATUS.SYNCING;
  }, [syncInfo?.status]);

  // LD1: Memoize getSelectedCalendars function to get only selected calendars
  const getSelectedCalendars = useCallback(() => {
    return calendars?.filter((calendar) => calendar.isSelected) || [];
  }, [calendars]);

  // LD1: Return calendar state and memoized actions
  return {
    calendars,
    events,
    syncInfo,
    loading,
    error,
    connectCalendar,
    disconnectCalendar,
    getCalendars,
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    checkAvailability,
    selectCalendar,
    startSync,
    stopSync,
    syncNow,
    isCalendarConnected,
    isSyncing,
    getSelectedCalendars,
  };
};