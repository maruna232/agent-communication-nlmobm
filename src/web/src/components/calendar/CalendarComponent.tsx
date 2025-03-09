import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react v18.2.0
import classNames from 'classnames'; // ^2.3.2

import { useCalendar } from '../../hooks/useCalendar';
import { useAuth } from '../../hooks/useAuth';
import { CalendarDayView } from './CalendarDayView';
import { PendingApprovals } from './PendingApprovals';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import { Loading } from '../common/Loading';
import { ICalendarEvent, ICreateEventRequest } from '../../lib/types/calendar.types';
import { CALENDAR_SYNC_STATUS } from '../../lib/constants';
import { formatDate, formatDateForCalendar, getStartOfDay, getEndOfDay, addDaysToDate } from '../../lib/utils/dateTime';

/**
 * @LD1
 * @S1
 * CalendarComponentProps interface defines the props for the CalendarComponent.
 * It includes an optional className for custom styling.
 */
export interface CalendarComponentProps {
  className?: string;
}

/**
 * @LD1
 * @S1
 * EventFormData interface defines the structure for event form data.
 * It includes properties for title, start and end dates and times, location, description, and calendar ID.
 */
interface EventFormData {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  description: string;
  calendarId: string;
}

/**
 * @LD1
 * @S1
 * CalendarComponent is the main calendar component that displays a monthly view, daily events, and pending approvals.
 * It uses the useCalendar and useAuth hooks to manage calendar state and user authentication.
 * @param {CalendarComponentProps} props - The props for the component, including an optional className.
 * @returns {JSX.Element} - The rendered calendar component.
 */
export const CalendarComponent: React.FC<CalendarComponentProps> = ({ className = '' }) => {
  // @LD1 Destructure props to get className
  // @LD1 Get user and authentication state from useAuth hook
  const { user, isAuthenticated } = useAuth();
  // @LD1 Get calendar state and actions from useCalendar hook
  const { calendars, events, syncInfo, loading, getEvents, createEvent, updateEvent, deleteEvent, isCalendarConnected, syncNow } = useCalendar();

  // @LD1 Set up state for selected date, current month/year, and event modal
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // @LD1 Set up state for event being edited or created
  const [eventBeingEdited, setEventBeingEdited] = useState<ICalendarEvent | null>(null);
  const [eventBeingCreated, setEventBeingCreated] = useState<ICalendarEvent | null>(null);

  // @LD1 Define function to handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    }
  }, [currentMonth, currentYear]);

  // @LD1 Define function to handle month navigation
  const handleMonthNavigation = useCallback((direction: 'prev' | 'next') => {
    let newMonth = currentMonth;
    let newYear = currentYear;

    if (direction === 'prev') {
      newMonth = currentMonth - 1;
      if (newMonth < 0) {
        newMonth = 11;
        newYear = currentYear - 1;
      }
    } else {
      newMonth = currentMonth + 1;
      if (newMonth > 11) {
        newMonth = 0;
        newYear = currentYear + 1;
      }
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    setSelectedDate(new Date(newYear, newMonth, 1));
  }, [currentMonth, currentYear]);

  // @LD1 Define function to handle event creation
  const handleCreateEvent = useCallback(() => {
    const newEvent: Partial<ICalendarEvent> = {
      startTime: getStartOfDay(selectedDate).toISOString(),
      endTime: getEndOfDay(selectedDate).toISOString(),
    };
    setEventBeingEdited(null);
    setEventBeingCreated(newEvent as ICalendarEvent);
    setIsEventModalOpen(true);
  }, [selectedDate]);

  // @LD1 Define function to handle event editing
  const handleEditEvent = useCallback((event: ICalendarEvent) => {
    setEventBeingCreated(null);
    setEventBeingEdited(event);
    setIsEventModalOpen(true);
  }, []);

  // @LD1 Define function to handle event deletion
  const handleDeleteEvent = useCallback(async (event: ICalendarEvent) => {
    if (window.confirm(`Are you sure you want to delete event "${event.title}"?`)) {
      try {
        await deleteEvent({ eventId: event.eventId, calendarId: event.calendarId });
        setSelectedDate(new Date(selectedDate));
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  }, [deleteEvent, selectedDate]);

  // @LD1 Define function to handle event form submission
  const handleEventSubmit = useCallback(async (formData: EventFormData) => {
    try {
      if (eventBeingCreated) {
        await createEvent({
          calendarId: formData.calendarId,
          title: formData.title,
          description: formData.description,
          startTime: formData.startDate + 'T' + formData.startTime + ':00',
          endTime: formData.endDate + 'T' + formData.endTime + ':00',
          location: { name: formData.location, address: formData.location, locationType: 'other' },
          attendees: [],
          isAgentCreated: false,
          recurrence: null,
        });
      } else if (eventBeingEdited) {
        await updateEvent({
          eventId: eventBeingEdited.eventId,
          calendarId: formData.calendarId,
          updates: {
            title: formData.title,
            description: formData.description,
            startTime: formData.startDate + 'T' + formData.startTime + ':00',
            endTime: formData.endDate + 'T' + formData.endTime + ':00',
            location: { name: formData.location, address: formData.location, locationType: 'other' },
          }
        });
      }
      setIsEventModalOpen(false);
      setSelectedDate(new Date(selectedDate));
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  }, [createEvent, updateEvent, eventBeingCreated, eventBeingEdited, selectedDate]);

  // @LD1 Define function to handle calendar sync
  const handleSync = useCallback(async () => {
    try {
      await syncNow(calendars.map(c => c.calendarId));
      setSelectedDate(new Date(selectedDate));
    } catch (error) {
      console.error('Failed to sync calendar:', error);
    }
  }, [syncNow, calendars, selectedDate]);

  // @LD1 Set up effect to fetch events when selected date changes
  useEffect(() => {
    const startDate = getStartOfDay(selectedDate).toISOString();
    const endDate = getEndOfDay(selectedDate).toISOString();
    if (calendars && calendars.length > 0) {
      getEvents(calendars.map(c => c.calendarId), startDate, endDate);
    }
  }, [selectedDate, calendars, getEvents]);

  // @LD1 Generate calendar grid for current month
  const generateCalendarGrid = useCallback(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sunday) to 6 (Saturday)

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    // Add days from the previous month to fill the first week
    for (let i = firstDayOfWeek; i > 0; i--) {
      const prevMonthDay = new Date(currentYear, currentMonth, 1 - i);
      currentWeek.push(prevMonthDay);
    }

    // Add days from the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(currentYear, currentMonth, day);
      currentWeek.push(currentDay);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add days from the next month to fill the last week
    if (currentWeek.length > 0) {
      let nextMonthDay = 1;
      while (currentWeek.length < 7) {
        const nextDay = new Date(currentYear, currentMonth + 1, nextMonthDay++);
        currentWeek.push(nextDay);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentMonth, currentYear]);

  // @LD1 Get events for the selected date
  const getEventsForDate = useCallback((date: Date): ICalendarEvent[] => {
    const startOfDay = getStartOfDay(date).toISOString();
    const endOfDay = getEndOfDay(date).toISOString();
    return events.filter(event => event.startTime <= endOfDay && event.endTime >= startOfDay);
  }, [events]);

  // @LD1 Render calendar grid
  const calendarGrid = useMemo(() => generateCalendarGrid(), [generateCalendarGrid]);

  // @LD1 Render sync status and button if calendar is connected
  const renderSyncStatus = useCallback(() => {
    if (!isCalendarConnected()) {
      return null;
    }

    let statusText = 'Not connected';
    let statusIcon = null;

    if (syncInfo?.status === CALENDAR_SYNC_STATUS.SYNCING) {
      statusText = 'Syncing...';
      statusIcon = <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"></svg>;
    } else if (syncInfo?.status === CALENDAR_SYNC_STATUS.SYNCED) {
      statusText = `Synced ${formatDate(syncInfo.lastSyncTime, 'MMM d, yyyy h:mm a')}`;
      statusIcon = <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"></svg>;
    } else if (syncInfo?.status === CALENDAR_SYNC_STATUS.ERROR) {
      statusText = `Sync Error: ${syncInfo.error}`;
      statusIcon = <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"></svg>;
    }

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {statusIcon}
          <span>{statusText}</span>
        </div>
        <Button variant="primary" size="sm" onClick={handleSync}>
          Sync Now
        </Button>
      </div>
    );
  }, [syncInfo, handleSync, isCalendarConnected]);

  // @LD1 Return the complete component structure
  return (
    <div className={classNames('flex flex-col md:flex-row', className)}>
      <Card title="Calendar" className="md:w-1/2 lg:w-1/3 md:mr-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {formatDate(new Date(currentYear, currentMonth, 1), 'MMMM yyyy')}
          </h2>
          <div className="flex">
            <Button variant="outline" size="sm" onClick={() => handleMonthNavigation('prev')}>
              &lt;
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleMonthNavigation('next')}>
              &gt;
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-gray-500">
              {day}
            </div>
          ))}
          {calendarGrid.map((week, weekIndex) => (
            <React.Fragment key={weekIndex}>
              {week.map(day => (
                <div
                  key={day.toISOString()}
                  className={classNames(
                    'text-center p-1 rounded-full transition-colors duration-200 cursor-pointer',
                    {
                      'bg-gray-100 hover:bg-gray-200': day.getMonth() === currentMonth,
                      'text-gray-400': day.getMonth() !== currentMonth,
                      'bg-blue-200': day.toDateString() === selectedDate.toDateString(),
                    }
                  )}
                  onClick={() => handleDateSelect(day)}
                >
                  {day.getDate()}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
        {renderSyncStatus()}
      </Card>

      <div className="md:w-1/2 lg:w-2/3">
        <CalendarDayView
          events={getEventsForDate(selectedDate)}
          selectedDate={selectedDate}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
        />
        <PendingApprovals className="mt-4" />
      </div>

      {isEventModalOpen && (
        <Modal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          title={eventBeingCreated ? 'Create Event' : 'Edit Event'}
        >
          {/* Implement event creation/editing form here */}
          <div>
            {/* Example form fields */}
            <input type="text" placeholder="Title" />
            <input type="datetime-local" />
            <input type="text" placeholder="Location" />
            <Button onClick={() => handleEventSubmit({
              calendarId: 'primary',
              title: 'Test Event',
              description: 'Test Description',
              startDate: '2024-01-01',
              startTime: '10:00',
              endDate: '2024-01-01',
              endTime: '11:00',
              location: 'Test Location'
            })}>Save</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CalendarComponent;