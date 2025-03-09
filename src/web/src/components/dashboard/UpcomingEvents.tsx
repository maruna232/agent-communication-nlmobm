import React, { useState, useEffect, useMemo } from 'react'; // v18.0.0
import { Link } from 'next/link'; // ^14.0.0
import {
  useCalendar,
  ICalendarEvent,
  useAuth,
} from '../../hooks/useCalendar';
import Card from '../common/Card';
import Button from '../common/Button';
import {
  formatTimeForCalendar,
  isToday,
  isTomorrow,
  getRelativeDateString,
} from '../../lib/utils/dateTime';

/**
 * Component that displays upcoming calendar events on the dashboard
 * @returns Rendered component
 */
export const UpcomingEvents: React.FC = () => {
  // LD1: Get user and authentication state from useAuth hook
  const { user, isAuthenticated } = useAuth();

  // LD1: Get calendar events, loading state, and functions from useCalendar hook
  const { events, loading, getEvents, isCalendarConnected } = useCalendar();

  // LD1: Define state for tracking data fetching
  const [isFetching, setIsFetching] = useState(false);

  // LD1: Fetch calendar events when component mounts if user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isFetching) {
      setIsFetching(true);
      getEvents([], new Date().toISOString(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .finally(() => setIsFetching(false));
    }
  }, [isAuthenticated, user, getEvents, isFetching]);

  /**
   * Helper function to group calendar events by date category (today, tomorrow, upcoming)
   * @param events - Array of calendar events
   * @returns Events grouped by date category
   */
  const groupEventsByDate = useMemo(() => {
    return (events: ICalendarEvent[]) => {
      // LD1: Initialize empty arrays for today, tomorrow, and upcoming events
      const todayEvents: ICalendarEvent[] = [];
      const tomorrowEvents: ICalendarEvent[] = [];
      const upcomingEvents: ICalendarEvent[] = [];

      // LD1: Sort events by start time in ascending order
      const sortedEvents = [...events].sort((a, b) => (new Date(a.startTime)).getTime() - (new Date(b.startTime)).getTime());

      // LD1: Limit to events in the next 7 days
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextWeekEvents = sortedEvents.filter(event => new Date(event.startTime) <= sevenDaysFromNow);

      // LD1: Iterate through events and categorize them based on date
      nextWeekEvents.forEach(event => {
        if (isToday(event.startTime)) {
          todayEvents.push(event);
        } else if (isTomorrow(event.startTime)) {
          tomorrowEvents.push(event);
        } else {
          upcomingEvents.push(event);
        }
      });

      // LD1: Return object with today, tomorrow, and upcoming event arrays
      return {
        today: todayEvents,
        tomorrow: tomorrowEvents,
        upcoming: upcomingEvents,
      };
    };
  }, []);

  // LD1: Group events by date
  const groupedEvents = useMemo(() => groupEventsByDate(events), [events, groupEventsByDate]);

  /**
   * Component to render a single calendar event item
   * @param param0 - Object containing the event
   * @returns Rendered event item
   */
  const EventItem: React.FC<{ event: ICalendarEvent }> = ({ event }) => {
    // LD1: Format event time using formatTimeForCalendar
    const formattedTime = formatTimeForCalendar(event.startTime);

    return (
      <li className="py-2 border-b border-gray-200 last:border-b-0">
        <div className="flex items-center justify-between">
          <div>
            {/* LD1: Render event title and time */}
            <h4 className="text-sm font-medium text-gray-800">{event.title}</h4>
            <p className="text-xs text-gray-500">{formattedTime}</p>
            {/* LD1: Render event location if available */}
            {event.location && (
              <p className="text-xs text-gray-500">
                {event.location.name || event.location.address}
              </p>
            )}
          </div>
          {/* LD1: Add visual indicator if event was created by an agent */}
          {event.isAgentCreated && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Agent
            </span>
          )}
        </div>
      </li>
    );
  };

  return (
    <Card title="Upcoming Events"
      headerContent={
        <Link href="/calendar" passHref>
          <Button variant="secondary" size="sm">
            View Calendar
          </Button>
        </Link>
      }
    >
      {/* LD1: Render loading state while events are being fetched */}
      {loading ? (
        <div className="text-center text-gray-500">Loading events...</div>
      ) : !isCalendarConnected() ? (
        // LD1: Render message if calendar is not connected
        <div className="text-center text-gray-500">
          Connect your calendar to see upcoming events.
        </div>
      ) : events.length === 0 ? (
        // LD1: Render message if no events are found
        <div className="text-center text-gray-500">No upcoming events found.</div>
      ) : (
        <div>
          {/* LD1: Render events grouped by date with appropriate formatting */}
          {groupedEvents.today.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Today</h5>
              <ul>
                {groupedEvents.today.map(event => (
                  <EventItem key={event.eventId} event={event} />
                ))}
              </ul>
            </div>
          )}

          {groupedEvents.tomorrow.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-700 mb-2 mt-4">Tomorrow</h5>
              <ul>
                {groupedEvents.tomorrow.map(event => (
                  <EventItem key={event.eventId} event={event} />
                ))}
              </ul>
            </div>
          )}

          {groupedEvents.upcoming.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-700 mb-2 mt-4">Upcoming</h5>
              <ul>
                {groupedEvents.upcoming.map(event => (
                  <li key={event.eventId} className="py-2 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-800">{event.title}</h4>
                        <p className="text-xs text-gray-500">
                          {getRelativeDateString(event.startTime)}, {formatTimeForCalendar(event.startTime)}
                        </p>
                        {event.location && (
                          <p className="text-xs text-gray-500">
                            {event.location.name || event.location.address}
                          </p>
                        )}
                      </div>
                      {event.isAgentCreated && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Agent
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};