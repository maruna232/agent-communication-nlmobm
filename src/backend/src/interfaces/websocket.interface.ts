import { Server, Socket, ServerOptions } from 'socket.io'; // v4.7+
import { WEBSOCKET_EVENTS } from '../config/constants';
import { 
  IMessage, 
  IMessageAcknowledgement, 
  MessageDeliveryStatus 
} from '../interfaces/message.interface';

/**
 * Interface for the WebSocket server implementation.
 * Defines methods for managing WebSocket connections and communication between agents.
 */
export interface IWebSocketServer {
  /**
   * Initializes the WebSocket server with the given configuration.
   * @param config The WebSocket server configuration
   * @returns Promise resolving to the initialized server instance
   */
  initialize(config: IWebSocketConfig): Promise<Server>;
  
  /**
   * Shuts down the WebSocket server and closes all connections.
   * @returns Promise resolving when the server is shut down
   */
  shutdown(): Promise<void>;
  
  /**
   * Registers event handlers for the WebSocket server.
   * @returns void
   */
  registerHandlers(): void;
  
  /**
   * Sends a message to a specific agent.
   * @param agentId The recipient agent's ID
   * @param message The message to send
   * @returns Promise resolving to a message acknowledgement
   */
  sendMessage(agentId: string, message: IMessage): Promise<IMessageAcknowledgement>;
  
  /**
   * Broadcasts a message to multiple agents.
   * @param agentIds Array of recipient agent IDs
   * @param message The message to broadcast
   * @returns Promise resolving to an array of message acknowledgements
   */
  broadcastMessage(agentIds: string[], message: IMessage): Promise<IMessageAcknowledgement[]>;
  
  /**
   * Retrieves a connection by agent ID.
   * @param agentId The agent ID to find
   * @returns The WebSocket connection if found, or null
   */
  getConnectionByAgentId(agentId: string): IWebSocketConnection | null;
  
  /**
   * Checks if an agent is currently connected.
   * @param agentId The agent ID to check
   * @returns True if the agent is connected, false otherwise
   */
  isAgentConnected(agentId: string): boolean;
  
  /**
   * Disconnects an agent from the WebSocket server.
   * @param agentId The agent ID to disconnect
   * @returns Promise resolving when the agent is disconnected
   */
  disconnectAgent(agentId: string): Promise<void>;
  
  /**
   * Retrieves current statistics for the WebSocket server.
   * @returns WebSocket server statistics
   */
  getStats(): IWebSocketStats;
}

/**
 * Interface representing a WebSocket connection for an agent.
 * Contains information about the connection and the associated agent.
 */
export interface IWebSocketConnection {
  /** Unique identifier for the connection */
  connectionId: string;
  
  /** ID of the agent using this connection */
  agentId: string;
  
  /** ID of the user who owns the agent */
  userId: string;
  
  /** The Socket.io socket instance */
  socket: Socket;
  
  /** Current status of the connection */
  status: ConnectionStatus;
  
  /** Agent's public key for end-to-end encryption */
  publicKey: string;
  
  /** Timestamp when the connection was established */
  connectedAt: Date;
  
  /** Timestamp of the last activity on this connection */
  lastActivity: Date;
  
  /** Additional metadata about the connection */
  metadata: IConnectionMetadata;
}

/**
 * Interface for connection metadata including client information.
 * Provides additional context about the client making the connection.
 */
export interface IConnectionMetadata {
  /** User agent string from the client */
  userAgent: string;
  
  /** IP address of the client */
  ipAddress: string;
  
  /** Flag indicating whether encryption is enabled for this connection */
  encryptionEnabled: boolean;
  
  /** Unique identifier for the device making the connection */
  deviceId: string;
}

/**
 * Interface representing a message sent over WebSocket connections.
 * Includes the message content and metadata about encryption and authentication.
 */
export interface IWebSocketMessage {
  /** The message content */
  message: IMessage;
  
  /** Flag indicating whether the message is encrypted */
  encrypted: boolean;
  
  /** Cryptographic signature for message authentication */
  signature: string;
  
  /** Timestamp when the message was sent */
  timestamp: number;
}

/**
 * Interface representing a WebSocket event.
 * Used for events like connection, disconnection, etc.
 */
export interface IWebSocketEvent {
  /** Type of event (connect, disconnect, etc.) */
  eventType: string;
  
  /** ID of the connection associated with the event */
  connectionId: string;
  
  /** ID of the agent associated with the event */
  agentId: string;
  
  /** Timestamp when the event occurred */
  timestamp: number;
  
  /** Additional event data, structure depends on event type */
  data: any;
}

/**
 * Interface for WebSocket server configuration options.
 * Defines settings for the Socket.io server instance.
 */
export interface IWebSocketConfig {
  /** Port number for the WebSocket server */
  port: number;
  
  /** URL path for WebSocket connections */
  path: string;
  
  /** CORS origin settings */
  corsOrigin: string | string[];
  
  /** Maximum number of concurrent connections allowed */
  maxConnections: number;
  
  /** Ping interval in milliseconds */
  pingInterval: number;
  
  /** Ping timeout in milliseconds */
  pingTimeout: number;
  
  /** Flag to enable Redis adapter for multi-instance support */
  useRedis: boolean;
  
  /** Additional Socket.io server options */
  serverOptions: Partial<ServerOptions>;
}

/**
 * Interface for WebSocket server statistics.
 * Used for monitoring server performance and activity.
 */
export interface IWebSocketStats {
  /** Total number of connections since server start */
  totalConnections: number;
  
  /** Current number of active connections */
  activeConnections: number;
  
  /** Total number of messages sent */
  messagesSent: number;
  
  /** Total number of messages received */
  messagesReceived: number;
  
  /** Number of messages successfully delivered */
  messagesDelivered: number;
  
  /** Number of message delivery failures */
  messagesFailed: number;
  
  /** Server uptime in seconds */
  uptime: number;
  
  /** Timestamp when the server was started */
  startTime: Date;
}

/**
 * Enumeration of possible connection states.
 * Represents the lifecycle of a WebSocket connection.
 */
export enum ConnectionStatus {
  /** Connection is being established */
  CONNECTING = 'CONNECTING',
  
  /** Connection is established but not authenticated */
  CONNECTED = 'CONNECTED',
  
  /** Authentication is in progress */
  AUTHENTICATING = 'AUTHENTICATING',
  
  /** Connection is fully authenticated */
  AUTHENTICATED = 'AUTHENTICATED',
  
  /** Connection is in the process of disconnecting */
  DISCONNECTING = 'DISCONNECTING',
  
  /** Connection is disconnected */
  DISCONNECTED = 'DISCONNECTED',
  
  /** Connection encountered an error */
  ERROR = 'ERROR'
}

/**
 * Enumeration of WebSocket-specific error types.
 * Used to categorize different errors that can occur in WebSocket operations.
 */
export enum WebSocketErrorType {
  /** Authentication process failed */
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  
  /** Maximum connections limit exceeded */
  CONNECTION_LIMIT_EXCEEDED = 'CONNECTION_LIMIT_EXCEEDED',
  
  /** Rate limit for operations exceeded */
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  /** Message format is invalid or corrupted */
  INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
  
  /** Recipient agent not found or not connected */
  RECIPIENT_NOT_FOUND = 'RECIPIENT_NOT_FOUND',
  
  /** Error during encryption or decryption process */
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  
  /** Internal server error */
  SERVER_ERROR = 'SERVER_ERROR'
}

/**
 * Interface for WebSocket error information.
 * Provides structured data about errors that occur during WebSocket operations.
 */
export interface IWebSocketError {
  /** Type of error */
  errorType: WebSocketErrorType;
  
  /** Error message */
  message: string;
  
  /** Numeric error code */
  code: number;
  
  /** Timestamp when the error occurred */
  timestamp: number;
  
  /** ID of the connection associated with the error */
  connectionId: string;
  
  /** Additional error details, structure depends on error type */
  details: any;
}

/**
 * Interface for agent presence updates.
 * Used to notify other agents about changes in an agent's availability.
 */
export interface IPresenceUpdate {
  /** ID of the agent whose presence is being updated */
  agentId: string;
  
  /** Current status of the agent */
  status: string;
  
  /** Timestamp when the status was updated */
  timestamp: number;
  
  /** Additional metadata about the presence update */
  metadata: any;
}

/**
 * Interface for typing indicator events.
 * Used to indicate when an agent is typing in a conversation.
 */
export interface ITypingIndicator {
  /** ID of the agent who is typing */
  agentId: string;
  
  /** ID of the conversation where typing is occurring */
  conversationId: string;
  
  /** Flag indicating whether the agent is currently typing */
  isTyping: boolean;
  
  /** Timestamp when the typing status was updated */
  timestamp: number;
}