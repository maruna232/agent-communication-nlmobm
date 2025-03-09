import { 
  HTTP_STATUS,
} from '../config/constants';
import {
  ERROR_CODES,
  getErrorMessage,
} from '../config/error-messages';
import { config } from '../config/config';

/**
 * Custom error class with additional properties for better error handling
 */
class AppError extends Error {
  statusCode: number;
  errorCode: string;
  details: Record<string, any>;
  timestamp: Date;

  /**
   * Creates a new AppError instance
   * 
   * @param message - Error message
   * @param statusCode - HTTP status code to return
   * @param errorCode - Application-specific error code
   * @param details - Additional error details
   */
  constructor(
    message: string, 
    statusCode: number, 
    errorCode: string, 
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details || {};
    this.timestamp = new Date();
    
    // Ensures proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Checks if an error is an instance of the custom AppError class
 * 
 * @param error - Error to check
 * @returns True if the error is an instance of AppError
 */
function isCustomError(error: Error): error is AppError {
  return error instanceof AppError;
}

/**
 * Gets the appropriate HTTP status code for an error
 * 
 * @param error - Error object
 * @returns HTTP status code
 */
function getErrorStatusCode(error: Error | AppError): number {
  if (isCustomError(error)) {
    return error.statusCode;
  }
  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Formats an error for HTTP response
 * 
 * @param error - Error object
 * @returns Formatted error response object
 */
function formatErrorResponse(error: Error | AppError): Record<string, any> {
  const response: Record<string, any> = {
    success: false,
  };

  if (isCustomError(error)) {
    // Custom error with specific details
    response.code = error.errorCode;
    response.message = error.message;
    
    if (Object.keys(error.details).length > 0) {
      response.details = error.details;
    }
  } else {
    // Generic error
    response.code = ERROR_CODES.SERVER_ERROR;
    response.message = 'An unexpected error occurred. Please try again later.';
    
    // Include original error message in development
    if (config.server.environment === 'development') {
      response.originalError = error.message;
    }
  }

  // Include stack trace in development environment
  if (config.server.environment === 'development' && error.stack) {
    response.stack = error.stack.split('\n');
  }

  return response;
}

/**
 * Creates a standardized authentication error
 * 
 * @param errorCode - Specific error code from AUTH_ERRORS
 * @param details - Additional error details
 * @returns Custom AppError for authentication issues
 */
function createAuthError(errorCode: string, details?: Record<string, any>): AppError {
  const message = getErrorMessage(errorCode, details);
  let statusCode = HTTP_STATUS.UNAUTHORIZED;
  
  // Determine appropriate status code based on error code
  if (errorCode.includes('forbidden')) {
    statusCode = HTTP_STATUS.FORBIDDEN;
  } else if (errorCode.includes('not_found')) {
    statusCode = HTTP_STATUS.NOT_FOUND;
  } else if (errorCode.includes('in_use')) {
    statusCode = HTTP_STATUS.CONFLICT;
  }
  
  return new AppError(message, statusCode, errorCode, details);
}

/**
 * Creates a standardized validation error
 * 
 * @param errorCode - Specific error code from VALIDATION_ERRORS
 * @param details - Additional error details
 * @returns Custom AppError for validation issues
 */
function createValidationError(errorCode: string, details?: Record<string, any>): AppError {
  const message = getErrorMessage(errorCode, details);
  return new AppError(message, HTTP_STATUS.BAD_REQUEST, errorCode, details);
}

/**
 * Creates a standardized rate limit error
 * 
 * @param errorCode - Specific error code from RATE_LIMIT_ERRORS
 * @param details - Additional error details
 * @returns Custom AppError for rate limiting issues
 */
function createRateLimitError(errorCode: string, details?: Record<string, any>): AppError {
  const message = getErrorMessage(errorCode, details);
  return new AppError(message, HTTP_STATUS.TOO_MANY_REQUESTS, errorCode, details);
}

/**
 * Creates a standardized WebSocket error
 * 
 * @param errorCode - Specific error code from WEBSOCKET_ERRORS
 * @param details - Additional error details
 * @returns Custom AppError for WebSocket issues
 */
function createWebSocketError(errorCode: string, details?: Record<string, any>): AppError {
  const message = getErrorMessage(errorCode, details);
  let statusCode = HTTP_STATUS.BAD_REQUEST;
  
  // Determine appropriate status code based on error code
  if (errorCode.includes('unavailable')) {
    statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
  } else if (errorCode.includes('failed')) {
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }
  
  return new AppError(message, statusCode, errorCode, details);
}

/**
 * Creates a standardized server error
 * 
 * @param errorCode - Specific error code from SERVER_ERRORS
 * @param details - Additional error details
 * @returns Custom AppError for server issues
 */
function createServerError(errorCode: string, details?: Record<string, any>): AppError {
  const message = getErrorMessage(errorCode, details);
  
  // Use service unavailable status if specifically mentioned
  const statusCode = errorCode.includes('unavailable') 
    ? HTTP_STATUS.SERVICE_UNAVAILABLE 
    : HTTP_STATUS.INTERNAL_SERVER_ERROR;
    
  return new AppError(message, statusCode, errorCode, details);
}

/**
 * Creates a standardized agent-related error
 * 
 * @param errorCode - Specific error code from AGENT_ERRORS
 * @param details - Additional error details
 * @returns Custom AppError for agent-related issues
 */
function createAgentError(errorCode: string, details?: Record<string, any>): AppError {
  const message = getErrorMessage(errorCode, details);
  let statusCode = HTTP_STATUS.BAD_REQUEST;
  
  // Determine appropriate status code based on error code
  if (errorCode.includes('not_found')) {
    statusCode = HTTP_STATUS.NOT_FOUND;
  } else if (errorCode.includes('failed')) {
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }
  
  return new AppError(message, statusCode, errorCode, details);
}

/**
 * Creates a standardized not found error
 * 
 * @param resource - Name of the resource that wasn't found
 * @returns Custom AppError for resource not found issues
 */
function createNotFoundError(resource: string): AppError {
  const message = `The requested ${resource} was not found.`;
  return new AppError(message, HTTP_STATUS.NOT_FOUND, `${ERROR_CODES.SERVER_ERROR}.not_found`, { resource });
}

/**
 * Higher-order function to handle async errors in Express route handlers
 * 
 * @param fn - Express route handler function
 * @returns Express middleware function with error handling
 */
function handleAsyncError(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export {
  AppError,
  isCustomError,
  getErrorStatusCode,
  formatErrorResponse,
  createAuthError,
  createValidationError,
  createRateLimitError,
  createWebSocketError,
  createServerError,
  createAgentError,
  createNotFoundError,
  handleAsyncError
};