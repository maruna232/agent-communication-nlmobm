import React, { useState, useEffect, useCallback } from 'react'; // ^18.0.0
import classNames from 'classnames'; // ^2.3.2

import { FormField } from '../common/FormField';
import { Button } from '../common/Button';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { useCalendar } from '../../hooks/useCalendar';
import { useAuth } from '../../hooks/useAuth';
import {
  ICalendarEvent,
  ICreateEventRequest,
  IUpdateEventRequest,
  Location,
} from '../../lib/types/calendar.types';
import {
  formatDate,
  formatTime,
  toISOString,
  fromISOString,
  getDateFromISOString,
  getTimeFromISOString,
} from '../../lib/utils/dateTime';
import { validateEventForm } from '../../lib/utils/validation';

/**
 * @interface CalendarEventFormProps
 * @description Props interface for the CalendarEventForm component
 */
interface CalendarEventFormProps {
  event: ICalendarEvent | null;
  mode: 'create' | 'edit';
  onSubmit: (data: ICreateEventRequest | IUpdateEventRequest) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

/**
 * @interface EventFormState
 * @description Interface for the form state
 */
interface EventFormState {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  locationName: string;
  locationAddress: string;
  description: string;
  calendarId: string;
}

/**
 * @interface ValidationState
 * @description Interface for the validation state
 */
interface ValidationState {
  title: string | null;
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  calendarId: string | null;
  form: string | null;
}

/**
 * @function CalendarEventForm
 * @param {CalendarEventFormProps} props
 * @returns {JSX.Element}
 * @description Form component for creating and editing calendar events
 */
export const CalendarEventForm: React.FC<CalendarEventFormProps> = ({
  event,
  mode,
  onSubmit,
  onCancel,
  className,
}) => {
  // LD1: Get user from useAuth hook
  const { user } = useAuth();

  // LD1: Get calendars from useCalendar hook
  const { calendars } = useCalendar();

  // LD1: Initialize form state with event data or defaults
  const [formState, setFormState] = useState<EventFormState>({
    title: event?.title || '',
    startDate: event?.startTime ? formatDate(event.startTime, 'yyyy-MM-dd') : formatDate(new Date(), 'yyyy-MM-dd'),
    startTime: event?.startTime ? formatTime(event.startTime) : formatTime(new Date()),
    endDate: event?.endTime ? formatDate(event.endTime, 'yyyy-MM-dd') : formatDate(new Date(), 'yyyy-MM-dd'),
    endTime: event?.endTime ? formatTime(event.endTime) : formatTime(new Date()),
    locationName: event?.location?.name || '',
    locationAddress: event?.location?.address || '',
    description: event?.description || '',
    calendarId: event?.calendarId || calendars[0]?.calendarId || '',
  });

  // LD1: Initialize validation state for form fields
  const [validation, setValidation] = useState<ValidationState>({
    title: null,
    startDate: null,
    startTime: null,
    endDate: null,
    endTime: null,
    calendarId: null,
    form: null,
  });

  /**
   * @function handleInputChange
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>} e
   * @returns {void}
   * @description Handles changes to form input fields
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    // LD1: Extract name and value from event
    const { name, value } = e.target;

    // LD1: Update form state with new value
    setFormState(prevState => ({
      ...prevState,
      [name]: value,
    }));

    // LD1: Validate field and update validation state
    setValidation(prevState => ({
      ...prevState,
      [name]: validateField(name, value),
    }));
  };

  /**
   * @function handleSubmit
   * @param {React.FormEvent<HTMLFormElement>} e
   * @returns {Promise<void>}
   * @description Handles form submission
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // LD1: Prevent default form submission
    e.preventDefault();

    // LD1: Validate all form fields
    const titleError = validateField('title', formState.title);
    const startDateError = validateField('startDate', formState.startDate);
    const startTimeError = validateField('startTime', formState.startTime);
    const endDateError = validateField('endDate', formState.endDate);
    const endTimeError = validateField('endTime', formState.endTime);
    const calendarIdError = validateField('calendarId', formState.calendarId);

    // LD1: If validation fails, update validation state and return
    if (titleError || startDateError || startTimeError || endDateError || endTimeError || calendarIdError) {
      setValidation({
        title: titleError,
        startDate: startDateError,
        startTime: startTimeError,
        endDate: endDateError,
        endTime: endTimeError,
        calendarId: calendarIdError,
        form: 'Please correct the errors below.',
      });
      return;
    }

    // LD1: Format form data for submission
    const formData = formatFormData();

    // LD1: Call onSubmit callback with formatted data
    await onSubmit(formData);
  };

  /**
   * @function validateField
   * @param {string} name
   * @param {string} value
   * @returns {string | null}
   * @description Validates a single form field
   */
  const validateField = (name: string, value: string): string | null => {
    // LD1: Check if field is required and empty
    if (!value) {
      if (name === 'title') return 'Title is required';
      if (name === 'startDate') return 'Start date is required';
      if (name === 'startTime') return 'Start time is required';
      if (name === 'endDate') return 'End date is required';
      if (name === 'endTime') return 'End time is required';
      if (name === 'calendarId') return 'Calendar is required';
    }

    // LD1: Validate title length
    if (name === 'title' && value.length > 100) {
      return 'Title must be less than 100 characters';
    }

    // LD1: Validate date format
    if (name === 'startDate' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return 'Invalid date format';
    }

    // LD1: Validate time format
    if (name === 'startTime' && !/^\d{1,2}:\d{2} (AM|PM)$/.test(value)) {
      return 'Invalid time format';
    }

    // LD1: Validate end time is after start time
    if ((name === 'endTime' || name === 'endDate') && formState.startDate && formState.startTime && formState.endDate && formState.endTime) {
      try {
        const startDateTime = `${formState.startDate}T${getTimeFromISOString(formState.startTime)}`;
        const endDateTime = `${formState.endDate}T${getTimeFromISOString(formState.endTime)}`;
        if (!validateEventForm(startDateTime, endDateTime)) {
          return 'End time must be after start time';
        }
      } catch (error) {
        return 'Invalid date or time';
      }
    }

    // LD1: Return appropriate error message or null if valid
    return null;
  };

  /**
   * @function formatFormData
   * @returns {ICreateEventRequest | IUpdateEventRequest}
   * @description Formats form data for submission
   */
  const formatFormData = (): ICreateEventRequest | IUpdateEventRequest => {
    // LD1: Combine date and time fields into ISO strings
    const startTime = `${formState.startDate}T${getTimeFromISOString(formState.startTime)}`;
    const endTime = `${formState.endDate}T${getTimeFromISOString(formState.endTime)}`;

    // LD1: Create location object if location fields are provided
    const location: Location | null = formState.locationName || formState.locationAddress
      ? {
        name: formState.locationName,
        address: formState.locationAddress,
      }
      : null;

    if (mode === 'edit' && event) {
      // LD1: If in edit mode, create update request with eventId and updates
      return {
        eventId: event.eventId,
        calendarId: formState.calendarId,
        updates: {
          title: formState.title,
          startTime: startTime,
          endTime: endTime,
          location: location,
          description: formState.description,
        },
      };
    } else {
      // LD1: If in create mode, create new event request
      return {
        calendarId: formState.calendarId,
        title: formState.title,
        startTime: startTime,
        endTime: endTime,
        location: location,
        description: formState.description,
        isAgentCreated: false,
        attendees: [],
        recurrence: null,
      };
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {validation.form && <ErrorDisplay error={validation.form} />}

      <FormField
        id="title"
        name="title"
        label="Title"
        value={formState.title}
        onChange={handleInputChange}
        error={validation.title}
        touched={!!validation.title}
        required
      />

      <FormField
        id="startDate"
        name="startDate"
        label="Start Date"
        type="date"
        value={formState.startDate}
        onChange={handleInputChange}
        error={validation.startDate}
        touched={!!validation.startDate}
        required
      />

      <FormField
        id="startTime"
        name="startTime"
        label="Start Time"
        type="time"
        value={formState.startTime}
        onChange={handleInputChange}
        error={validation.startTime}
        touched={!!validation.startTime}
        required
      />

      <FormField
        id="endDate"
        name="endDate"
        label="End Date"
        type="date"
        value={formState.endDate}
        onChange={handleInputChange}
        error={validation.endDate}
        touched={!!validation.endDate}
        required
      />

      <FormField
        id="endTime"
        name="endTime"
        label="End Time"
        type="time"
        value={formState.endTime}
        onChange={handleInputChange}
        error={validation.endTime}
        touched={!!validation.endTime}
        required
      />

      <FormField
        id="locationName"
        name="locationName"
        label="Location Name"
        value={formState.locationName}
        onChange={handleInputChange}
      />

      <FormField
        id="locationAddress"
        name="locationAddress"
        label="Location Address"
        type="text"
        value={formState.locationAddress}
        onChange={handleInputChange}
      />

      <FormField
        id="description"
        name="description"
        label="Description"
        type="textarea"
        value={formState.description}
        onChange={handleInputChange}
      />

      <FormField
        id="calendarId"
        name="calendarId"
        label="Calendar"
        type="select"
        value={formState.calendarId}
        onChange={handleInputChange}
        error={validation.calendarId}
        touched={!!validation.calendarId}
        required
      >
        {calendars.map(calendar => (
          <option key={calendar.calendarId} value={calendar.calendarId}>
            {calendar.title}
          </option>
        ))}
      </FormField>

      <div>
        <Button type="submit" variant="primary">
          {mode === 'create' ? 'Create Event' : 'Update Event'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};