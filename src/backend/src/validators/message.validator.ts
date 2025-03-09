import Joi from 'joi';
import {
  MESSAGE_TYPES,
  QUERY_TYPES,
  PROPOSAL_STATUS,
  REJECTION_REASONS
} from '../config/constants';
import { VALIDATION_ERRORS } from '../config/error-messages';
import {
  IMessage,
  IHandshakeMessage,
  IQueryMessage,
  IResponseMessage,
  IProposalMessage,
  IConfirmationMessage,
  IRejectionMessage,
  IHeartbeatMessage,
  IMeetingProposal
} from '../interfaces/message.interface';

/**
 * Base schema for all message types.
 * Validates common fields present in all agent-to-agent messages.
 */
export const baseMessageSchema = Joi.object({
  messageId: Joi.string().required(),
  conversationId: Joi.string().required(),
  senderId: Joi.string().required(),
  recipientId: Joi.string().required(),
  messageType: Joi.string().valid(...Object.values(MESSAGE_TYPES)).required(),
  content: Joi.any().required(),
  timestamp: Joi.number().required(),
  metadata: Joi.object({
    priority: Joi.string().optional(),
    expiresAt: Joi.number().optional(),
    encrypted: Joi.boolean().optional(),
    requiresResponse: Joi.boolean().optional()
  }).optional()
});

/**
 * Schema for handshake messages.
 * Validates messages used to establish a secure connection between agents.
 */
export const handshakeMessageSchema = baseMessageSchema.keys({
  messageType: Joi.string().valid(MESSAGE_TYPES.HANDSHAKE).required(),
  content: Joi.object({
    agentId: Joi.string().required(),
    publicKey: Joi.string().required()
  }).required()
});

/**
 * Schema for query messages.
 * Validates messages used to request information from another agent.
 */
export const queryMessageSchema = baseMessageSchema.keys({
  messageType: Joi.string().valid(MESSAGE_TYPES.QUERY).required(),
  content: Joi.object({
    requestId: Joi.string().required(),
    queryType: Joi.string().valid(...Object.values(QUERY_TYPES)).required(),
    parameters: Joi.object().required()
  }).required()
});

/**
 * Schema for response messages.
 * Validates messages used to respond to queries from another agent.
 */
export const responseMessageSchema = baseMessageSchema.keys({
  messageType: Joi.string().valid(MESSAGE_TYPES.RESPONSE).required(),
  content: Joi.object({
    requestId: Joi.string().required(),
    data: Joi.any().required(),
    error: Joi.string().optional()
  }).required()
});

/**
 * Schema for proposal messages.
 * Validates messages used to suggest a meeting between agents.
 */
export const proposalMessageSchema = baseMessageSchema.keys({
  messageType: Joi.string().valid(MESSAGE_TYPES.PROPOSAL).required(),
  content: Joi.object({
    proposalId: Joi.string().required(),
    details: Joi.object({
      title: Joi.string().required(),
      description: Joi.string().optional(),
      startTime: Joi.string().required(),
      endTime: Joi.string().required(),
      location: Joi.object({
        name: Joi.string().required(),
        address: Joi.string().required(),
        locationType: Joi.string().required(),
        coordinates: Joi.object({
          latitude: Joi.number().required(),
          longitude: Joi.number().required()
        }).optional()
      }).required(),
      meetingType: Joi.string().required(),
      participants: Joi.array().items(Joi.string()).required(),
      status: Joi.string().valid(...Object.values(PROPOSAL_STATUS)).required(),
      expiresAt: Joi.number().required()
    }).required()
  }).required()
});

/**
 * Schema for confirmation messages.
 * Validates messages used to accept a meeting proposal.
 */
export const confirmationMessageSchema = baseMessageSchema.keys({
  messageType: Joi.string().valid(MESSAGE_TYPES.CONFIRMATION).required(),
  content: Joi.object({
    proposalId: Joi.string().required(),
    status: Joi.string().valid(PROPOSAL_STATUS.ACCEPTED).required(),
    calendarEventId: Joi.string().optional()
  }).required()
});

/**
 * Schema for rejection messages.
 * Validates messages used to decline a meeting proposal.
 */
export const rejectionMessageSchema = baseMessageSchema.keys({
  messageType: Joi.string().valid(MESSAGE_TYPES.REJECTION).required(),
  content: Joi.object({
    proposalId: Joi.string().required(),
    reason: Joi.string().valid(...Object.values(REJECTION_REASONS)).required(),
    details: Joi.string().optional()
  }).required()
});

/**
 * Schema for heartbeat messages.
 * Validates messages used to maintain active connections between agents.
 */
export const heartbeatMessageSchema = baseMessageSchema.keys({
  messageType: Joi.string().valid(MESSAGE_TYPES.HEARTBEAT).required(),
  content: Joi.object({
    timestamp: Joi.number().required()
  }).required()
});

/**
 * Returns the appropriate Joi validation schema based on the message type.
 * 
 * @param messageType - The type of message to get the schema for
 * @returns The Joi schema for the specified message type
 */
export function getMessageSchema(messageType: string): Joi.ObjectSchema {
  switch (messageType) {
    case MESSAGE_TYPES.HANDSHAKE:
      return handshakeMessageSchema;
    case MESSAGE_TYPES.QUERY:
      return queryMessageSchema;
    case MESSAGE_TYPES.RESPONSE:
      return responseMessageSchema;
    case MESSAGE_TYPES.PROPOSAL:
      return proposalMessageSchema;
    case MESSAGE_TYPES.CONFIRMATION:
      return confirmationMessageSchema;
    case MESSAGE_TYPES.REJECTION:
      return rejectionMessageSchema;
    case MESSAGE_TYPES.HEARTBEAT:
      return heartbeatMessageSchema;
    default:
      return baseMessageSchema;
  }
}

/**
 * Validates the content of a message based on its message type.
 * 
 * @param message - The message object to validate
 * @returns The validation result with error or value property
 */
export function validateMessageContent(message: object): Joi.ValidationResult {
  const { messageType } = message as IMessage;
  const schema = getMessageSchema(messageType);
  return schema.validate(message, { abortEarly: false });
}