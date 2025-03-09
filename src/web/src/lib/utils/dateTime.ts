/**
 * dateTime.ts
 * 
 * Provides utility functions for date and time manipulation, formatting, and validation
 * in the AI Agent Network application. These utilities are essential for calendar integration,
 * scheduling functionality, and consistent date/time handling throughout the application.
 */

import { DEFAULT_CONFIG } from '../constants';
import {
  format,
  parse,
  addDays,
  addMinutes,
  differenceInMinutes,
  isAfter,
  isBefore,
  isValid,
  parseISO
} from 'date-fns'; // v2.30.0

/**
 * Converts a Date object or date string to an ISO 8601 formatted string
 * 
 * @param date - The date to convert
 * @returns ISO 8601 formatted date string
 * @throws Error if the date is invalid
 */
export function toISOString(date: Date | string): string {
  if (typeof date === 'string') {
    // Parse the string to a Date object first
    const parsedDate = new Date(date);
    if (!isValid(parsedDate)) {
      throw new Error('Invalid date string provided to toISOString');
    }
    return parsedDate.toISOString();
  }
  
  if (!isValid(date)) {
    throw new Error('Invalid Date object provided to toISOString');
  }
  
  return date.toISOString();
}

/**
 * Parses an ISO 8601 formatted string into a Date object
 * 
 * @param isoString - The ISO string to parse
 * @returns JavaScript Date object
 * @throws Error if the ISO string is invalid
 */
export function fromISOString(isoString: string): Date {
  const date = parseISO(isoString);
  
  if (!isValid(date)) {
    throw new Error('Invalid ISO string provided to fromISOString');
  }
  
  return date;
}

/**
 * Formats a date for display according to the specified format string
 * 
 * @param date - The date to format
 * @param formatString - The format string to use (date-fns format)
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, formatString: string = 'MMM d, yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!isValid(dateObj)) {
      return '';
    }
    
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Formats a time for calendar display (e.g., '3:00 PM')
 * 
 * @param date - The date/time to format
 * @returns Formatted time string
 */
export function formatTimeForCalendar(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!isValid(dateObj)) {
      return '';
    }
    
    return format(dateObj, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time for calendar:', error);
    return '';
  }
}

/**
 * Formats a time range for display (e.g., '3:00 PM - 4:00 PM')
 * 
 * @param startTime - The start time
 * @param endTime - The end time
 * @returns Formatted time range string
 */
export function formatTimeRange(startTime: Date | string, endTime: Date | string): string {
  try {
    const startDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const endDate = typeof endTime === 'string' ? new Date(endTime) : endTime;
    
    if (!isValid(startDate) || !isValid(endDate)) {
      return '';
    }
    
    const formattedStart = formatTimeForCalendar(startDate);
    const formattedEnd = formatTimeForCalendar(endDate);
    
    return `${formattedStart} - ${formattedEnd}`;
  } catch (error) {
    console.error('Error formatting time range:', error);
    return '';
  }
}

/**
 * Formats a date for calendar display (e.g., 'Monday, April 15')
 * 
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDateForCalendar(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!isValid(dateObj)) {
      return '';
    }
    
    return format(dateObj, 'EEEE, MMMM d');
  } catch (error) {
    console.error('Error formatting date for calendar:', error);
    return '';
  }
}

/**
 * Checks if a date is today
 * 
 * @param date - The date to check
 * @returns True if the date is today, false otherwise
 */
export function isToday(date: Date | string): boolean {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!isValid(dateObj)) {
      return false;
    }
    
    const today = new Date();
    
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    console.error('Error checking if date is today:', error);
    return false;
  }
}

/**
 * Checks if a date is tomorrow
 * 
 * @param date - The date to check
 * @returns True if the date is tomorrow, false otherwise
 */
export function isTomorrow(date: Date | string): boolean {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!isValid(dateObj)) {
      return false;
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return (
      dateObj.getDate() === tomorrow.getDate() &&
      dateObj.getMonth() === tomorrow.getMonth() &&
      dateObj.getFullYear() === tomorrow.getFullYear()
    );
  } catch (error) {
    console.error('Error checking if date is tomorrow:', error);
    return false;
  }
}

/**
 * Checks if two time ranges overlap
 * 
 * @param startA - Start of first range
 * @param endA - End of first range
 * @param startB - Start of second range
 * @param endB - End of second range
 * @returns True if the time ranges overlap, false otherwise
 */
export function isOverlapping(
  startA: Date | string, 
  endA: Date | string, 
  startB: Date | string, 
  endB: Date | string
): boolean {
  try {
    const startDateA = typeof startA === 'string' ? new Date(startA) : startA;
    const endDateA = typeof endA === 'string' ? new Date(endA) : endA;
    const startDateB = typeof startB === 'string' ? new Date(startB) : startB;
    const endDateB = typeof endB === 'string' ? new Date(endB) : endB;
    
    if (!isValid(startDateA) || !isValid(endDateA) || !isValid(startDateB) || !isValid(endDateB)) {
      return false;
    }
    
    // Two ranges overlap if the start of one is before the end of the other,
    // and the end of one is after the start of the other
    return isBefore(startDateA, endDateB) && isBefore(startDateB, endDateA);
  } catch (error) {
    console.error('Error checking if time ranges overlap:', error);
    return false;
  }
}

/**
 * Calculates the duration between two times in minutes
 * 
 * @param startTime - The start time
 * @param endTime - The end time
 * @returns Duration in minutes
 */
export function getDurationInMinutes(startTime: Date | string, endTime: Date | string): number {
  try {
    const startDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const endDate = typeof endTime === 'string' ? new Date(endTime) : endTime;
    
    if (!isValid(startDate) || !isValid(endDate)) {
      return 0;
    }
    
    // Get absolute value in case dates are provided in wrong order
    return Math.abs(differenceInMinutes(endDate, startDate));
  } catch (error) {
    console.error('Error calculating duration in minutes:', error);
    return 0;
  }
}

/**
 * Adds a specified number of days to a date
 * 
 * @param date - The base date
 * @param days - Number of days to add
 * @returns New date with days added
 * @throws Error if the date is invalid
 */
export function addDaysToDate(date: Date | string, days: number): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided to addDaysToDate');
  }
  
  return addDays(dateObj, days);
}

/**
 * Adds a specified number of minutes to a date
 * 
 * @param date - The base date
 * @param minutes - Number of minutes to add
 * @returns New date with minutes added
 * @throws Error if the date is invalid
 */
export function addMinutesToDate(date: Date | string, minutes: number): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided to addMinutesToDate');
  }
  
  return addMinutes(dateObj, minutes);
}

/**
 * Returns a new Date object set to the start of the day (00:00:00)
 * 
 * @param date - The date to use
 * @returns Date set to start of day
 * @throws Error if the date is invalid
 */
export function getStartOfDay(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided to getStartOfDay');
  }
  
  const result = new Date(dateObj);
  result.setHours(0, 0, 0, 0);
  
  return result;
}

/**
 * Returns a new Date object set to the end of the day (23:59:59.999)
 * 
 * @param date - The date to use
 * @returns Date set to end of day
 * @throws Error if the date is invalid
 */
export function getEndOfDay(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided to getEndOfDay');
  }
  
  const result = new Date(dateObj);
  result.setHours(23, 59, 59, 999);
  
  return result;
}

/**
 * Generates time slots of specified duration within a time range
 * 
 * @param startTime - The start of the time range
 * @param endTime - The end of the time range
 * @param durationMinutes - The duration of each time slot in minutes
 * @returns Array of time slot objects with start and end times
 * @throws Error if inputs are invalid
 */
export function getTimeSlots(
  startTime: Date | string,
  endTime: Date | string,
  durationMinutes: number
): Array<{ start: Date; end: Date }> {
  const startDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const endDate = typeof endTime === 'string' ? new Date(endTime) : endTime;
  
  if (!isValid(startDate) || !isValid(endDate)) {
    throw new Error('Invalid date(s) provided to getTimeSlots');
  }
  
  if (durationMinutes <= 0) {
    throw new Error('Duration must be greater than 0 minutes');
  }
  
  if (isAfter(startDate, endDate)) {
    throw new Error('Start time must be before end time');
  }
  
  const timeSlots: Array<{ start: Date; end: Date }> = [];
  let currentSlotStart = new Date(startDate);
  
  while (true) {
    const currentSlotEnd = addMinutes(currentSlotStart, durationMinutes);
    
    // If this slot would go beyond the end time, we're done
    if (isAfter(currentSlotEnd, endDate)) {
      break;
    }
    
    timeSlots.push({
      start: new Date(currentSlotStart),
      end: new Date(currentSlotEnd)
    });
    
    // Move to the next slot
    currentSlotStart = new Date(currentSlotEnd);
  }
  
  return timeSlots;
}

/**
 * Validates that a start time is before an end time
 * 
 * @param startTime - The start time
 * @param endTime - The end time
 * @returns True if startTime is before endTime, false otherwise
 */
export function isValidDateTimeRange(startTime: Date | string, endTime: Date | string): boolean {
  try {
    const startDate = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const endDate = typeof endTime === 'string' ? new Date(endTime) : endTime;
    
    if (!isValid(startDate) || !isValid(endDate)) {
      return false;
    }
    
    return isBefore(startDate, endDate);
  } catch (error) {
    console.error('Error validating date time range:', error);
    return false;
  }
}

/**
 * Parses a time string (e.g., '3:00 PM') into a Date object
 * 
 * @param timeString - The time string to parse
 * @param referenceDate - Optional reference date to use (defaults to today)
 * @returns Date object with the parsed time
 * @throws Error if the time string is invalid
 */
export function parseTimeString(timeString: string, referenceDate?: Date): Date {
  try {
    const baseDate = referenceDate || new Date();
    const parsedDate = parse(timeString, 'h:mm a', baseDate);
    
    if (!isValid(parsedDate)) {
      throw new Error(`Invalid time string: ${timeString}`);
    }
    
    return parsedDate;
  } catch (error) {
    throw new Error(`Error parsing time string: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Returns a human-readable relative date string (e.g., 'Today', 'Tomorrow', 'Monday')
 * 
 * @param date - The date to describe
 * @returns Relative date string
 */
export function getRelativeDateString(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!isValid(dateObj)) {
      return '';
    }
    
    if (isToday(dateObj)) {
      return 'Today';
    }
    
    if (isTomorrow(dateObj)) {
      return 'Tomorrow';
    }
    
    // Check if the date is within the next 7 days
    const today = new Date();
    const nextWeek = addDays(today, 7);
    
    if (isAfter(dateObj, today) && isBefore(dateObj, nextWeek)) {
      // Return day name (e.g., "Monday")
      return format(dateObj, 'EEEE');
    }
    
    // Otherwise return the formatted date
    return format(dateObj, 'MMMM d');
  } catch (error) {
    console.error('Error getting relative date string:', error);
    return '';
  }
}