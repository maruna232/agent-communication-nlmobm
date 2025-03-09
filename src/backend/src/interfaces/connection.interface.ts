import { CONNECTION_STATUS } from '../config/constants';

/**
 * Interface representing a connection between two agents.
 * This is the core data structure for agent-to-agent relationships.
 * 
 * Connections enable secure communication channels between agents,
 * supporting the agent-to-agent communication protocol outlined in
 * the technical specifications.
 */
export interface IConnection {
  /** Unique identifier for the connection */
  connectionId: string;
  
  /** Agent ID that initiated the connection */
  initiatorAgentId: string;
  
  /** Agent ID that received the connection request */
  recipientAgentId: string;
  
  /** 
   * Current status of the connection
   * (PENDING, CONNECTED, DISCONNECTED, REJECTED)
   */
  status: string;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
  
  /** Last activity timestamp for monitoring connection health */
  lastActivity: Date;
  
  /** Additional metadata about the connection */
  metadata: IConnectionMetadata;
}

/**
 * Interface for connection metadata, containing additional information
 * about purpose, security settings, and approvals.
 * 
 * This supports the privacy-first approach by explicitly tracking
 * user approval and enabling encryption.
 */
export interface IConnectionMetadata {
  /** User ID that initiated the connection */
  initiatedBy: string;
  
  /** Purpose or reason for the connection (e.g., "scheduling") */
  purpose: string;
  
  /** Whether end-to-end encryption is enabled for this connection */
  encryptionEnabled: boolean;
  
  /** 
   * Whether the connection has been explicitly approved by the user,
   * implementing the explicit consent model for agent communication
   */
  userApproved: boolean;
  
  /** 
   * Optional expiration date for the connection,
   * enhancing privacy by limiting connection lifetime
   */
  expiresAt: Date;
}

/**
 * Interface for a connection request, used when creating a new connection
 * between agents.
 * 
 * Follows the connection establishment protocol described in
 * the WebSocket Communication Protocol section.
 */
export interface IConnectionRequest {
  /** Agent ID initiating the connection */
  initiatorAgentId: string;
  
  /** Agent ID receiving the connection request */
  recipientAgentId: string;
  
  /** Purpose of the connection request */
  purpose: string;
  
  /** Optional additional metadata */
  metadata: Partial<IConnectionMetadata>;
}

/**
 * Interface for connection operation responses.
 */
export interface IConnectionResponse {
  /** The connection data */
  connection: IConnection;
  
  /** Status message or additional information */
  message: string;
}

/**
 * Interface for connection update requests.
 * 
 * Enables updating connection status and metadata,
 * supporting the connection lifecycle management.
 */
export interface IConnectionUpdateRequest {
  /** New status to set for the connection */
  status: string;
  
  /** Metadata fields to update */
  metadata: Partial<IConnectionMetadata>;
}

/**
 * Interface for connection search parameters.
 * 
 * Enables filtering and pagination when searching for connections,
 * supporting effective connection management.
 */
export interface IConnectionSearchParams {
  /** Filter by agent ID (can be initiator or recipient) */
  agentId: string;
  
  /** Filter by connection status */
  status: string;
  
  /** Maximum number of results to return */
  limit: number;
  
  /** Number of results to skip (for pagination) */
  offset: number;
}

/**
 * Interface for connection statistics.
 * 
 * Provides monitoring capabilities for connection activity,
 * supporting the observability requirements.
 */
export interface IConnectionStats {
  /** Total number of connections */
  totalConnections: number;
  
  /** Number of active connections */
  activeConnections: number;
  
  /** Number of pending connections */
  pendingConnections: number;
  
  /** Number of rejected connections */
  rejectedConnections: number;
  
  /** Average duration of connections in milliseconds */
  averageConnectionDuration: number;
}

/**
 * Enum for types of events that can occur in a connection's lifecycle.
 * 
 * Supports the connection lifecycle events described in the
 * WebSocket Communication Protocol section.
 */
export enum ConnectionEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED'
}

/**
 * Interface for connection lifecycle events.
 * 
 * Enables auditing and monitoring of connection activities,
 * supporting the security and observability requirements.
 */
export interface IConnectionEvent {
  /** ID of the connection this event relates to */
  connectionId: string;
  
  /** Type of the event */
  eventType: ConnectionEventType;
  
  /** When the event occurred */
  timestamp: Date;
  
  /** Additional event data */
  data: any;
}

/**
 * Enum for connection error types.
 * 
 * Provides standardized error types for connection operations,
 * supporting consistent error handling.
 */
export enum ConnectionErrorType {
  CONNECTION_NOT_FOUND = 'CONNECTION_NOT_FOUND',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_STATUS = 'INVALID_STATUS',
  CONNECTION_EXISTS = 'CONNECTION_EXISTS'
}