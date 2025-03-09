/**
 * WebSocket API Interfaces
 * 
 * This file defines the WebSocket API interfaces for the AI Agent Network,
 * providing a standardized contract for secure, real-time agent-to-agent communication.
 * It establishes core interfaces for WebSocket connections, message encryption,
 * and agent communication while maintaining the privacy-first approach.
 */

import { Socket } from 'socket.io-client';
import {
  WEBSOCKET_EVENTS,
  MESSAGE_TYPES,
  MESSAGE_PRIORITY,
  DEFAULT_CONFIG
} from '../constants';
import { AgentMessage, MessageMetadata } from '../types/agent.types';

/**
 * Default WebSocket configuration
 */
export const DEFAULT_WEBSOCKET_CONFIG = {
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://api.aiagentnetwork.com',
  path: '/socket.io',
  reconnectionAttempts: DEFAULT_CONFIG.WEBSOCKET_RECONNECT_ATTEMPTS,
  reconnectionDelay: DEFAULT_CONFIG.WEBSOCKET_RECONNECT_DELAY,
  timeout: DEFAULT_CONFIG.WEBSOCKET_TIMEOUT,
  autoConnect: false
};

/**
 * WebSocket configuration options
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
 * Possible states for WebSocket connections
 */
export enum WebSocketConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Authentication payload for WebSocket connections
 */
export interface WebSocketAuthPayload {
  token: string;
  agentId: string;
  publicKey: string;
}

/**
 * Authentication result for WebSocket connections
 */
export interface WebSocketAuthResult {
  authenticated: boolean;
  userId: string;
  agentId: string;
  error?: string;
}

/**
 * WebSocket connection structure with agent information
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
 * Basic WebSocket message structure
 */
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

/**
 * Encrypted WebSocket message structure
 */
export interface WebSocketEncryptedMessage {
  encryptedData: string;
  nonce: string;
  signature: string;
  senderId: string;
  recipientId: string;
  encrypted: boolean;
}

/**
 * WebSocket event handler structure
 */
export interface WebSocketHandler {
  eventType: string;
  handler: Function;
}

/**
 * Error types specific to WebSocket operations
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
 * WebSocket error structure with detailed information
 */
export interface WebSocketError {
  type: WebSocketErrorType;
  message: string;
  code: number;
  timestamp: number;
  details?: any;
}

/**
 * Possible delivery status values for messages
 */
export enum MessageDeliveryStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

/**
 * Message delivery acknowledgment structure
 */
export interface MessageAcknowledgement {
  messageId: string;
  status: MessageDeliveryStatus;
  timestamp: number;
}

/**
 * Agent presence status update structure
 */
export interface PresenceUpdate {
  agentId: string;
  status: string;
  timestamp: number;
}

/**
 * Real-time typing indicator structure
 */
export interface TypingIndicator {
  agentId: string;
  conversationId: string;
  isTyping: boolean;
}

/**
 * WebSocket client implementation interface
 */
export interface WebSocketClientInterface {
  connect(authPayload: WebSocketAuthPayload): Promise<WebSocketAuthResult>;
  disconnect(): void;
  sendMessage(message: AgentMessage): Promise<boolean>;
  registerHandler(handler: WebSocketHandler): void;
  unregisterHandler(eventType: string): void;
  updatePresence(status: string): void;
  sendTypingIndicator(conversationId: string, isTyping: boolean): void;
  getConnectionStatus(): WebSocketConnectionStatus;
}

/**
 * Cryptographic key pair structure
 */
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Encryption and signing key pairs structure
 */
export interface EncryptionKeys {
  encryptionKeyPair: KeyPair;
  signingKeyPair: KeyPair;
}

/**
 * Interface for storing and retrieving shared secrets for encryption
 */
export interface SharedSecretStore {
  get(recipientId: string): string | null;
  set(recipientId: string, secret: string): void;
  has(recipientId: string): boolean;
  delete(recipientId: string): void;
  clear(): void;
}

/**
 * Heartbeat message structure for connection maintenance
 */
export interface HeartbeatMessage {
  timestamp: number;
}