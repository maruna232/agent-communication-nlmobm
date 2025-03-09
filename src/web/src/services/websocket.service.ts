import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import {
  WebSocketClientInterface,
  WebSocketConfig,
  WebSocketAuthPayload,
  WebSocketAuthResult,
  WebSocketConnectionStatus,
  WebSocketHandler,
  WebSocketErrorType,
  AgentMessage,
  KeyPair,
  WEBSOCKET_EVENTS,
  MESSAGE_TYPES
} from '../lib/types/websocket.types';
import {
  createWebSocketClient,
  DEFAULT_WEBSOCKET_CONFIG
} from '../lib/websocket/socketClient';
import {
  generateAgentKeyPair,
  generateAgentSigningKeyPair,
  encryptAgentToAgentMessage,
  decryptAgentToAgentMessage
} from '../lib/websocket/encryption';
import { authService } from './auth.service';
import { StorageService } from './storage.service';
import { API_ENDPOINTS, DEFAULT_CONFIG } from '../lib/constants';

/**
 * Creates a standardized WebSocket error object
 * @param type WebSocketErrorType - The type of the WebSocket error
 * @param message string - The error message
 * @param details any - Additional error details
 * @returns Error - Standardized error object with WebSocket-specific properties
 */
function createWebSocketError(type: WebSocketErrorType, message: string, details?: any): Error {
  const error = new Error(message) as Error & { type: WebSocketErrorType; timestamp: number; details?: any }; // Create an Error object with the provided message
  error.type = type; // Add type property with the provided WebSocketErrorType
  error.timestamp = Date.now(); // Add timestamp property with current time
  error.details = details; // Add details property with the provided details
  return error; // Return the error object
}

/**
 * Generates a unique conversation identifier for agent-to-agent communication
 * @param agentId string - The ID of the agent initiating the conversation
 * @param recipientId string - The ID of the agent receiving the conversation
 * @returns string - Unique conversation identifier
 */
function generateConversationId(agentId: string, recipientId: string): string {
  const sortedIds = [agentId, recipientId].sort(); // Sort the agent IDs alphabetically to ensure consistent IDs regardless of initiator
  const conversationId = `${sortedIds[0]}-${sortedIds[1]}`; // Concatenate the sorted IDs with a separator
  return conversationId; // Return the concatenated string as the conversation ID
}

/**
 * Service that provides WebSocket communication capabilities for agent-to-agent interaction
 */
export class WebSocketService {
  private client: WebSocketClientInterface | null;
  private config: WebSocketConfig;
  private initialized: boolean;
  private encryptionKeys: KeyPair | null;
  private signingKeys: KeyPair | null;
  private storageService: StorageService;
  private messageHandlers: Map<string, Function>;
  private pendingMessages: Map<string, any>;

  /**
   * Creates a new WebSocketService instance
   * @param storageService StorageService - The storage service for persisting connection data
   */
  constructor(storageService: StorageService) {
    this.client = null; // Set client to null
    this.config = DEFAULT_WEBSOCKET_CONFIG; // Set config to DEFAULT_WEBSOCKET_CONFIG
    this.initialized = false; // Set initialized to false
    this.encryptionKeys = null; // Set encryptionKeys and signingKeys to null
    this.signingKeys = null;
    this.storageService = storageService; // Store the storageService reference
    this.messageHandlers = new Map(); // Initialize messageHandlers and pendingMessages maps
    this.pendingMessages = new Map();
  }

  /**
   * Initializes the WebSocket service with the specified configuration
   * @param config WebSocketConfig - The WebSocket configuration
   * @returns Promise<boolean> - Promise resolving to true if initialization was successful
   */
  async initialize(config: WebSocketConfig): Promise<boolean> {
    if (this.initialized) return true; // If already initialized, return true

    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...config }; // Merge provided config with DEFAULT_WEBSOCKET_CONFIG

    try {
      await this.loadOrGenerateKeys(); // Load or generate encryption and signing keys

      this.client = createWebSocketClient(this.config); // Create WebSocket client using createWebSocketClient
      this.registerDefaultHandlers(); // Register default message handlers

      this.initialized = true; // Set initialized flag to true
      return true; // Return true if initialization was successful
    } catch (error) {
      console.error('WebSocketService initialization failed:', error); // Handle any errors during initialization
      throw error;
    }
  }

  /**
   * Checks if the WebSocket service is initialized
   * @returns boolean - True if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized; // Return the value of the initialized flag
  }

  /**
   * Establishes a WebSocket connection with authentication
   * @returns Promise<WebSocketAuthResult> - Promise resolving to authentication result
   */
  async connect(): Promise<WebSocketAuthResult> {
    if (!this.initialized) {
      throw new Error('WebSocketService not initialized. Call initialize() first.'); // Check if service is initialized
    }

    try {
      const token = await authService.getToken(); // Get authentication token from authService
      const user = await authService.getCurrentUser(); // Get current user from authService

      if (!token || !user) {
        throw new Error('Authentication token or user not found');
      }

      if (!this.encryptionKeys || !this.encryptionKeys.publicKey) {
        throw new Error('Encryption keys not initialized');
      }

      const authPayload: WebSocketAuthPayload = { // Create WebSocketAuthPayload with token, agentId, and publicKey
        token: token.token,
        agentId: user.userId,
        publicKey: this.encryptionKeys.publicKey
      };

      return await this.client!.connect(authPayload); // Call client.connect with the auth payload
    } catch (error) {
      console.error('WebSocket connection failed:', error); // Handle any errors during connection
      throw error;
    }
  }

  /**
   * Closes the WebSocket connection gracefully
   * @returns Promise<void> - Promise that resolves when disconnection is complete
   */
  async disconnect(): Promise<void> {
    if (!this.initialized) {
      throw new Error('WebSocketService not initialized. Call initialize() first.'); // Check if service is initialized
    }

    try {
      this.client!.disconnect(); // Call client.disconnect
    } catch (error) {
      console.error('WebSocket disconnection failed:', error); // Handle any errors during disconnection
      throw error;
    }
  }

  /**
   * Gets the current WebSocket connection status
   * @returns WebSocketConnectionStatus - Current connection status
   */
  getConnectionStatus(): WebSocketConnectionStatus {
    if (!this.initialized || !this.client) {
      return WebSocketConnectionStatus.DISCONNECTED; // Return DISCONNECTED if not initialized or client is null
    }
    return this.client.getConnectionStatus(); // Return client.getConnectionStatus()
  }

  /**
   * Sends a message to another agent with end-to-end encryption
   * @param message AgentMessage - The message to send
   * @returns Promise<boolean> - Promise resolving to true if message was sent successfully
   */
  async sendMessage(message: AgentMessage): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('WebSocketService not initialized. Call initialize() first.'); // Check if service is initialized
    }

    try {
      if (!message.messageId) {
        message.messageId = uuidv4();
      }

      if (!message.timestamp) {
        message.timestamp = Date.now();
      }

      if (!message.senderId && authService.getCurrentUser) {
        const user = await authService.getCurrentUser();
        message.senderId = user!.userId;
      }

      if (!message.senderId || !message.recipientId || !message.messageType) {
        throw new Error('Message must have a senderId, recipientId and messageType');
      }

      return await this.client!.sendMessage(message);
    } catch (error) {
      console.error('WebSocket message sending failed:', error); // Handle any errors during message sending
      return false;
    }
  }

  /**
   * Initiates a new conversation with another agent
   * @param recipientId string - The ID of the agent to start a conversation with
   * @param messageType string - The type of the initial message
   * @param content any - The content of the initial message
   * @returns Promise<string> - Promise resolving to the conversation ID
   */
  async startConversation(recipientId: string, messageType: string, content: any): Promise<string> {
    if (!this.initialized) {
      throw new Error('WebSocketService not initialized. Call initialize() first.'); // Check if service is initialized
    }

    try {
      const user = await authService.getCurrentUser(); // Get current user and agent information

      if (!user) {
        throw new Error('User not found');
      }

      const conversationId = generateConversationId(user.userId, recipientId); // Generate conversation ID using generateConversationId

      const message: AgentMessage = { // Create initial message with messageType and content
        messageId: uuidv4(),
        conversationId: conversationId,
        senderId: user.userId,
        recipientId: recipientId,
        messageType: messageType,
        content: content,
        timestamp: Date.now(),
        metadata: {}
      };

      await this.sendMessage(message); // Call sendMessage with the created message
      return conversationId; // Return the conversation ID if message sent successfully
    } catch (error) {
      console.error('Failed to start conversation:', error); // Handle any errors during conversation initiation
      throw error;
    }
  }

  /**
   * Sends a message to an existing conversation
   * @param conversationId string - The ID of the conversation to send the message to
   * @param recipientId string - The ID of the recipient agent
   * @param messageType string - The type of the message
   * @param content any - The content of the message
   * @returns Promise<boolean> - Promise resolving to true if message was sent successfully
   */
  async sendToConversation(conversationId: string, recipientId: string, messageType: string, content: any): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('WebSocketService not initialized. Call initialize() first.'); // Check if service is initialized
    }

    try {
      const user = await authService.getCurrentUser(); // Get current user and agent information

      if (!user) {
        throw new Error('User not found');
      }

      const message: AgentMessage = { // Create message with conversationId, recipientId, messageType, and content
        messageId: uuidv4(),
        conversationId: conversationId,
        senderId: user.userId,
        recipientId: recipientId,
        messageType: messageType,
        content: content,
        timestamp: Date.now(),
        metadata: {}
      };

      return await this.sendMessage(message); // Call sendMessage with the created message
    } catch (error) {
      console.error('Failed to send message to conversation:', error); // Handle any errors during message sending
      return false;
    }
  }

  /**
   * Registers a handler for specific message types
   * @param messageType string - The message type to handle
   * @param handler Function - The handler function
   */
  registerMessageHandler(messageType: string, handler: Function): void {
    if (!this.initialized) {
      throw new Error('WebSocketService not initialized. Call initialize() first.'); // Check if service is initialized
    }

    if (!messageType || typeof handler !== 'function') {
      throw new Error('Invalid message type or handler'); // Validate messageType and handler
    }

    this.messageHandlers.set(messageType, handler); // Store handler in messageHandlers map with messageType as key
    this.client!.registerHandler({ eventType: messageType, handler: handler }); // Register handler with WebSocket client if needed
  }

  /**
   * Removes a previously registered message handler
   * @param messageType string - The message type to unregister
   */
  unregisterMessageHandler(messageType: string): void {
    if (!this.initialized) {
      throw new Error('WebSocketService not initialized. Call initialize() first.'); // Check if service is initialized
    }

    this.messageHandlers.delete(messageType); // Remove handler from messageHandlers map
    this.client!.unregisterHandler(messageType); // Unregister handler from WebSocket client if needed
  }

  /**
   * Updates the agent's presence status
   * @param status string - The new presence status
   */
  async updatePresence(status: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('WebSocketService not initialized. Call initialize() first.'); // Check if service is initialized
    }

    try {
      await this.client!.updatePresence(status); // Call client.updatePresence with status
    } catch (error) {
      console.error('Failed to update presence:', error); // Handle any errors during presence update
      throw error;
    }
  }

  /**
   * Sends a typing indicator for a specific conversation
   * @param conversationId string - The ID of the conversation
   * @param recipientId string - The ID of the recipient agent
   * @param isTyping boolean - Whether the user is typing
   */
  async sendTypingIndicator(conversationId: string, recipientId: string, isTyping: boolean): Promise<void> {
    if (!this.initialized) {
      throw new Error('WebSocketService not initialized. Call initialize() first.'); // Check if service is initialized
    }

    try {
      await this.client!.sendTypingIndicator(conversationId, isTyping); // Call client.sendTypingIndicator with conversationId and isTyping
    } catch (error) {
      console.error('Failed to send typing indicator:', error); // Handle any errors during typing indicator sending
      throw error;
    }
  }

  /**
   * Retrieves the message history for a specific conversation
   * @param conversationId string - The ID of the conversation
   * @param limit number - The maximum number of messages to retrieve
   * @param offset number - The offset to start retrieving messages from
   * @returns Promise<AgentMessage[]> - Promise resolving to array of messages
   */
  async getConversationHistory(conversationId: string, limit: number, offset: number): Promise<AgentMessage[]> {
    if (!this.initialized) {
      throw new Error('WebSocketService not initialized. Call initialize() first.'); // Check if service is initialized
    }

    try {
      // Retrieve conversation history from storage service
      // Apply limit and offset for pagination
      // Sort messages by timestamp
      // Return the filtered and sorted messages
      return [];
    } catch (error) {
      console.error('Failed to get conversation history:', error); // Handle any errors during history retrieval
      throw error;
    }
  }

  /**
   * Gets a list of active conversations for the current agent
   * @returns Promise<string[]> - Promise resolving to array of conversation IDs
   */
  async getActiveConversations(): Promise<string[]> {
    if (!this.initialized) {
      throw new Error('WebSocketService not initialized. Call initialize() first.'); // Check if service is initialized
    }

    try {
      // Retrieve active conversations from storage service
      // Return array of conversation IDs
      return [];
    } catch (error) {
      console.error('Failed to get active conversations:', error); // Handle any errors during retrieval
      throw error;
    }
  }

  /**
   * Loads existing encryption keys or generates new ones if not found
   * @returns Promise<void> - Promise that resolves when keys are loaded or generated
   */
  private async loadOrGenerateKeys(): Promise<void> {
    try {
      // Try to load encryption and signing keys from storage
      // If keys don't exist, generate new encryption key pair using generateAgentKeyPair
      // Generate new signing key pair using generateAgentSigningKeyPair
      // Store the generated keys in storage
      // Set the encryptionKeys and signingKeys properties
    } catch (error) {
      console.error('Failed to load or generate keys:', error); // Handle any errors during key loading or generation
      throw error;
    }
  }

  /**
   * Processes incoming messages and routes them to appropriate handlers
   * @param message AgentMessage - The message to process
   */
  private handleIncomingMessage(message: AgentMessage): void {
    try {
      // Validate message structure
      // Store message in conversation history
      // Check if a handler exists for the message type
      // If handler exists, call the handler with the message
      // If no handler exists, log a warning
    } catch (error) {
      console.error('Failed to handle incoming message:', error); // Handle any errors during message processing
    }
  }

  /**
   * Stores a message in the conversation history
   * @param message AgentMessage - The message to store
   */
  private async storeMessageInHistory(message: AgentMessage): Promise<void> {
    try {
      // Retrieve existing conversation history from storage
      // Add the new message to the history
      // Limit history size if it exceeds maximum
      // Store updated history in storage service
    } catch (error) {
      console.error('Failed to store message in history:', error); // Handle any errors during storage
      throw error;
    }
  }

  /**
   * Registers default message handlers for common message types
   */
  private registerDefaultHandlers(): void {
    try {
      // Register handler for HANDSHAKE messages
      // Register handler for QUERY messages
      // Register handler for RESPONSE messages
      // Register handler for PROPOSAL messages
      // Register handler for CONFIRMATION messages
      // Register handler for REJECTION messages
      // Register handler for HEARTBEAT messages
    } catch (error) {
      console.error('Failed to register default handlers:', error); // Handle any errors during handler registration
    }
  }
}

// Create a singleton instance
const websocketService = new WebSocketService(new StorageService());

export { WebSocketService, websocketService, createWebSocketError, generateConversationId };