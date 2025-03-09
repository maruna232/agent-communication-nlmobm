/**
 * WebSocket Type Definitions
 * 
 * This file contains TypeScript interfaces and types for WebSocket communication in the AI Agent Network.
 * These types enable secure, real-time agent-to-agent communication with end-to-end encryption, 
 * connection management, and message delivery guarantees while maintaining user privacy.
 */

import { Socket } from 'socket.io-client'; // ^4.7.0
import { 
  WEBSOCKET_EVENTS, 
  MESSAGE_TYPES, 
  MESSAGE_PRIORITY 
} from '../constants';
import { 
  AgentMessage, 
  MessageMetadata 
} from '../types/agent.types';

/**
 * Defines configuration options for WebSocket connections
 */
export interface WebSocketConfig {
  url: string;
  path: string;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  timeout: number;
  autoConnect: boolean;
}

/**
 * Defines possible states for WebSocket connections
 */
export enum WebSocketConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Defines the authentication payload for WebSocket connections
 */
export interface WebSocketAuthPayload {
  token: string;
  agentId: string;
  publicKey: string;
}

/**
 * Defines the authentication result for WebSocket connections
 */
export interface WebSocketAuthResult {
  authenticated: boolean;
  userId: string;
  agentId: string;
  error: string;
}

/**
 * Defines the structure for WebSocket connections with agent information
 */
export interface WebSocketConnection {
  socket: Socket;
  status: WebSocketConnectionStatus;
  agentId: string;
  userId: string;
  publicKey: string;
  connectedAt: Date;
  lastActivity: Date;
  error: string | null;
}

/**
 * Defines the structure for messages sent over WebSocket connections
 */
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

/**
 * Defines the structure for encrypted messages with signature verification
 */
export interface WebSocketEncryptedMessage {
  message: AgentMessage;
  encrypted: boolean;
  signature: string;
}

/**
 * Defines the structure for WebSocket event handlers
 */
export interface WebSocketHandler {
  eventType: string;
  handler: Function;
}

/**
 * Defines error types specific to WebSocket operations
 */
export enum WebSocketErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  MESSAGE_ERROR = 'MESSAGE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  RECIPIENT_NOT_FOUND = 'RECIPIENT_NOT_FOUND'
}

/**
 * Defines the structure for WebSocket errors with detailed information
 */
export interface WebSocketError {
  type: WebSocketErrorType;
  message: string;
  code: number;
  timestamp: number;
  details: any;
}

/**
 * Defines possible delivery status values for messages
 */
export enum MessageDeliveryStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

/**
 * Defines the structure for message delivery acknowledgements
 */
export interface MessageAcknowledgement {
  messageId: string;
  status: MessageDeliveryStatus;
  timestamp: number;
}

/**
 * Defines the structure for agent presence status updates
 */
export interface PresenceUpdate {
  agentId: string;
  status: string;
  timestamp: number;
}

/**
 * Defines the structure for real-time typing indicators
 */
export interface TypingIndicator {
  agentId: string;
  conversationId: string;
  isTyping: boolean;
}

/**
 * Defines the interface for WebSocket client implementations
 */
export interface WebSocketClientInterface {
  connect: (authPayload: WebSocketAuthPayload) => Promise<WebSocketAuthResult>;
  disconnect: () => void;
  sendMessage: (message: AgentMessage) => Promise<boolean>;
  registerHandler: (handler: WebSocketHandler) => void;
  unregisterHandler: (eventType: string) => void;
  updatePresence: (status: string) => void;
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void;
  getConnectionStatus: () => WebSocketConnectionStatus;
}

/**
 * Defines the structure for cryptographic key pairs used in encryption
 */
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Defines the structure for encryption and signing key pairs
 */
export interface EncryptionKeys {
  encryptionKeyPair: KeyPair;
  signingKeyPair: KeyPair;
}

/**
 * Defines the interface for storing and retrieving shared secrets for encryption
 */
export interface SharedSecretStore {
  get: (recipientId: string) => string | null;
  set: (recipientId: string, secret: string) => void;
  has: (recipientId: string) => boolean;
  delete: (recipientId: string) => void;
  clear: () => void;
}

/**
 * Defines the structure for heartbeat messages to maintain connections
 */
export interface HeartbeatMessage {
  timestamp: number;
}