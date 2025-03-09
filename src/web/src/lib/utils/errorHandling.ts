/**
 * errorHandling.ts
 * 
 * Provides comprehensive error handling utilities for the frontend application,
 * including error creation, classification, formatting, and recovery action determination.
 * This file is central to the application's error handling strategy, ensuring consistent
 * error management across the client-side components.
 */

import { ERROR_TYPES } from '../constants';

// Define additional error types not in the imported constants
const VALIDATION_ERROR = 'validation_error';
const UNKNOWN_ERROR = 'unknown_error';

/**
 * Interface extending Error with additional properties for better error handling
 */
export interface AppError extends Error {
  errorType: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * Interface defining the structure of a recovery action for errors
 */
export interface RecoveryAction {
  type: 'retry' | 'refresh' | 'reconnect' | 'login' | 'dismiss' | 'custom';
  label: string;
  action: () => void;
}

/**
 * Creates a standardized application error with additional properties for better error handling
 * 
 * @param message - Human-readable error message
 * @param errorType - Type of error from ERROR_TYPES
 * @param details - Additional details about the error
 * @returns Enhanced error object with additional properties
 */
export function createAppError(
  message: string,
  errorType: string,
  details?: Record<string, any>
): AppError {
  const error = new Error(message) as AppError;
  error.errorType = errorType;
  error.details = details;
  error.timestamp = new Date();
  return error;
}

/**
 * Creates a standardized authentication error
 * 
 * @param message - Human-readable error message
 * @param details - Additional details about the error
 * @returns Authentication error object
 */
export function createAuthError(
  message: string,
  details?: Record<string, any>
): AppError {
  return createAppError(message, ERROR_TYPES.AUTHENTICATION, details);
}

/**
 * Creates a standardized network error
 * 
 * @param message - Human-readable error message
 * @param details - Additional details about the error
 * @returns Network error object
 */
export function createNetworkError(
  message: string,
  details?: Record<string, any>
): AppError {
  return createAppError(message, ERROR_TYPES.NETWORK, details);
}

/**
 * Creates a standardized storage error
 * 
 * @param message - Human-readable error message
 * @param details - Additional details about the error
 * @returns Storage error object
 */
export function createStorageError(
  message: string,
  details?: Record<string, any>
): AppError {
  return createAppError(message, ERROR_TYPES.STORAGE, details);
}

/**
 * Creates a standardized WebSocket error
 * 
 * @param message - Human-readable error message
 * @param details - Additional details about the error
 * @returns WebSocket error object
 */
export function createWebSocketError(
  message: string,
  details?: Record<string, any>
): AppError {
  return createAppError(message, ERROR_TYPES.WEBSOCKET, details);
}

/**
 * Creates a standardized calendar integration error
 * 
 * @param message - Human-readable error message
 * @param details - Additional details about the error
 * @returns Calendar error object
 */
export function createCalendarError(
  message: string,
  details?: Record<string, any>
): AppError {
  return createAppError(message, ERROR_TYPES.CALENDAR, details);
}

/**
 * Creates a standardized agent-related error
 * 
 * @param message - Human-readable error message
 * @param details - Additional details about the error
 * @returns Agent error object
 */
export function createAgentError(
  message: string,
  details?: Record<string, any>
): AppError {
  return createAppError(message, ERROR_TYPES.AGENT, details);
}

/**
 * Creates a standardized validation error
 * 
 * @param message - Human-readable error message
 * @param details - Additional details about the error
 * @returns Validation error object
 */
export function createValidationError(
  message: string,
  details?: Record<string, any>
): AppError {
  return createAppError(message, VALIDATION_ERROR, details);
}

/**
 * Checks if an error is a custom AppError with additional properties
 * 
 * @param error - The error to check
 * @returns True if the error has the AppError properties
 */
export function isAppError(error: Error): error is AppError {
  return 'errorType' in error;
}

/**
 * Extracts the error type from an error object
 * 
 * @param error - The error to analyze
 * @returns Error type or UNKNOWN if not available
 */
export function getErrorType(error: Error): string {
  if (isAppError(error)) {
    return error.errorType;
  }
  
  // Try to infer error type from error properties or message
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ERROR_TYPES.NETWORK;
  }
  
  if (error instanceof DOMException && 
     (error.name === 'QuotaExceededError' || error.name === 'SecurityError')) {
    return ERROR_TYPES.STORAGE;
  }
  
  return UNKNOWN_ERROR;
}

/**
 * Extracts a user-friendly error message from an error object
 * 
 * @param error - The error to extract a message from
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message || 'An error occurred';
  }
  
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    
    if ('details' in error && 
        error.details && 
        typeof error.details === 'object' && 
        'message' in error.details && 
        typeof error.details.message === 'string') {
      return error.details.message;
    }
  }
  
  return 'An unknown error occurred';
}

/**
 * Extracts detailed error information from an error object
 * 
 * @param error - The error to extract details from
 * @returns Error details or empty object if not available
 */
export function getErrorDetails(error: unknown): Record<string, any> {
  if (isAppError(error as Error) && (error as AppError).details) {
    return (error as AppError).details || {};
  }
  
  return {};
}

/**
 * Determines the appropriate recovery action for an error
 * 
 * @param error - The error to generate a recovery action for
 * @returns Recovery action object with type, label, and action function
 */
export function getRecoveryAction(error: Error): RecoveryAction {
  const errorType = getErrorType(error);
  
  // Default action is a no-op function
  const noOp = () => {};
  
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      return {
        type: 'retry',
        label: 'Retry',
        action: noOp // This would be replaced with actual retry logic
      };
      
    case ERROR_TYPES.WEBSOCKET:
      return {
        type: 'reconnect',
        label: 'Reconnect',
        action: noOp // This would be replaced with actual reconnect logic
      };
      
    case ERROR_TYPES.AUTHENTICATION:
      return {
        type: 'login',
        label: 'Log In',
        action: noOp // This would be replaced with actual login redirect
      };
      
    case ERROR_TYPES.STORAGE:
      return {
        type: 'refresh',
        label: 'Refresh',
        action: noOp // This would be replaced with actual refresh logic
      };
      
    default:
      return {
        type: 'dismiss',
        label: 'Dismiss',
        action: noOp
      };
  }
}

/**
 * Higher-order function to handle async errors in React components
 * 
 * @param fn - The async function to wrap with error handling
 * @param errorHandler - Optional custom error handler
 * @returns Wrapped function with error handling
 */
export function handleAsyncError<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler?: (error: Error) => void
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error as Error);
      } else {
        logError(error as Error, 'Unhandled async error');
      }
      throw error;
    }
  };
}

/**
 * Formats an API error response into a standardized error object
 * 
 * @param response - The API response containing error information
 * @returns Formatted error object
 */
export function formatApiError(response: any): AppError {
  // Extract relevant information from the API response
  const status = response?.status;
  const data = response?.data;
  const message = data?.message || response?.statusText || 'API request failed';
  const errorCode = data?.code || response?.code;
  
  // Determine error type based on status code or error code
  let errorType = UNKNOWN_ERROR;
  
  if (status) {
    if (status === 401 || status === 403) {
      errorType = ERROR_TYPES.AUTHENTICATION;
    } else if (status >= 500) {
      errorType = ERROR_TYPES.NETWORK;
    }
  }
  
  if (errorCode) {
    if (errorCode.includes('auth') || errorCode.includes('permission')) {
      errorType = ERROR_TYPES.AUTHENTICATION;
    } else if (errorCode.includes('network') || errorCode.includes('timeout')) {
      errorType = ERROR_TYPES.NETWORK;
    } else if (errorCode.includes('storage')) {
      errorType = ERROR_TYPES.STORAGE;
    } else if (errorCode.includes('websocket')) {
      errorType = ERROR_TYPES.WEBSOCKET;
    } else if (errorCode.includes('calendar')) {
      errorType = ERROR_TYPES.CALENDAR;
    } else if (errorCode.includes('agent')) {
      errorType = ERROR_TYPES.AGENT;
    } else if (errorCode.includes('validation')) {
      errorType = VALIDATION_ERROR;
    }
  }
  
  // Create the appropriate error type
  switch (errorType) {
    case ERROR_TYPES.AUTHENTICATION:
      return createAuthError(message, data);
    case ERROR_TYPES.NETWORK:
      return createNetworkError(message, data);
    case ERROR_TYPES.STORAGE:
      return createStorageError(message, data);
    case ERROR_TYPES.WEBSOCKET:
      return createWebSocketError(message, data);
    case ERROR_TYPES.CALENDAR:
      return createCalendarError(message, data);
    case ERROR_TYPES.AGENT:
      return createAgentError(message, data);
    case VALIDATION_ERROR:
      return createValidationError(message, data);
    default:
      return createAppError(message, UNKNOWN_ERROR, data);
  }
}

/**
 * Logs an error with appropriate formatting and detail level
 * 
 * @param error - The error to log
 * @param context - Optional context information
 */
export function logError(error: Error, context?: string): void {
  const errorType = getErrorType(error);
  const message = getErrorMessage(error);
  const details = isAppError(error) ? error.details : {};
  const timestamp = isAppError(error) ? error.timestamp : new Date();
  
  const logData = {
    type: errorType,
    message,
    context,
    timestamp,
    details,
    stack: error.stack
  };
  
  // Log with appropriate level based on error type
  if (errorType === ERROR_TYPES.NETWORK || 
      errorType === ERROR_TYPES.WEBSOCKET) {
    console.warn(`[${errorType}] ${message}`, logData);
  } else if (errorType === ERROR_TYPES.AUTHENTICATION || 
             errorType === ERROR_TYPES.STORAGE) {
    console.error(`[${errorType}] ${message}`, logData);
  } else {
    console.error(`[${errorType}] ${message}`, logData);
  }
  
  // In development, include more details
  if (process.env.NODE_ENV === 'development') {
    console.group('Error Details');
    console.log('Context:', context || 'Not provided');
    console.log('Error Type:', errorType);
    console.log('Timestamp:', timestamp);
    console.log('Details:', details);
    console.log('Stack:', error.stack);
    console.groupEnd();
  }
}