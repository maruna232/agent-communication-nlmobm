/**
 * error-messages.ts
 * 
 * Centralizes all error messages and error codes used throughout the backend application.
 * This file provides a single source of truth for error messages, ensuring consistency
 * in error handling and user feedback across the system.
 */

/**
 * Main error code categories for classification
 */
export const ERROR_CODES = {
  AUTH_ERROR: 'auth_error',
  VALIDATION_ERROR: 'validation_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  WEBSOCKET_ERROR: 'websocket_error',
  SERVER_ERROR: 'server_error',
  AGENT_ERROR: 'agent_error',
};

/**
 * Authentication and authorization error codes
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: `${ERROR_CODES.AUTH_ERROR}.invalid_credentials`,
  UNAUTHORIZED: `${ERROR_CODES.AUTH_ERROR}.unauthorized`,
  FORBIDDEN: `${ERROR_CODES.AUTH_ERROR}.forbidden`,
  TOKEN_EXPIRED: `${ERROR_CODES.AUTH_ERROR}.token_expired`,
  TOKEN_INVALID: `${ERROR_CODES.AUTH_ERROR}.token_invalid`,
  USER_NOT_FOUND: `${ERROR_CODES.AUTH_ERROR}.user_not_found`,
  EMAIL_IN_USE: `${ERROR_CODES.AUTH_ERROR}.email_in_use`,
  ACCOUNT_LOCKED: `${ERROR_CODES.AUTH_ERROR}.account_locked`,
};

/**
 * Validation error codes for input validation
 */
export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: `${ERROR_CODES.VALIDATION_ERROR}.required_field`,
  INVALID_FORMAT: `${ERROR_CODES.VALIDATION_ERROR}.invalid_format`,
  INVALID_EMAIL: `${ERROR_CODES.VALIDATION_ERROR}.invalid_email`,
  INVALID_PASSWORD: `${ERROR_CODES.VALIDATION_ERROR}.invalid_password`,
  PASSWORD_TOO_WEAK: `${ERROR_CODES.VALIDATION_ERROR}.password_too_weak`,
  INVALID_AGENT_ID: `${ERROR_CODES.VALIDATION_ERROR}.invalid_agent_id`,
  INVALID_DATE: `${ERROR_CODES.VALIDATION_ERROR}.invalid_date`,
  INVALID_TIME: `${ERROR_CODES.VALIDATION_ERROR}.invalid_time`,
};

/**
 * Rate limiting error codes
 */
export const RATE_LIMIT_ERRORS = {
  TOO_MANY_REQUESTS: `${ERROR_CODES.RATE_LIMIT_ERROR}.too_many_requests`,
  TOO_MANY_CONNECTIONS: `${ERROR_CODES.RATE_LIMIT_ERROR}.too_many_connections`,
  TOO_MANY_MESSAGES: `${ERROR_CODES.RATE_LIMIT_ERROR}.too_many_messages`,
  TOO_MANY_LOGIN_ATTEMPTS: `${ERROR_CODES.RATE_LIMIT_ERROR}.too_many_login_attempts`,
};

/**
 * WebSocket communication error codes
 */
export const WEBSOCKET_ERRORS = {
  CONNECTION_FAILED: `${ERROR_CODES.WEBSOCKET_ERROR}.connection_failed`,
  CONNECTION_CLOSED: `${ERROR_CODES.WEBSOCKET_ERROR}.connection_closed`,
  MESSAGE_DELIVERY_FAILED: `${ERROR_CODES.WEBSOCKET_ERROR}.message_delivery_failed`,
  AGENT_UNAVAILABLE: `${ERROR_CODES.WEBSOCKET_ERROR}.agent_unavailable`,
  INVALID_MESSAGE_FORMAT: `${ERROR_CODES.WEBSOCKET_ERROR}.invalid_message_format`,
};

/**
 * Server-side error codes
 */
export const SERVER_ERRORS = {
  INTERNAL_ERROR: `${ERROR_CODES.SERVER_ERROR}.internal_error`,
  SERVICE_UNAVAILABLE: `${ERROR_CODES.SERVER_ERROR}.service_unavailable`,
  DATABASE_ERROR: `${ERROR_CODES.SERVER_ERROR}.database_error`,
  REDIS_ERROR: `${ERROR_CODES.SERVER_ERROR}.redis_error`,
  ENCRYPTION_ERROR: `${ERROR_CODES.SERVER_ERROR}.encryption_error`,
};

/**
 * Agent-related error codes
 */
export const AGENT_ERRORS = {
  AGENT_NOT_FOUND: `${ERROR_CODES.AGENT_ERROR}.agent_not_found`,
  AGENT_CREATION_FAILED: `${ERROR_CODES.AGENT_ERROR}.agent_creation_failed`,
  NEGOTIATION_FAILED: `${ERROR_CODES.AGENT_ERROR}.negotiation_failed`,
  PROPOSAL_EXPIRED: `${ERROR_CODES.AGENT_ERROR}.proposal_expired`,
  PROPOSAL_REJECTED: `${ERROR_CODES.AGENT_ERROR}.proposal_rejected`,
};

/**
 * Maps error codes to human-readable error message templates
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  [AUTH_ERRORS.INVALID_CREDENTIALS]: 'The email or password you entered is incorrect. Please try again.',
  [AUTH_ERRORS.UNAUTHORIZED]: 'You must be logged in to access this resource.',
  [AUTH_ERRORS.FORBIDDEN]: 'You do not have permission to access this resource.',
  [AUTH_ERRORS.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [AUTH_ERRORS.TOKEN_INVALID]: 'Your authentication token is invalid. Please log in again.',
  [AUTH_ERRORS.USER_NOT_FOUND]: 'User not found. Please check the provided information.',
  [AUTH_ERRORS.EMAIL_IN_USE]: 'This email address is already in use. Please try another email or log in.',
  [AUTH_ERRORS.ACCOUNT_LOCKED]: 'Your account has been locked due to multiple failed login attempts. Please try again in {{minutes}} minutes or reset your password.',
  
  // Validation errors
  [VALIDATION_ERRORS.REQUIRED_FIELD]: 'The {{field}} field is required.',
  [VALIDATION_ERRORS.INVALID_FORMAT]: 'The {{field}} has an invalid format.',
  [VALIDATION_ERRORS.INVALID_EMAIL]: 'Please enter a valid email address.',
  [VALIDATION_ERRORS.INVALID_PASSWORD]: 'The password you entered doesn\'t meet the requirements.',
  [VALIDATION_ERRORS.PASSWORD_TOO_WEAK]: 'Your password is too weak. It should be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.',
  [VALIDATION_ERRORS.INVALID_AGENT_ID]: 'The agent ID provided is invalid.',
  [VALIDATION_ERRORS.INVALID_DATE]: 'Please enter a valid date in the format YYYY-MM-DD.',
  [VALIDATION_ERRORS.INVALID_TIME]: 'Please enter a valid time in the format HH:MM.',
  
  // Rate limit errors
  [RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS]: 'Too many requests. Please try again in {{seconds}} seconds.',
  [RATE_LIMIT_ERRORS.TOO_MANY_CONNECTIONS]: 'Too many connections. Please try again later.',
  [RATE_LIMIT_ERRORS.TOO_MANY_MESSAGES]: 'You\'ve sent too many messages in a short period. Please wait {{seconds}} seconds before sending more.',
  [RATE_LIMIT_ERRORS.TOO_MANY_LOGIN_ATTEMPTS]: 'Too many login attempts. Please try again in {{minutes}} minutes.',
  
  // WebSocket errors
  [WEBSOCKET_ERRORS.CONNECTION_FAILED]: 'Failed to establish connection. Please check your internet connection and try again.',
  [WEBSOCKET_ERRORS.CONNECTION_CLOSED]: 'Your connection was closed. Please refresh the page to reconnect.',
  [WEBSOCKET_ERRORS.MESSAGE_DELIVERY_FAILED]: 'Failed to deliver your message. Please try again.',
  [WEBSOCKET_ERRORS.AGENT_UNAVAILABLE]: 'The agent you\'re trying to reach is currently unavailable. Please try again later.',
  [WEBSOCKET_ERRORS.INVALID_MESSAGE_FORMAT]: 'Invalid message format. Please check your input and try again.',
  
  // Server errors
  [SERVER_ERRORS.INTERNAL_ERROR]: 'An internal server error occurred. Please try again later.',
  [SERVER_ERRORS.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.',
  [SERVER_ERRORS.DATABASE_ERROR]: 'A database error occurred. Please try again later.',
  [SERVER_ERRORS.REDIS_ERROR]: 'A caching error occurred. Please try again later.',
  [SERVER_ERRORS.ENCRYPTION_ERROR]: 'An encryption error occurred. Please try again later.',
  
  // Agent errors
  [AGENT_ERRORS.AGENT_NOT_FOUND]: 'The requested agent was not found.',
  [AGENT_ERRORS.AGENT_CREATION_FAILED]: 'Failed to create your agent. Please try again.',
  [AGENT_ERRORS.NEGOTIATION_FAILED]: 'The negotiation between agents failed. Please try again with different parameters.',
  [AGENT_ERRORS.PROPOSAL_EXPIRED]: 'The proposal has expired. Please create a new request.',
  [AGENT_ERRORS.PROPOSAL_REJECTED]: 'Your proposal was rejected by the recipient.',
};

/**
 * Retrieves a formatted error message based on error code and optional parameters
 * 
 * @param errorCode - The error code to retrieve the message for
 * @param params - Optional parameters to interpolate into the message
 * @returns Formatted error message with parameters interpolated
 */
export function getErrorMessage(errorCode: string, params?: Record<string, any>): string {
  // Get the message template from the error messages object
  const messageTemplate = ERROR_MESSAGES[errorCode];
  
  // If no template is found, return a generic error message
  if (!messageTemplate) {
    return 'An unexpected error occurred. Please try again later.';
  }
  
  // If no parameters are provided, return the template as is
  if (!params) {
    return messageTemplate;
  }
  
  // Interpolate parameters into the message template
  let formattedMessage = messageTemplate;
  for (const [key, value] of Object.entries(params)) {
    formattedMessage = formattedMessage.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  
  return formattedMessage;
}