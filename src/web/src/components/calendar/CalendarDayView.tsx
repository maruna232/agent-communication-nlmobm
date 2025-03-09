import React from 'react';
import classNames from 'classnames';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ICalendarEvent } from '../../lib/types/calendar.types';
import { formatTimeForCalendar, formatDateForCalendar, formatTimeRange } from '../../lib/utils/dateTime';

export interface CalendarDayViewProps {
  /** Array of calendar events to display */
  events: ICalendarEvent[];
  /** Selected date to display events for */
  selectedDate: Date;
  /** Handler for editing an event */
  onEditEvent?: (event: ICalendarEvent) => void;
  /** Handler for deleting an event */
  onDeleteEvent?: (event: ICalendarEvent) => void;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Sorts calendar events by start time
 */
const sortEventsByTime = (events: ICalendarEvent[]): ICalendarEvent[] => {
  return [...events].sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });
};

/**
 * Groups events that occur at the same time
 */
const groupEventsByTime = (events: ICalendarEvent[]): Record<string, ICalendarEvent[]> => {
  const groupedEvents: Record<string, ICalendarEvent[]> = {};
  
  events.forEach(event => {
    const timeKey = formatTimeForCalendar(new Date(event.startTime));
    
    if (!groupedEvents[timeKey]) {
      groupedEvents[timeKey] = [];
    }
    
    groupedEvents[timeKey].push(event);
  });
  
  return groupedEvents;
};

/**
 * Component that displays calendar events for a specific day
 */
export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  events,
  selectedDate,
  onEditEvent,
  onDeleteEvent,
  className = '',
}) => {
  // Format the selected date for display
  const formattedDate = formatDateForCalendar(selectedDate);
  
  // Sort events by start time
  const sortedEvents = sortEventsByTime(events);
  
  // Group events by time slot
  const groupedEvents = groupEventsByTime(sortedEvents);
  
  return (
    <Card 
      title={formattedDate}
      className={classNames('w-full', className)}
      variant="elevated"
      testId="calendar-day-view"
    >
      <div className="space-y-4">
        {sortedEvents.length === 0 ? (
          <div className="py-4 text-center text-gray-500" aria-live="polite">
            No events scheduled for this day
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Object.entries(groupedEvents).map(([timeKey, timeEvents]) => (
              <div key={timeKey} className="py-3 first:pt-0 last:pb-0">
                <div className="text-sm font-medium text-gray-500 mb-2">
                  {timeKey}
                </div>
                <div className="space-y-3">
                  {timeEvents.map(event => (
                    <div 
                      key={event.eventId} 
                      className={classNames(
                        'p-3 rounded-lg border transition-colors',
                        event.isAgentCreated 
                          ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' 
                          : 'border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <div className="sm:flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium">{event.title}</h3>
                          <div className="text-sm text-gray-600">
                            {formatTimeRange(event.startTime, event.endTime)}
                          </div>
                          {event.location && (
                            <div className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Location:</span> {event.location.name}
                              {event.location.address && (
                                <span className="block text-xs text-gray-500 mt-0.5">
                                  {event.location.address}
                                </span>
                              )}
                            </div>
                          )}
                          {event.isAgentCreated && (
                            <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Scheduled by your agent
                            </div>
                          )}
                        </div>
                        {(onEditEvent || onDeleteEvent) && (
                          <div className="flex space-x-2 mt-3 sm:mt-0">
                            {onEditEvent && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => onEditEvent(event)}
                                aria-label={`Edit ${event.title}`}
                              >
                                Edit
                              </Button>
                            )}
                            {onDeleteEvent && (
                              <Button 
                                variant="danger" 
                                size="sm" 
                                onClick={() => onDeleteEvent(event)}
                                aria-label={`Delete ${event.title}`}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export { CalendarDayViewProps, sortEventsByTime, groupEventsByTime };
export default CalendarDayView;