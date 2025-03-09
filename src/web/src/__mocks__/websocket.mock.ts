import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import {
  WebSocketClientInterface,
  WebSocketConfig,
  WebSocketAuthPayload,
  WebSocketAuthResult,
  WebSocketConnectionStatus,
  WebSocketHandler
} from '../lib/types/websocket.types';
import { AgentMessage } from '../lib/types/agent.types';
import { WEBSOCKET_EVENTS, MESSAGE_TYPES } from '../lib/constants';
import { createHandlerRegistry } from '../lib/websocket/messageHandlers';

// Default mock configuration
export const mockWebSocketConfig: WebSocketConfig = {
  url: 'ws://localhost:3001',
  path: '/socket.io',
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 5000,
  autoConnect: false
};

// Default mock key pair for testing
export const mockKeyPair = {
  publicKey: 'mock-public-key',
  privateKey: 'mock-private-key'
};

/**
 * Mock implementation of WebSocketClientInterface for testing
 */
export class MockWebSocketClient implements WebSocketClientInterface {
  private config: WebSocketConfig;
  private handlerRegistry: ReturnType<typeof createHandlerRegistry>;
  private connectionStatus: WebSocketConnectionStatus = WebSocketConnectionStatus.DISCONNECTED;
  private mockMessages: AgentMessage[] = [];
  private mockConnections: Record<string, any> = {};
  private mockPresence: Record<string, string> = {};
  private mockTypingIndicators: Record<string, boolean> = {};

  /**
   * Creates a new MockWebSocketClient instance
   * @param config The WebSocket configuration
   */
  constructor(config: WebSocketConfig) {
    this.config = config;
    this.handlerRegistry = createHandlerRegistry();
  }

  /**
   * Mock implementation of WebSocket connection with authentication
   * @param authPayload Authentication payload with token, agentId, and publicKey
   * @returns Promise resolving to authentication result
   */
  async connect(authPayload: WebSocketAuthPayload): Promise<WebSocketAuthResult> {
    if (!authPayload || !authPayload.token || !authPayload.agentId) {
      return {
        authenticated: false,
        userId: '',
        agentId: '',
        error: 'Invalid authentication payload'
      };
    }

    this.connectionStatus = WebSocketConnectionStatus.CONNECTING;

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Store connection info
    this.mockConnections[authPayload.agentId] = {
      agentId: authPayload.agentId,
      publicKey: authPayload.publicKey,
      connectedAt: new Date()
    };

    // Update connection status
    this.connectionStatus = WebSocketConnectionStatus.CONNECTED;

    // Trigger handlers for connection event
    const connectHandler = this.handlerRegistry.getHandler(WEBSOCKET_EVENTS.CONNECT);
    if (connectHandler) {
      connectHandler({
        agentId: authPayload.agentId,
        connectionStatus: WebSocketConnectionStatus.CONNECTED
      });
    }

    // Return successful auth result
    return {
      authenticated: true,
      userId: `user-${authPayload.agentId}`, // Mock user ID based on agent ID
      agentId: authPayload.agentId,
      error: ''
    };
  }

  /**
   * Mock implementation of WebSocket disconnection
   */
  disconnect(): void {
    // Update connection status
    this.connectionStatus = WebSocketConnectionStatus.DISCONNECTED;

    // Trigger handlers for disconnect event
    const disconnectHandler = this.handlerRegistry.getHandler(WEBSOCKET_EVENTS.DISCONNECT);
    if (disconnectHandler) {
      disconnectHandler({
        connectionStatus: WebSocketConnectionStatus.DISCONNECTED
      });
    }
  }

  /**
   * Mock implementation of sending messages to other agents
   * @param message The message to send
   * @returns Promise resolving to success indicator
   */
  async sendMessage(message: AgentMessage): Promise<boolean> {
    // Validate connection
    if (this.connectionStatus !== WebSocketConnectionStatus.CONNECTED) {
      throw new Error('Cannot send message: Not connected');
    }

    // Validate message
    if (!message.messageId || !message.senderId || !message.recipientId) {
      throw new Error('Invalid message structure');
    }

    // Ensure timestamp exists
    const messageWithTimestamp = { 
      ...message, 
      timestamp: message.timestamp || Date.now() 
    };

    // Store message for testing verification
    this.mockMessages.push(messageWithTimestamp);

    // Simulate message delivery delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Trigger message handlers
    const messageHandler = this.handlerRegistry.getHandler(WEBSOCKET_EVENTS.MESSAGE);
    if (messageHandler) {
      messageHandler(messageWithTimestamp);
    }

    // Simulate delivery acknowledgment
    setTimeout(() => {
      const ackHandler = this.handlerRegistry.getHandler(WEBSOCKET_EVENTS.ACK);
      if (ackHandler) {
        ackHandler({
          messageId: message.messageId,
          status: 'DELIVERED',
          timestamp: Date.now()
        });
      }
    }, 100);

    return true;
  }

  /**
   * Mock implementation of registering event handlers
   * @param handler The handler to register
   */
  registerHandler(handler: WebSocketHandler): void {
    if (!handler || !handler.eventType || typeof handler.handler !== 'function') {
      throw new Error('Invalid handler registration');
    }
    
    this.handlerRegistry.register(handler.eventType, handler.handler);
  }

  /**
   * Mock implementation of removing event handlers
   * @param eventType The event type to unregister
   */
  unregisterHandler(eventType: string): void {
    this.handlerRegistry.unregister(eventType);
  }

  /**
   * Mock implementation of updating agent presence
   * @param status The presence status to set
   */
  updatePresence(status: string): void {
    // Store presence status for testing verification
    this.mockPresence['self'] = status;

    // Trigger presence handlers
    const presenceHandler = this.handlerRegistry.getHandler(WEBSOCKET_EVENTS.PRESENCE);
    if (presenceHandler) {
      presenceHandler({
        agentId: 'self',
        status,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Mock implementation of sending typing indicators
   * @param conversationId The conversation ID
   * @param isTyping Whether the user is typing
   */
  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    // Store typing indicator for testing verification
    this.mockTypingIndicators[conversationId] = isTyping;

    // Trigger typing handlers
    const typingHandler = this.handlerRegistry.getHandler(WEBSOCKET_EVENTS.TYPING);
    if (typingHandler) {
      typingHandler({
        agentId: 'self',
        conversationId,
        isTyping
      });
    }
  }

  /**
   * Mock implementation of getting connection status
   * @returns Current connection status
   */
  getConnectionStatus(): WebSocketConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Test utility to simulate incoming messages
   * @param message The message to simulate receiving
   */
  triggerMessageEvent(message: AgentMessage): void {
    // Ensure message has required fields
    if (!message.messageId || !message.senderId || !message.recipientId || !message.messageType) {
      throw new Error('Invalid message structure for triggerMessageEvent');
    }
    
    // Ensure timestamp exists
    const messageWithTimestamp = { 
      ...message, 
      timestamp: message.timestamp || Date.now(),
      metadata: message.metadata || { 
        priority: 'normal', 
        expiresAt: Date.now() + 86400000, 
        encrypted: false, 
        requiresResponse: false 
      }
    };
    
    // Find and trigger message handler
    const messageHandler = this.handlerRegistry.getHandler(WEBSOCKET_EVENTS.MESSAGE);
    if (messageHandler) {
      messageHandler(messageWithTimestamp);
    }
    
    // Store message for history
    this.mockMessages.push(messageWithTimestamp);
  }

  /**
   * Test utility to simulate connection events
   * @param eventType The event type to trigger
   * @param data The event data
   */
  triggerConnectionEvent(eventType: string, data: any): void {
    const handler = this.handlerRegistry.getHandler(eventType);
    if (handler) {
      handler(data);
    }
    
    // Update connection status for certain events
    if (eventType === WEBSOCKET_EVENTS.CONNECT) {
      this.connectionStatus = WebSocketConnectionStatus.CONNECTED;
    } else if (eventType === WEBSOCKET_EVENTS.DISCONNECT) {
      this.connectionStatus = WebSocketConnectionStatus.DISCONNECTED;
    }
  }

  /**
   * Test utility to retrieve mock message history
   * @returns Array of stored messages
   */
  getMessageHistory(): AgentMessage[] {
    return [...this.mockMessages];
  }

  /**
   * Test utility to clear mock message history
   */
  clearMessageHistory(): void {
    this.mockMessages = [];
  }

  /**
   * Test utility to simulate connection errors
   * @param errorMessage The error message
   */
  simulateConnectionError(errorMessage: string): void {
    this.connectionStatus = WebSocketConnectionStatus.ERROR;
    
    // Store error information for testing verification
    this.mockConnections.error = {
      message: errorMessage,
      timestamp: Date.now()
    };
    
    // Trigger error event
    this.triggerConnectionEvent('error', {
      message: errorMessage,
      timestamp: Date.now()
    });
  }
}

/**
 * Factory function to create a mock WebSocket client
 * @param config Optional configuration (defaults to mockWebSocketConfig)
 * @returns Mock WebSocket client implementation
 */
export function createMockWebSocketClient(config: WebSocketConfig = mockWebSocketConfig): WebSocketClientInterface {
  return new MockWebSocketClient(config);
}

/**
 * Mock implementation of message encryption for testing
 * @param message The agent message to encrypt
 * @param sharedSecret Shared secret for encryption
 * @param signingPrivateKey Private key for signing
 * @returns Promise resolving to mock encrypted message
 */
export async function mockEncryptAgentToAgentMessage(
  message: AgentMessage,
  sharedSecret: string,
  signingPrivateKey: string
): Promise<object> {
  // Return a mock encrypted message
  return {
    message,
    encrypted: true,
    signature: `mock-signature-${message.messageId}`,
    // Additional metadata for testing
    _mockEncryption: {
      sharedSecret,
      signingPrivateKey
    }
  };
}

/**
 * Mock implementation of message decryption for testing
 * @param encryptedMessage The encrypted message to decrypt
 * @param sharedSecret Shared secret for decryption
 * @param signingPublicKey Public key for signature verification
 * @returns Promise resolving to original message
 */
export async function mockDecryptAgentToAgentMessage(
  encryptedMessage: object,
  sharedSecret: string,
  signingPublicKey: string
): Promise<AgentMessage> {
  // Verify the encrypted message has the expected structure
  if (!encryptedMessage || !(encryptedMessage as any).message) {
    throw new Error('Invalid encrypted message structure');
  }
  
  // Mock implementation just returns the original message
  return (encryptedMessage as any).message;
}

/**
 * Mock implementation of shared secret derivation for testing
 * @param privateKey Private key
 * @param publicKey Public key
 * @returns Promise resolving to mock shared secret
 */
export async function mockDeriveAgentSharedSecret(
  privateKey: string,
  publicKey: string
): Promise<string> {
  // Generate a deterministic shared secret for testing
  return `mock-shared-secret-${privateKey.substring(0, 8)}-${publicKey.substring(0, 8)}`;
}

/**
 * Mock implementation of key pair generation for testing
 * @returns Promise resolving to mock key pair
 */
export async function mockGenerateAgentKeyPair(): Promise<object> {
  // Return consistent key pair for tests
  return { ...mockKeyPair };
}