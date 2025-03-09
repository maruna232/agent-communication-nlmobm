/**
 * validation.ts
 * 
 * Provides comprehensive validation utilities for the AI Agent Network application,
 * ensuring data integrity and security across various components. This file implements
 * validation functions for user input, form data, API requests, and data structures
 * used throughout the application.
 */

import { isEmail, isURL, isStrongPassword } from 'validator'; // v13.9.0
import { createValidationError } from './errorHandling';
import { isValidDateTimeRange } from './dateTime';

/**
 * Validates that all required fields are present and not empty in an object
 * 
 * @param values - Object to validate
 * @param requiredFields - Array of required field names
 * @returns Object with validation errors for missing fields
 */
export function validateRequiredFields(
  values: Record<string, any>,
  requiredFields: string[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  requiredFields.forEach(field => {
    if (!values[field] && values[field] !== 0) {
      errors[field] = 'This field is required';
    } else if (typeof values[field] === 'string' && values[field].trim() === '') {
      errors[field] = 'This field cannot be empty';
    }
  });
  
  return errors;
}

/**
 * Validates an email address format
 * 
 * @param email - Email address to validate
 * @returns True if email is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  return isEmail(email);
}

/**
 * Validates password strength according to security requirements
 * 
 * @param password - Password to validate
 * @returns Validation result with isValid flag and error message
 */
export function validatePassword(
  password: string
): { isValid: boolean; error?: string } {
  if (!password || password.length < 10) {
    return {
      isValid: false,
      error: 'Password must be at least 10 characters long'
    };
  }
  
  const isValid = isStrongPassword(password, {
    minLength: 10,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  });
  
  if (!isValid) {
    return {
      isValid: false,
      error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    };
  }
  
  return { isValid: true };
}

/**
 * Validates that password and confirmation password match
 * 
 * @param password - Password
 * @param confirmPassword - Confirmation password
 * @returns True if passwords match, false otherwise
 */
export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): boolean {
  return password === confirmPassword;
}

/**
 * Validates a URL format
 * 
 * @param url - URL to validate
 * @returns True if URL is valid, false otherwise
 */
export function validateUrl(url: string): boolean {
  return isURL(url);
}

/**
 * Validates a phone number format
 * 
 * @param phoneNumber - Phone number to validate
 * @returns True if phone number is valid, false otherwise
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Check if the resulting string has a valid length for a phone number
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Validates that a time range is valid (start time before end time)
 * 
 * @param startTime - Start time
 * @param endTime - End time
 * @returns True if time range is valid, false otherwise
 */
export function validateTimeRange(
  startTime: string | Date,
  endTime: string | Date
): boolean {
  return isValidDateTimeRange(startTime, endTime);
}

/**
 * Validates an agent configuration object
 * 
 * @param config - Agent configuration to validate
 * @returns Validation result with errors object and isValid flag
 */
export function validateAgentConfiguration(
  config: Record<string, any>
): { errors: Record<string, string>; isValid: boolean } {
  const errors: Record<string, string> = {};
  
  // Validate required fields
  const requiredFields = ['name', 'communicationStyle', 'schedulingPreferences', 'locationPreferences', 'privacySettings'];
  const requiredErrors = validateRequiredFields(config, requiredFields);
  Object.assign(errors, requiredErrors);
  
  // Validate that communicationStyle has valid values
  if (config.communicationStyle) {
    if (typeof config.communicationStyle.formality !== 'number' || 
        config.communicationStyle.formality < 0 || 
        config.communicationStyle.formality > 10) {
      errors.formality = 'Formality must be a number between 0 and 10';
    }
    
    if (typeof config.communicationStyle.verbosity !== 'number' || 
        config.communicationStyle.verbosity < 0 || 
        config.communicationStyle.verbosity > 10) {
      errors.verbosity = 'Verbosity must be a number between 0 and 10';
    }
  }
  
  // Validate that schedulingPreferences has valid values
  if (config.schedulingPreferences) {
    if (config.schedulingPreferences.workingHours) {
      if (!validateTimeRange(
        config.schedulingPreferences.workingHours.start,
        config.schedulingPreferences.workingHours.end
      )) {
        errors['schedulingPreferences.workingHours'] = 'Working hours start time must be before end time';
      }
    }
    
    if (config.schedulingPreferences.bufferTime && 
        (typeof config.schedulingPreferences.bufferTime !== 'number' || 
         config.schedulingPreferences.bufferTime < 0)) {
      errors['schedulingPreferences.bufferTime'] = 'Buffer time must be a positive number';
    }
  }
  
  // Validate that locationPreferences has valid values
  if (config.locationPreferences && config.locationPreferences.maxTravelDistance &&
      (typeof config.locationPreferences.maxTravelDistance !== 'number' || 
       config.locationPreferences.maxTravelDistance < 0)) {
    errors['locationPreferences.maxTravelDistance'] = 'Maximum travel distance must be a positive number';
  }
  
  // Validate that privacySettings has valid values
  if (config.privacySettings) {
    if (typeof config.privacySettings.shareCalendar !== 'boolean') {
      errors['privacySettings.shareCalendar'] = 'Share calendar setting must be a boolean';
    }
    
    if (typeof config.privacySettings.shareLocation !== 'boolean') {
      errors['privacySettings.shareLocation'] = 'Share location setting must be a boolean';
    }
    
    if (typeof config.privacySettings.requireApproval !== 'boolean') {
      errors['privacySettings.requireApproval'] = 'Require approval setting must be a boolean';
    }
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Validates a calendar event object
 * 
 * @param event - Calendar event to validate
 * @returns Validation result with errors object and isValid flag
 */
export function validateCalendarEvent(
  event: Record<string, any>
): { errors: Record<string, string>; isValid: boolean } {
  const errors: Record<string, string> = {};
  
  // Validate required fields
  const requiredFields = ['title', 'startTime', 'endTime'];
  const requiredErrors = validateRequiredFields(event, requiredFields);
  Object.assign(errors, requiredErrors);
  
  // Validate that startTime is before endTime
  if (event.startTime && event.endTime && !validateTimeRange(event.startTime, event.endTime)) {
    errors.timeRange = 'Start time must be before end time';
  }
  
  // Validate location if provided
  if (event.location) {
    if (typeof event.location === 'object') {
      if (!event.location.name) {
        errors['location.name'] = 'Location name is required';
      }
    } else {
      errors.location = 'Location must be an object';
    }
  }
  
  // Validate attendees if provided
  if (event.attendees && Array.isArray(event.attendees)) {
    event.attendees.forEach((attendee, index) => {
      if (typeof attendee === 'object' && attendee.email) {
        if (!validateEmail(attendee.email)) {
          errors[`attendees[${index}].email`] = 'Invalid email address';
        }
      } else {
        errors[`attendees[${index}]`] = 'Attendee must have an email property';
      }
    });
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Validates an agent message object
 * 
 * @param message - Agent message to validate
 * @returns Validation result with errors object and isValid flag
 */
export function validateAgentMessage(
  message: Record<string, any>
): { errors: Record<string, string>; isValid: boolean } {
  const errors: Record<string, string> = {};
  
  // Validate required fields
  const requiredFields = ['messageId', 'conversationId', 'senderId', 'recipientId', 'messageType', 'content'];
  const requiredErrors = validateRequiredFields(message, requiredFields);
  Object.assign(errors, requiredErrors);
  
  // Validate messageType
  const validMessageTypes = ['handshake', 'query', 'response', 'proposal', 'confirmation', 'rejection', 'heartbeat'];
  if (message.messageType && !validMessageTypes.includes(message.messageType)) {
    errors.messageType = `Message type must be one of: ${validMessageTypes.join(', ')}`;
  }
  
  // Validate content based on messageType
  if (message.messageType && message.content) {
    switch (message.messageType) {
      case 'handshake':
        if (!message.content.agentId || !message.content.publicKey) {
          errors.content = 'Handshake message must include agentId and publicKey';
        }
        break;
      case 'query':
        if (!message.content.requestId || !message.content.queryType) {
          errors.content = 'Query message must include requestId and queryType';
        }
        break;
      case 'response':
        if (!message.content.requestId) {
          errors.content = 'Response message must include requestId';
        }
        break;
      case 'proposal':
        if (!message.content.proposalId || !message.content.details) {
          errors.content = 'Proposal message must include proposalId and details';
        }
        break;
      case 'confirmation':
        if (!message.content.proposalId) {
          errors.content = 'Confirmation message must include proposalId';
        }
        break;
      case 'rejection':
        if (!message.content.proposalId) {
          errors.content = 'Rejection message must include proposalId';
        }
        break;
      case 'heartbeat':
        if (!message.content.timestamp) {
          errors.content = 'Heartbeat message must include timestamp';
        }
        break;
    }
  }
  
  // Validate metadata if provided
  if (message.metadata && typeof message.metadata !== 'object') {
    errors.metadata = 'Metadata must be an object';
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Validates a WebSocket message object
 * 
 * @param message - WebSocket message to validate
 * @returns Validation result with errors object and isValid flag
 */
export function validateWebSocketMessage(
  message: Record<string, any>
): { errors: Record<string, string>; isValid: boolean } {
  const errors: Record<string, string> = {};
  
  // Validate required fields
  const requiredFields = ['type', 'payload', 'timestamp'];
  const requiredErrors = validateRequiredFields(message, requiredFields);
  Object.assign(errors, requiredErrors);
  
  // Validate message type
  const validTypes = ['connect', 'disconnect', 'message', 'presence', 'typing', 'ack'];
  if (message.type && !validTypes.includes(message.type)) {
    errors.type = `Message type must be one of: ${validTypes.join(', ')}`;
  }
  
  // Validate payload based on message type
  if (message.type && message.payload) {
    switch (message.type) {
      case 'connect':
        if (!message.payload.agentId || !message.payload.publicKey) {
          errors.payload = 'Connect payload must include agentId and publicKey';
        }
        break;
      case 'disconnect':
        if (!message.payload.agentId) {
          errors.payload = 'Disconnect payload must include agentId';
        }
        break;
      case 'message':
        if (!message.payload.senderId || !message.payload.recipientId || !message.payload.encryptedContent) {
          errors.payload = 'Message payload must include senderId, recipientId, and encryptedContent';
        }
        break;
      case 'presence':
        if (!message.payload.agentId || !message.payload.status) {
          errors.payload = 'Presence payload must include agentId and status';
        }
        break;
      case 'typing':
        if (!message.payload.agentId || !message.payload.conversationId) {
          errors.payload = 'Typing payload must include agentId and conversationId';
        }
        break;
      case 'ack':
        if (!message.payload.messageId || !message.payload.status) {
          errors.payload = 'Ack payload must include messageId and status';
        }
        break;
    }
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Validates login credentials
 * 
 * @param credentials - Login credentials
 * @returns Validation result with errors object and isValid flag
 */
export function validateLoginCredentials(
  credentials: Record<string, any>
): { errors: Record<string, string>; isValid: boolean } {
  const errors: Record<string, string> = {};
  
  // Validate required fields
  const requiredFields = ['email', 'password'];
  const requiredErrors = validateRequiredFields(credentials, requiredFields);
  Object.assign(errors, requiredErrors);
  
  // Validate email format
  if (credentials.email && !validateEmail(credentials.email)) {
    errors.email = 'Invalid email address';
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Validates user registration data
 * 
 * @param data - Registration data
 * @returns Validation result with errors object and isValid flag
 */
export function validateRegistrationData(
  data: Record<string, any>
): { errors: Record<string, string>; isValid: boolean } {
  const errors: Record<string, string> = {};
  
  // Validate required fields
  const requiredFields = ['email', 'password', 'displayName'];
  const requiredErrors = validateRequiredFields(data, requiredFields);
  Object.assign(errors, requiredErrors);
  
  // Validate email format
  if (data.email && !validateEmail(data.email)) {
    errors.email = 'Invalid email address';
  }
  
  // Validate password strength
  if (data.password) {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid && passwordValidation.error) {
      errors.password = passwordValidation.error;
    }
  }
  
  // Validate password match if confirmPassword is provided
  if (data.password && data.confirmPassword && !validatePasswordMatch(data.password, data.confirmPassword)) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Validates a location object
 * 
 * @param location - Location object
 * @returns Validation result with errors object and isValid flag
 */
export function validateLocation(
  location: Record<string, any>
): { errors: Record<string, string>; isValid: boolean } {
  const errors: Record<string, string> = {};
  
  // Validate required fields
  const requiredFields = ['name', 'address'];
  const requiredErrors = validateRequiredFields(location, requiredFields);
  Object.assign(errors, requiredErrors);
  
  // Validate location type if provided
  const validLocationTypes = ['coffee_shop', 'restaurant', 'office', 'virtual', 'other'];
  if (location.locationType && !validLocationTypes.includes(location.locationType)) {
    errors.locationType = `Location type must be one of: ${validLocationTypes.join(', ')}`;
  }
  
  // Validate coordinates if provided
  if (location.coordinates) {
    if (typeof location.coordinates !== 'object' || 
        typeof location.coordinates.latitude !== 'number' || 
        typeof location.coordinates.longitude !== 'number') {
      errors.coordinates = 'Coordinates must include numeric latitude and longitude';
    }
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Validates a meeting proposal object
 * 
 * @param proposal - Meeting proposal
 * @returns Validation result with errors object and isValid flag
 */
export function validateMeetingProposal(
  proposal: Record<string, any>
): { errors: Record<string, string>; isValid: boolean } {
  const errors: Record<string, string> = {};
  
  // Validate required fields
  const requiredFields = ['title', 'startTime', 'endTime', 'location', 'meetingType'];
  const requiredErrors = validateRequiredFields(proposal, requiredFields);
  Object.assign(errors, requiredErrors);
  
  // Validate that startTime is before endTime
  if (proposal.startTime && proposal.endTime && !validateTimeRange(proposal.startTime, proposal.endTime)) {
    errors.timeRange = 'Start time must be before end time';
  }
  
  // Validate location
  if (proposal.location) {
    const locationValidation = validateLocation(proposal.location);
    if (!locationValidation.isValid) {
      Object.entries(locationValidation.errors).forEach(([key, value]) => {
        errors[`location.${key}`] = value;
      });
    }
  }
  
  // Validate meeting type
  const validMeetingTypes = ['coffee', 'lunch', 'dinner', 'video_call', 'phone_call', 'in_person'];
  if (proposal.meetingType && !validMeetingTypes.includes(proposal.meetingType)) {
    errors.meetingType = `Meeting type must be one of: ${validMeetingTypes.join(', ')}`;
  }
  
  // Validate participants if provided
  if (proposal.participants && Array.isArray(proposal.participants)) {
    proposal.participants.forEach((participant, index) => {
      if (typeof participant === 'object') {
        if (participant.email && !validateEmail(participant.email)) {
          errors[`participants[${index}].email`] = 'Invalid email address';
        }
      } else {
        errors[`participants[${index}]`] = 'Participant must be an object';
      }
    });
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Validates an approval request object
 * 
 * @param request - Approval request
 * @returns Validation result with errors object and isValid flag
 */
export function validateApprovalRequest(
  request: Record<string, any>
): { errors: Record<string, string>; isValid: boolean } {
  const errors: Record<string, string> = {};
  
  // Validate required fields
  const requiredFields = ['requestId', 'agentId', 'userId', 'type', 'data'];
  const requiredErrors = validateRequiredFields(request, requiredFields);
  Object.assign(errors, requiredErrors);
  
  // Validate request type
  const validTypes = ['meeting_proposal', 'calendar_event', 'connection_request', 'information_sharing'];
  if (request.type && !validTypes.includes(request.type)) {
    errors.type = `Request type must be one of: ${validTypes.join(', ')}`;
  }
  
  // Validate data based on request type
  if (request.type && request.data) {
    switch (request.type) {
      case 'meeting_proposal':
        const proposalValidation = validateMeetingProposal(request.data);
        if (!proposalValidation.isValid) {
          Object.entries(proposalValidation.errors).forEach(([key, value]) => {
            errors[`data.${key}`] = value;
          });
        }
        break;
      case 'calendar_event':
        const eventValidation = validateCalendarEvent(request.data);
        if (!eventValidation.isValid) {
          Object.entries(eventValidation.errors).forEach(([key, value]) => {
            errors[`data.${key}`] = value;
          });
        }
        break;
      case 'connection_request':
        if (!request.data.agentId || !request.data.userId || !request.data.userEmail) {
          errors.data = 'Connection request must include agentId, userId, and userEmail';
        }
        if (request.data.userEmail && !validateEmail(request.data.userEmail)) {
          errors['data.userEmail'] = 'Invalid email address';
        }
        break;
      case 'information_sharing':
        if (!request.data.dataType || !request.data.dataContent) {
          errors.data = 'Information sharing request must include dataType and dataContent';
        }
        break;
    }
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Validates a storage operation object
 * 
 * @param operation - Storage operation
 * @returns Validation result with errors object and isValid flag
 */
export function validateStorageOperation(
  operation: Record<string, any>
): { errors: Record<string, string>; isValid: boolean } {
  const errors: Record<string, string> = {};
  
  // Validate required fields
  const requiredFields = ['type', 'storeName'];
  const requiredErrors = validateRequiredFields(operation, requiredFields);
  Object.assign(errors, requiredErrors);
  
  // Validate operation type
  const validTypes = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'QUERY'];
  if (operation.type && !validTypes.includes(operation.type)) {
    errors.type = `Operation type must be one of: ${validTypes.join(', ')}`;
  }
  
  // Validate operation-specific fields
  if (operation.type) {
    switch (operation.type) {
      case 'CREATE':
        if (!operation.value) {
          errors.value = 'CREATE operation requires a value';
        }
        break;
      case 'READ':
      case 'DELETE':
        if (!operation.key) {
          errors.key = `${operation.type} operation requires a key`;
        }
        break;
      case 'UPDATE':
        if (!operation.key) {
          errors.key = 'UPDATE operation requires a key';
        }
        if (!operation.value) {
          errors.value = 'UPDATE operation requires a value';
        }
        break;
      case 'QUERY':
        if (!operation.query || typeof operation.query !== 'object') {
          errors.query = 'QUERY operation requires a query object';
        }
        break;
    }
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
}