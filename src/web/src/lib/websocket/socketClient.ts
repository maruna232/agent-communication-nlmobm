/**
 * WebSocket Client Implementation
 * 
 * Implements a WebSocket client for secure agent-to-agent communication in the AI Agent Network.
 * This module provides a robust implementation of the WebSocketClientInterface with connection
 * management, end-to-end encryption, message delivery guarantees, and event handling while
 * maintaining the privacy-first approach of the application.
 */

import { io, Socket } from 'socket.io-client'; // ^4.7.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import {
  WebSocketClientInterface,
  WebSocketConfig,
  WebSocketConnectionStatus,
  WebSocketAuthPayload,
  WebSocketAuthResult,
  WebSocketHandler,
  WebSocketErrorType,
  MessageAcknowledgement,
  PresenceUpdate,
  TypingIndicator,
  KeyPair
} from '../types/websocket.types';
import { AgentMessage } from '../types/agent.types';
import {
  WEBSOCKET_EVENTS,
  MESSAGE_TYPES,
  DEFAULT_CONFIG,
  API_ENDPOINTS
} from '../constants';
import { createWebSocketError } from '../utils/errorHandling';
import {
  encryptAgentToAgentMessage,
  decryptAgentToAgentMessage,
  deriveAgentSharedSecret
} from './encryption';
import {
  createHandlerRegistry,
  createGenericMessageHandler,
  createMessageHandler,
  createAcknowledgementHandler,
  createPresenceHandler,
  createTypingIndicatorHandler
} from './messageHandlers';

/**
 * Default WebSocket configuration
 */
export const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  url: API_ENDPOINTS.WEBSOCKET,
  path: '/socket.io',
  reconnectionAttempts: DEFAULT_CONFIG.WEBSOCKET_RECONNECT_ATTEMPTS,
  reconnectionDelay: DEFAULT_CONFIG.WEBSOCKET_RECONNECT_DELAY,
  timeout: DEFAULT_CONFIG.WEBSOCKET_TIMEOUT,
  autoConnect: false
};

/**
 * Implementation of the WebSocketClientInterface for agent-to-agent communication
 */
class WebSocketClientImpl implements WebSocketClientInterface {
  private socket: Socket;
  private handlerRegistry: ReturnType<typeof createHandlerRegistry>;
  private state: {
    status: WebSocketConnectionStatus;
    agentId: string | null;
    userId: string | null;
    publicKey: string | null;
    connectedAt: Date | null;
    lastActivity: Date | null;
    error: string | null;
    messageQueue: Map<string, { message: AgentMessage; attempts: number; timeout: NodeJS.Timeout | null }>;
  };
  private sharedSecrets: ReturnType<typeof createSharedSecretStore>;
  private heartbeat: ReturnType<typeof createHeartbeatMechanism>;
  private encryptionKeys: KeyPair | null = null;

  /**
   * Constructor for WebSocketClientImpl
   * @param config WebSocket configuration options
   */
  constructor(config: WebSocketConfig) {
    // Initialize Socket.io client with configuration
    this.socket = io(config.url, {
      path: config.path,
      reconnectionAttempts: config.reconnectionAttempts,
      reconnectionDelay: config.reconnectionDelay,
      timeout: config.timeout,
      autoConnect: config.autoConnect,
      transports: ['websocket']
    });

    // Create handler registry for event handling
    this.handlerRegistry = createHandlerRegistry();

    // Initialize state
    this.state = {
      status: WebSocketConnectionStatus.DISCONNECTED,
      agentId: null,
      userId: null,
      publicKey: null,
      connectedAt: null,
      lastActivity: null,
      error: null,
      messageQueue: new Map()
    };

    // Create shared secret store
    this.sharedSecrets = createSharedSecretStore();

    // Create heartbeat mechanism
    this.heartbeat = createHeartbeatMechanism(this.socket, DEFAULT_CONFIG.HEARTBEAT_INTERVAL);

    // Set up socket event listeners
    setupSocketEventListeners(this.socket, this.state, this.handlerRegistry, this.sharedSecrets);
  }

  /**
   * Establishes a WebSocket connection with authentication
   * @param authPayload Authentication payload with token, agentId, and publicKey
   * @returns Promise that resolves with authentication result
   */
  public async connect(authPayload: WebSocketAuthPayload): Promise<WebSocketAuthResult> {
    return new Promise((resolve, reject) => {
      const errorHandler = createErrorHandler(this.state);

      // Validate authentication payload
      if (!authPayload || !authPayload.token || !authPayload.agentId || !authPayload.publicKey) {
        const error = errorHandler(
          new Error('Invalid authentication payload'),
          'authentication'
        );
        reject(error);
        return;
      }

      // Update state with agent information
      this.state.agentId = authPayload.agentId;
      this.state.publicKey = authPayload.publicKey;
      this.state.status = WebSocketConnectionStatus.CONNECTING;

      // Connect socket if not already connected
      if (!this.socket.connected) {
        this.socket.connect();
      }

      // Set authentication timeout
      const timeoutId = setTimeout(() => {
        const error = errorHandler(
          new Error('Authentication timeout'),
          'authentication'
        );
        reject(error);
      }, DEFAULT_CONFIG.WEBSOCKET_TIMEOUT);

      // Handle authentication response
      this.socket.once('authenticated', (result: WebSocketAuthResult) => {
        clearTimeout(timeoutId);

        if (result.authenticated) {
          // Update state with authenticated user information
          this.state.userId = result.userId;
          this.state.status = WebSocketConnectionStatus.CONNECTED;
          this.state.connectedAt = new Date();
          this.state.lastActivity = new Date();
          this.state.error = null;

          // Start heartbeat mechanism
          this.heartbeat.start();

          resolve(result);
        } else {
          // Handle authentication failure
          this.state.status = WebSocketConnectionStatus.ERROR;
          this.state.error = result.error || 'Authentication failed';
          
          const error = errorHandler(
            new Error(this.state.error),
            'authentication'
          );
          reject(error);
        }
      });

      // Send authentication payload
      this.socket.emit('authenticate', authPayload);
    });
  }

  /**
   * Closes the WebSocket connection gracefully
   */
  public disconnect(): void {
    // Stop heartbeat mechanism
    this.heartbeat.stop();

    // Disconnect socket if connected
    if (this.socket.connected) {
      this.socket.disconnect();
    }

    // Clear shared secrets
    this.sharedSecrets.clear();

    // Update state
    this.state.status = WebSocketConnectionStatus.DISCONNECTED;
    this.state.connectedAt = null;
    this.state.lastActivity = null;
  }

  /**
   * Sends an encrypted message to another agent
   * @param message Message to send
   * @returns Promise that resolves when message is delivered or rejects on failure
   */
  public async sendMessage(message: AgentMessage): Promise<boolean> {
    const errorHandler = createErrorHandler(this.state);

    try {
      // Ensure message has required fields
      if (!message.messageId) {
        message.messageId = uuidv4();
      }

      if (!message.timestamp) {
        message.timestamp = Date.now();
      }

      if (!message.senderId && this.state.agentId) {
        message.senderId = this.state.agentId;
      }

      // Validate required fields
      if (!message.senderId || !message.recipientId || !message.messageType) {
        throw new Error('Message missing required fields: senderId, recipientId, or messageType');
      }

      // Check if connection is established
      if (this.state.status !== WebSocketConnectionStatus.CONNECTED) {
        throw new Error('WebSocket not connected');
      }

      // Get or derive shared secret for recipient
      const recipientPublicKey = await this.getRecipientPublicKey(message.recipientId);
      if (!recipientPublicKey) {
        throw new Error(`Unable to find public key for recipient: ${message.recipientId}`);
      }

      const sharedSecret = await this.getOrDeriveSharedSecret(message.recipientId, recipientPublicKey);
      if (!sharedSecret) {
        throw new Error(`Failed to establish secure channel with recipient: ${message.recipientId}`);
      }

      // Get signing private key
      if (!this.encryptionKeys || !this.encryptionKeys.privateKey) {
        throw new Error('No signing key available');
      }

      // Encrypt message
      const encryptedMessage = await encryptAgentToAgentMessage(
        message,
        sharedSecret,
        this.encryptionKeys.privateKey
      );

      // Add message to queue for delivery tracking
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          // Remove from queue on timeout
          if (this.state.messageQueue.has(message.messageId)) {
            this.state.messageQueue.delete(message.messageId);
          }
          
          reject(new Error(`Message delivery timeout: ${message.messageId}`));
        }, DEFAULT_CONFIG.WEBSOCKET_TIMEOUT);

        // Store in message queue
        this.state.messageQueue.set(message.messageId, {
          message,
          attempts: 1,
          timeout: timeoutId
        });

        // Set up acknowledgement handler
        const ackHandler = (ack: MessageAcknowledgement) => {
          if (ack.messageId === message.messageId) {
            // Message acknowledged, clean up
            clearTimeout(timeoutId);
            this.state.messageQueue.delete(message.messageId);
            this.socket.off(WEBSOCKET_EVENTS.ACK, ackHandler);
            resolve(true);
          }
        };

        // Listen for acknowledgement
        this.socket.on(WEBSOCKET_EVENTS.ACK, ackHandler);

        // Send encrypted message
        this.socket.emit(WEBSOCKET_EVENTS.MESSAGE, encryptedMessage);
      });
    } catch (error) {
      return Promise.reject(errorHandler(error as Error, 'message sending'));
    }
  }

  /**
   * Registers a handler for WebSocket events
   * @param handler Handler to register
   */
  public registerHandler(handler: WebSocketHandler): void {
    if (!handler || !handler.eventType || typeof handler.handler !== 'function') {
      throw new Error('Invalid handler');
    }

    this.handlerRegistry.register(handler.eventType, handler.handler);
  }

  /**
   * Unregisters a previously registered handler
   * @param eventType Event type to unregister handler for
   */
  public unregisterHandler(eventType: string): void {
    this.handlerRegistry.unregister(eventType);
  }

  /**
   * Updates the agent's presence status
   * @param status New presence status
   */
  public updatePresence(status: string): void {
    const errorHandler = createErrorHandler(this.state);

    try {
      // Check if connection is established
      if (this.state.status !== WebSocketConnectionStatus.CONNECTED) {
        throw new Error('WebSocket not connected');
      }

      if (!this.state.agentId) {
        throw new Error('Agent ID not available');
      }

      // Create presence update
      const presenceUpdate: PresenceUpdate = {
        agentId: this.state.agentId,
        status,
        timestamp: Date.now()
      };

      // Send presence update
      this.socket.emit(WEBSOCKET_EVENTS.PRESENCE, presenceUpdate);
    } catch (error) {
      errorHandler(error as Error, 'presence update');
    }
  }

  /**
   * Sends a typing indicator for a conversation
   * @param conversationId ID of the conversation
   * @param isTyping Whether the user is typing
   */
  public sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    const errorHandler = createErrorHandler(this.state);

    try {
      // Check if connection is established
      if (this.state.status !== WebSocketConnectionStatus.CONNECTED) {
        throw new Error('WebSocket not connected');
      }

      if (!this.state.agentId) {
        throw new Error('Agent ID not available');
      }

      // Create typing indicator
      const typingIndicator: TypingIndicator = {
        agentId: this.state.agentId,
        conversationId,
        isTyping
      };

      // Send typing indicator
      this.socket.emit(WEBSOCKET_EVENTS.TYPING, typingIndicator);
    } catch (error) {
      errorHandler(error as Error, 'typing indicator');
    }
  }

  /**
   * Gets the current WebSocket connection status
   * @returns Current connection status
   */
  public getConnectionStatus(): WebSocketConnectionStatus {
    return this.state.status;
  }

  /**
   * Gets the public key for a recipient agent
   * In a real implementation, this would query a directory or service
   * @param recipientId Recipient agent ID
   * @returns Promise resolving to public key or null
   */
  private async getRecipientPublicKey(recipientId: string): Promise<string | null> {
    // This is a simplified implementation
    // In a production environment, you would implement a service to look up
    // or request public keys from other agents
    
    // For now, we'll simulate a successful key lookup
    return Promise.resolve(`SIMULATED_PUBLIC_KEY_FOR_${recipientId}`);
  }

  /**
   * Gets an existing shared secret or derives a new one for a recipient
   * @param recipientId ID of the recipient agent
   * @param recipientPublicKey Public key of the recipient agent
   * @returns Promise resolving to shared secret or null
   */
  private async getOrDeriveSharedSecret(
    recipientId: string,
    recipientPublicKey?: string
  ): Promise<string | null> {
    // Check if we already have a shared secret for this recipient
    if (this.sharedSecrets.has(recipientId)) {
      return this.sharedSecrets.get(recipientId);
    }

    // If we don't have a shared secret, but we have the public key, derive one
    if (recipientPublicKey && this.encryptionKeys && this.encryptionKeys.privateKey) {
      try {
        const sharedSecret = await deriveAgentSharedSecret(
          this.encryptionKeys.privateKey,
          recipientPublicKey
        );

        // Store the shared secret for future use
        this.sharedSecrets.set(recipientId, sharedSecret);
        
        return sharedSecret;
      } catch (error) {
        console.error('Failed to derive shared secret:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Sends a message acknowledgement
   * @param messageId ID of the message being acknowledged
   * @param status Delivery status
   */
  private sendAcknowledgement(messageId: string, status: string): void {
    const errorHandler = createErrorHandler(this.state);

    try {
      // Check if connection is established
      if (this.state.status !== WebSocketConnectionStatus.CONNECTED) {
        throw new Error('WebSocket not connected');
      }

      // Create acknowledgement
      const ack: MessageAcknowledgement = {
        messageId,
        status: status as any,
        timestamp: Date.now()
      };

      // Send acknowledgement
      this.socket.emit(WEBSOCKET_EVENTS.ACK, ack);
    } catch (error) {
      errorHandler(error as Error, 'acknowledgement sending');
    }
  }

  /**
   * Handle incoming messages and route to appropriate handlers
   * @param data Message data
   */
  private handleIncomingMessage(data: any): void {
    const errorHandler = createErrorHandler(this.state);

    try {
      // Update last activity timestamp
      this.state.lastActivity = new Date();

      // Process based on message type
      if (data && typeof data === 'object') {
        if ('message' in data && 'encrypted' in data && 'signature' in data) {
          // Handle encrypted agent message
          this.handleEncryptedMessage(data);
        } else if ('messageId' in data && 'status' in data) {
          // Handle message acknowledgement
          const handler = this.handlerRegistry.getHandler(WEBSOCKET_EVENTS.ACK);
          if (handler) {
            handler(data);
          }
        } else if ('agentId' in data && 'status' in data && !('conversationId' in data)) {
          // Handle presence update
          const handler = this.handlerRegistry.getHandler(WEBSOCKET_EVENTS.PRESENCE);
          if (handler) {
            handler(data);
          }
        } else if ('agentId' in data && 'conversationId' in data && 'isTyping' in data) {
          // Handle typing indicator
          const handler = this.handlerRegistry.getHandler(WEBSOCKET_EVENTS.TYPING);
          if (handler) {
            handler(data);
          }
        }
      }
    } catch (error) {
      errorHandler(error as Error, 'message processing');
    }
  }

  /**
   * Handle encrypted messages with decryption and processing
   * @param encryptedMessage Encrypted message data
   */
  private handleEncryptedMessage(encryptedMessage: any): void {
    const senderId = encryptedMessage.message?.senderId;
    
    if (!senderId) {
      console.warn('[WebSocket] Missing sender ID in encrypted message');
      return;
    }
    
    const sharedSecret = this.sharedSecrets.get(senderId);
    if (!sharedSecret) {
      console.warn(`[WebSocket] No shared secret for sender: ${senderId}`);
      return;
    }
    
    // For a real implementation, we would retrieve the sender's 
    // verified public key from a secure source
    const senderPublicKey = `SIMULATED_PUBLIC_KEY_FOR_${senderId}`;
    
    decryptAgentToAgentMessage(encryptedMessage, sharedSecret, senderPublicKey)
      .then(decryptedMessage => {
        // Process the decrypted message
        const handler = this.handlerRegistry.getHandler(decryptedMessage.messageType);
        if (handler) {
          handler(decryptedMessage);
        } else {
          console.warn(`[WebSocket] No handler for message type: ${decryptedMessage.messageType}`);
        }
        
        // Send acknowledgement
        this.sendAcknowledgement(decryptedMessage.messageId, 'DELIVERED');
      })
      .catch(error => {
        console.error('[WebSocket] Message decryption failed:', error);
      });
  }
}

/**
 * Sets up event listeners for Socket.io events
 * @param socket Socket.io socket instance
 * @param state State object for tracking connection status
 * @param handlerRegistry Registry for message handlers
 * @param sharedSecrets Store for shared encryption secrets
 */
function setupSocketEventListeners(
  socket: Socket,
  state: any,
  handlerRegistry: ReturnType<typeof createHandlerRegistry>,
  sharedSecrets: ReturnType<typeof createSharedSecretStore>
): void {
  // Connection event
  socket.on('connect', () => {
    state.status = WebSocketConnectionStatus.CONNECTING;
    console.log('[WebSocket] Connected to server, authenticating...');
  });

  // Disconnection event
  socket.on('disconnect', (reason: string) => {
    state.status = WebSocketConnectionStatus.DISCONNECTED;
    console.log(`[WebSocket] Disconnected: ${reason}`);
  });

  // Reconnection attempt event
  socket.on('reconnect_attempt', (attemptNumber: number) => {
    state.status = WebSocketConnectionStatus.RECONNECTING;
    console.log(`[WebSocket] Reconnection attempt #${attemptNumber}`);
  });

  // Reconnection error event
  socket.on('reconnect_error', (error: Error) => {
    state.status = WebSocketConnectionStatus.ERROR;
    state.error = error.message;
    console.error('[WebSocket] Reconnection error:', error);
  });

  // General error event
  socket.on('error', (error: Error) => {
    state.status = WebSocketConnectionStatus.ERROR;
    state.error = error.message;
    console.error('[WebSocket] Error:', error);
  });

  // Message event
  socket.on(WEBSOCKET_EVENTS.MESSAGE, (message: any) => {
    const messageProcessor = createMessageProcessor(handlerRegistry, sharedSecrets, state);
    messageProcessor(message);
  });

  // Presence event
  socket.on(WEBSOCKET_EVENTS.PRESENCE, (presence: PresenceUpdate) => {
    const handler = handlerRegistry.getHandler(WEBSOCKET_EVENTS.PRESENCE);
    if (handler) {
      handler(presence);
    }
  });

  // Typing event
  socket.on(WEBSOCKET_EVENTS.TYPING, (typing: TypingIndicator) => {
    const handler = handlerRegistry.getHandler(WEBSOCKET_EVENTS.TYPING);
    if (handler) {
      handler(typing);
    }
  });

  // Acknowledgement event
  socket.on(WEBSOCKET_EVENTS.ACK, (ack: MessageAcknowledgement) => {
    const handler = handlerRegistry.getHandler(WEBSOCKET_EVENTS.ACK);
    if (handler) {
      handler(ack);
    }
  });
}

/**
 * Creates a message processor function for handling incoming messages
 * @param handlerRegistry Registry of message handlers
 * @param sharedSecrets Store of shared encryption secrets
 * @param state Client state object
 * @returns Message processor function
 */
function createMessageProcessor(
  handlerRegistry: ReturnType<typeof createHandlerRegistry>,
  sharedSecrets: ReturnType<typeof createSharedSecretStore>,
  state: any
): (message: any) => void {
  return (message: any) => {
    try {
      // Check if this is an encrypted message
      if (message && message.encrypted && message.message && message.message.senderId) {
        const senderId = message.message.senderId;
        const sharedSecret = sharedSecrets.get(senderId);

        // If we have a shared secret for this sender, decrypt the message
        if (sharedSecret) {
          // In a real implementation, we would get the sender's public key
          // from a secure source. For this implementation, we'll use a simulated key.
          const senderPublicKey = `SIMULATED_PUBLIC_KEY_FOR_${senderId}`;

          decryptAgentToAgentMessage(message, sharedSecret, senderPublicKey)
            .then(decryptedMessage => {
              // Process the decrypted message
              const handler = handlerRegistry.getHandler(decryptedMessage.messageType);
              if (handler) {
                handler(decryptedMessage);
              } else {
                console.warn(`[WebSocket] No handler for message type: ${decryptedMessage.messageType}`);
              }

              // Send acknowledgement if required
              if (state.socket && state.socket.connected) {
                state.socket.emit(WEBSOCKET_EVENTS.ACK, {
                  messageId: decryptedMessage.messageId,
                  status: 'DELIVERED',
                  timestamp: Date.now()
                });
              }
            })
            .catch(error => {
              console.error('[WebSocket] Message decryption failed:', error);
            });
        } else {
          console.warn(`[WebSocket] No shared secret for sender: ${senderId}`);
        }
      } else {
        // This is not an encrypted message, process directly
        if (message.messageType) {
          const handler = handlerRegistry.getHandler(message.messageType);
          if (handler) {
            handler(message);
          } else {
            console.warn(`[WebSocket] No handler for message type: ${message.messageType}`);
          }
        }
      }
    } catch (error) {
      console.error('[WebSocket] Message processing error:', error);
    }
  };
}

/**
 * Creates an error handler for WebSocket operations
 * @param state Client state object
 * @returns Error handler function
 */
function createErrorHandler(state: any): (error: Error, operation: string) => Error {
  return (error: Error, operation: string) => {
    // Determine error type based on operation
    let errorType = WebSocketErrorType.MESSAGE_ERROR;
    
    if (operation.includes('connect') || operation.includes('authentication')) {
      errorType = WebSocketErrorType.CONNECTION_ERROR;
    } else if (operation.includes('authentication')) {
      errorType = WebSocketErrorType.AUTHENTICATION_ERROR;
    } else if (operation.includes('timeout')) {
      errorType = WebSocketErrorType.TIMEOUT_ERROR;
    }

    // Update state if it's a connection-related error
    if (errorType === WebSocketErrorType.CONNECTION_ERROR || 
        errorType === WebSocketErrorType.AUTHENTICATION_ERROR) {
      state.status = WebSocketConnectionStatus.ERROR;
      state.error = error.message;
    }

    // Create and return formatted error
    const wsError = createWebSocketError(
      `WebSocket error during ${operation}: ${error.message}`,
      { 
        originalError: error,
        operation
      }
    );

    console.error(`[WebSocket] ${operation} error:`, wsError);
    return wsError;
  };
}

/**
 * Creates a heartbeat mechanism to maintain WebSocket connections
 * @param socket Socket.io socket instance
 * @param interval Heartbeat interval in milliseconds
 * @returns Heartbeat controller object
 */
function createHeartbeatMechanism(socket: Socket, interval: number): { start: () => void; stop: () => void } {
  let heartbeatIntervalId: NodeJS.Timeout | null = null;

  return {
    start: () => {
      // Clear any existing interval
      if (heartbeatIntervalId !== null) {
        clearInterval(heartbeatIntervalId);
      }

      // Start new heartbeat interval
      heartbeatIntervalId = setInterval(() => {
        if (socket && socket.connected) {
          socket.emit(MESSAGE_TYPES.HEARTBEAT, { timestamp: Date.now() });
        }
      }, interval);
    },
    stop: () => {
      // Clear interval if it exists
      if (heartbeatIntervalId !== null) {
        clearInterval(heartbeatIntervalId);
        heartbeatIntervalId = null;
      }
    }
  };
}

/**
 * Creates a store for shared encryption secrets
 * @returns Shared secret store object
 */
function createSharedSecretStore() {
  const secrets = new Map<string, string>();

  return {
    get: (recipientId: string): string | null => {
      return secrets.get(recipientId) || null;
    },
    set: (recipientId: string, secret: string): void => {
      secrets.set(recipientId, secret);
    },
    has: (recipientId: string): boolean => {
      return secrets.has(recipientId);
    },
    delete: (recipientId: string): void => {
      secrets.delete(recipientId);
    },
    clear: (): void => {
      secrets.clear();
    }
  };
}

/**
 * Creates a WebSocket client instance with the provided configuration
 * @param config WebSocket configuration options
 * @returns WebSocket client implementation
 */
export function createWebSocketClient(config: Partial<WebSocketConfig> = {}): WebSocketClientInterface {
  // Merge provided config with defaults
  const mergedConfig: WebSocketConfig = {
    ...DEFAULT_WEBSOCKET_CONFIG,
    ...config
  };

  return new WebSocketClientImpl(mergedConfig);
}