import { 
  MESSAGE_TYPES, 
  QUERY_TYPES, 
  PROPOSAL_STATUS, 
  REJECTION_REASONS 
} from '../config/constants';

import {
  MessagePriority,
  ILocation,
  MeetingType
} from '../interfaces/agent.interface';

/**
 * Base interface for all messages exchanged between agents.
 * All message types extend this interface.
 */
export interface IMessage {
  /** Unique identifier for the message */
  messageId: string;
  
  /** Identifier for the conversation this message belongs to */
  conversationId: string;
  
  /** Identifier of the sending agent */
  senderId: string;
  
  /** Identifier of the receiving agent */
  recipientId: string;
  
  /** Type of message (HANDSHAKE, QUERY, RESPONSE, etc.) */
  messageType: string;
  
  /** Message payload, structure depends on messageType */
  content: any;
  
  /** Timestamp when the message was created (milliseconds since epoch) */
  timestamp: number;
  
  /** Additional metadata for the message */
  metadata: IMessageMetadata;
}

/**
 * Interface for message metadata properties.
 * Provides additional context and handling instructions for messages.
 */
export interface IMessageMetadata {
  /** Message priority level */
  priority: MessagePriority;
  
  /** Timestamp when the message expires (milliseconds since epoch) */
  expiresAt: number;
  
  /** Flag indicating whether the message content is encrypted */
  encrypted: boolean;
  
  /** Flag indicating whether the message requires a response */
  requiresResponse: boolean;
}

/**
 * Interface for handshake message content.
 * Used to establish secure connections between agents.
 */
export interface IHandshakeMessage {
  /** Identifier of the agent initiating the handshake */
  agentId: string;
  
  /** Public key for establishing encrypted communication */
  publicKey: string;
}

/**
 * Interface for query message content.
 * Used to request information from another agent.
 */
export interface IQueryMessage {
  /** Unique identifier for the request */
  requestId: string;
  
  /** Type of query (AVAILABILITY, LOCATION_PREFERENCE, etc.) */
  queryType: string;
  
  /** Additional parameters for the query, structure depends on queryType */
  parameters: any;
}

/**
 * Interface for availability query parameters.
 * Used to request another agent's availability within a date range.
 */
export interface IAvailabilityQueryParams {
  /** Start date for the availability check (ISO format) */
  startDate: string;
  
  /** End date for the availability check (ISO format) */
  endDate: string;
  
  /** Time zone for the availability check */
  timeZone: string;
}

/**
 * Interface for location preference query parameters.
 * Used to request another agent's location preferences near a specific area.
 */
export interface ILocationPreferenceQueryParams {
  /** Geographic coordinates for the location query */
  coordinates: { latitude: number; longitude: number };
  
  /** Search radius in kilometers */
  radius: number;
}

/**
 * Interface for response message content.
 * Used to respond to queries from another agent.
 */
export interface IResponseMessage {
  /** Identifier of the request this response is for */
  requestId: string;
  
  /** Response data, structure depends on the original query type */
  data: any;
  
  /** Error message if the request could not be fulfilled */
  error: string;
}

/**
 * Interface for proposal message content.
 * Used to suggest a meeting between agents.
 */
export interface IProposalMessage {
  /** Unique identifier for the proposal */
  proposalId: string;
  
  /** Details of the meeting proposal */
  details: IMeetingProposal;
}

/**
 * Interface for meeting proposal details.
 * Defines the specifics of a proposed meeting.
 */
export interface IMeetingProposal {
  /** Title of the meeting */
  title: string;
  
  /** Description of the meeting purpose */
  description: string;
  
  /** Start time of the meeting (ISO format) */
  startTime: string;
  
  /** End time of the meeting (ISO format) */
  endTime: string;
  
  /** Location for the meeting */
  location: ILocation;
  
  /** Type of meeting (COFFEE, LUNCH, etc.) */
  meetingType: MeetingType;
  
  /** List of participant agent IDs */
  participants: string[];
  
  /** Current status of the proposal (PENDING, ACCEPTED, etc.) */
  status: string;
  
  /** Timestamp when the proposal expires (milliseconds since epoch) */
  expiresAt: number;
}

/**
 * Interface for confirmation message content.
 * Used to accept a meeting proposal.
 */
export interface IConfirmationMessage {
  /** Identifier of the proposal being confirmed */
  proposalId: string;
  
  /** Status of the confirmation (ACCEPTED) */
  status: string;
  
  /** ID of the created calendar event (if applicable) */
  calendarEventId: string;
}

/**
 * Interface for rejection message content.
 * Used to decline a meeting proposal.
 */
export interface IRejectionMessage {
  /** Identifier of the proposal being rejected */
  proposalId: string;
  
  /** Reason for rejection (SCHEDULE_CONFLICT, LOCATION_UNAVAILABLE, etc.) */
  reason: string;
  
  /** Additional details explaining the rejection */
  details: string;
}

/**
 * Interface for heartbeat message content.
 * Used to maintain active connections between agents.
 */
export interface IHeartbeatMessage {
  /** Current timestamp (milliseconds since epoch) */
  timestamp: number;
}

/**
 * Interface for message creation requests.
 * Used by the API to create and send new messages.
 */
export interface IMessageCreateRequest {
  /** Identifier for the conversation this message belongs to */
  conversationId: string;
  
  /** Identifier of the receiving agent */
  recipientId: string;
  
  /** Type of message (HANDSHAKE, QUERY, RESPONSE, etc.) */
  messageType: string;
  
  /** Message payload, structure depends on messageType */
  content: any;
  
  /** Additional metadata for the message (optional) */
  metadata?: Partial<IMessageMetadata>;
}

/**
 * Interface for message operation responses.
 * Used by the API to return results of message-related operations.
 */
export interface IMessageResponse {
  /** The message object */
  message: IMessage;
  
  /** Status of the operation */
  status: string;
}

/**
 * Interface for message search parameters.
 * Used to filter messages when retrieving conversation history.
 */
export interface IMessageSearchParams {
  /** Filter by conversation ID */
  conversationId?: string;
  
  /** Filter by sender agent ID */
  senderId?: string;
  
  /** Filter by recipient agent ID */
  recipientId?: string;
  
  /** Filter by message type */
  messageType?: string;
  
  /** Filter by start date (milliseconds since epoch) */
  startDate?: number;
  
  /** Filter by end date (milliseconds since epoch) */
  endDate?: number;
  
  /** Maximum number of messages to return */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
}

/**
 * Enumeration of possible message delivery statuses.
 */
export enum MessageDeliveryStatus {
  /** Message has been sent but not yet delivered */
  SENT = 'SENT',
  
  /** Message has been delivered to the recipient */
  DELIVERED = 'DELIVERED',
  
  /** Message has been read by the recipient */
  READ = 'READ',
  
  /** Message delivery failed */
  FAILED = 'FAILED'
}