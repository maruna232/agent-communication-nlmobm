/**
 * formatters.ts
 * 
 * Provides utility functions for formatting various data types including strings, numbers,
 * locations, and agent-related information for display in the AI Agent Network application.
 * These formatters ensure consistent data presentation throughout the user interface.
 */

import { 
  formatDate, 
  formatTimeRange, 
  getRelativeDateString 
} from './dateTime';

import {
  Location,
  LocationType,
  MeetingType,
  AgentMessage
} from '../types/agent.types';

import { ICalendarEvent } from '../types/calendar.types';

import {
  MEETING_TYPES,
  LOCATION_TYPES,
  MESSAGE_TYPES
} from '../constants';

/**
 * Formats a number as a currency string with the specified currency code
 * 
 * @param value - The number to format
 * @param currencyCode - The currency code to use (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currencyCode: string = 'USD'): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '—';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(value);
}

/**
 * Formats a number as a percentage string
 * 
 * @param value - The number to format (0.1 = 10%)
 * @param decimalPlaces - The number of decimal places to show
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimalPlaces: number = 0): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '—';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

/**
 * Formats a phone number string into a standardized format
 * 
 * @param phoneNumber - The phone number to format
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Format based on length
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Return original if not formattable
  return phoneNumber;
}

/**
 * Formats a location object into a human-readable string
 * 
 * @param location - The location object to format
 * @returns Formatted location string
 */
export function formatLocation(location: Location | null): string {
  if (!location) return 'No location';
  
  if (location.name && location.address) {
    return `${location.name}, ${location.address}`;
  } else if (location.name) {
    return location.name;
  } else if (location.address) {
    return location.address;
  }
  
  return 'No location';
}

/**
 * Formats a location object including its type into a human-readable string
 * 
 * @param location - The location object to format
 * @returns Formatted location string with type
 */
export function formatLocationWithType(location: Location | null): string {
  if (!location) return 'No location';
  
  const locationString = formatLocation(location);
  
  if (location.locationType) {
    // Format the location type by converting from COFFEE_SHOP to "Coffee Shop"
    const typeDisplayName = location.locationType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return `${locationString} (${typeDisplayName})`;
  }
  
  return locationString;
}

/**
 * Formats a meeting type enum value into a human-readable string
 * 
 * @param meetingType - The meeting type to format
 * @returns Formatted meeting type string
 */
export function formatMeetingType(meetingType: MeetingType | string): string {
  if (!meetingType) return 'Meeting';
  
  // Convert from snake_case to Title Case
  return meetingType
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formats a calendar event into a concise summary string
 * 
 * @param event - The calendar event to format
 * @returns Formatted event summary
 */
export function formatEventSummary(event: ICalendarEvent): string {
  const title = event.title || 'Untitled Event';
  const time = formatTimeRange(event.startTime, event.endTime);
  const location = event.location ? ` at ${formatLocation(event.location)}` : '';
  
  return `${title}: ${time}${location}`;
}

/**
 * Formats a calendar event into a detailed string representation
 * 
 * @param event - The calendar event to format
 * @returns Formatted event details
 */
export function formatEventDetails(event: ICalendarEvent): string {
  const title = event.title || 'Untitled Event';
  const date = getRelativeDateString(new Date(event.startTime));
  const time = formatTimeRange(event.startTime, event.endTime);
  const location = event.location ? `Location: ${formatLocationWithType(event.location)}` : 'No location';
  
  return `${title}\n${date}, ${time}\n${location}`;
}

/**
 * Formats an agent message into a human-readable string
 * 
 * @param message - The agent message to format
 * @returns Formatted agent message
 */
export function formatAgentMessage(message: AgentMessage): string {
  const timestamp = formatDate(new Date(message.timestamp), 'h:mm a');
  let formattedContent = '';
  
  // Format content based on message type
  switch (message.messageType) {
    case MESSAGE_TYPES.PROPOSAL:
      formattedContent = formatProposalContent(message.content);
      break;
    case MESSAGE_TYPES.QUERY:
      formattedContent = formatQueryContent(message.content);
      break;
    case MESSAGE_TYPES.RESPONSE:
      formattedContent = formatResponseContent(message.content);
      break;
    default:
      formattedContent = typeof message.content === 'string' 
        ? message.content 
        : JSON.stringify(message.content);
  }
  
  return `[${timestamp}] ${formattedContent}`;
}

/**
 * Formats a meeting proposal into a human-readable string
 * 
 * @param proposalContent - The proposal content to format
 * @returns Formatted proposal content
 */
export function formatProposalContent(proposalContent: any): string {
  if (!proposalContent || !proposalContent.details) {
    return 'Invalid proposal';
  }
  
  const { details } = proposalContent;
  const title = details.title || 'Meeting';
  const timeRange = formatTimeRange(details.startTime, details.endTime);
  const date = getRelativeDateString(new Date(details.startTime));
  const location = details.location ? ` at ${formatLocation(details.location)}` : '';
  const meetingType = details.meetingType ? ` (${formatMeetingType(details.meetingType)})` : '';
  
  return `Proposal: ${title}${meetingType} on ${date}, ${timeRange}${location}`;
}

/**
 * Formats a query message content into a human-readable string
 * 
 * @param queryContent - The query content to format
 * @returns Formatted query content
 */
export function formatQueryContent(queryContent: any): string {
  if (!queryContent || !queryContent.queryType) {
    return 'Invalid query';
  }
  
  // Format query type by converting from snake_case to words
  const queryType = queryContent.queryType
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  const parameters = queryContent.parameters
    ? `: ${JSON.stringify(queryContent.parameters)}`
    : '';
  
  return `Query: ${queryType}${parameters}`;
}

/**
 * Formats a response message content into a human-readable string
 * 
 * @param responseContent - The response content to format
 * @returns Formatted response content
 */
export function formatResponseContent(responseContent: any): string {
  if (!responseContent) {
    return 'Invalid response';
  }
  
  if (responseContent.error) {
    return `Error: ${responseContent.error}`;
  }
  
  if (responseContent.data) {
    const dataStr = typeof responseContent.data === 'string'
      ? responseContent.data
      : JSON.stringify(responseContent.data);
    return `Response: ${dataStr}`;
  }
  
  return 'Empty response';
}

/**
 * Formats a name with proper capitalization
 * 
 * @param name - The name to format
 * @returns Formatted name
 */
export function formatName(name: string): string {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Truncates text to a specified length and adds ellipsis if needed
 * 
 * @param text - The text to truncate
 * @param maxLength - The maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Formats a file size in bytes to a human-readable string
 * 
 * @param bytes - The file size in bytes
 * @returns Formatted file size
 */
export function formatFileSize(bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
    return '0 B';
  }
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2).replace(/\.00$/, '')} ${units[unitIndex]}`;
}

/**
 * Formats a duration in minutes to a human-readable string
 * 
 * @param minutes - The duration in minutes
 * @returns Formatted duration
 */
export function formatDuration(minutes: number): string {
  if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) {
    return '0 min';
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes} min${remainingMinutes !== 1 ? 's' : ''}`;
  }
  
  if (remainingMinutes === 0) {
    return `${hours} hr${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hr${hours !== 1 ? 's' : ''} ${remainingMinutes} min${remainingMinutes !== 1 ? 's' : ''}`;
}