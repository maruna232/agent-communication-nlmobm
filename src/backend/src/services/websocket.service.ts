import { Server, Socket, ServerOptions } from 'socket.io'; // v4.7.2
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import http from 'http'; // Node.js built-in

import { config } from '../config/config';
import {
  WEBSOCKET_EVENTS,
  TIMEOUT_VALUES,
  RATE_LIMITS
} from '../config/constants';

import {
  IWebSocketServer,
  IWebSocketConnection,
  IWebSocketMessage,
  IWebSocketConfig,
  IWebSocketStats,
  IWebSocketError,
  ConnectionStatus,
  WebSocketErrorType
} from '../interfaces/websocket.interface';

import {
  IMessage,
  IMessageAcknowledgement,
  MessageDeliveryStatus
} from '../interfaces/message.interface';

import {
  handleSocketConnection,
  handleSocketAuthentication,
  handleSocketMessage,
  handleSocketDisconnect,
  routeMessageToRecipient,
  getConnectionByAgentId,
  getConnectionStats
} from '../utils/socket.utils';

import {
  encryptMessage,
  decryptMessage
} from '../utils/encryption.utils';

import { verifyToken } from '../utils/jwt.utils';
import { createWebSocketError } from '../utils/error.utils';
import { logger } from '../utils/logging.utils';
import { redisService } from '../services/redis.service';
import { authService } from '../services/auth.service';

/**
 * Service class that implements the WebSocket server for agent-to-agent communication
 */
class WebSocketService {
  private io: Server;
  private server: http.Server;
  private connections: Map<string, IWebSocketConnection>;
  private stats: IWebSocketStats;
  private isInitialized: boolean;
  private startTime: Date;

  /**
   * Initializes the WebSocket service with default values
   */
  constructor() {
    // Initialize connections map for tracking WebSocket connections
    this.connections = new Map<string, IWebSocketConnection>();
    
    // Initialize statistics object for monitoring
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      uptime: 0,
      startTime: new Date()
    };
    
    this.isInitialized = false;
    this.startTime = new Date();
  }

  /**
   * Initializes the WebSocket server with configuration
   * @param httpServer HTTP server to attach Socket.IO to
   * @param customConfig Optional custom WebSocket configuration
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(httpServer: http.Server, customConfig?: IWebSocketConfig): Promise<boolean> {
    // If already initialized, return early
    if (this.isInitialized) {
      logger.warn('WebSocket server already initialized');
      return true;
    }

    try {
      // Store the HTTP server reference
      this.server = httpServer;

      // Merge default config with custom config
      const wsConfig = {
        path: config.websocket.path,
        maxConnections: config.websocket.maxConnections,
        pingInterval: config.websocket.pingInterval,
        pingTimeout: config.websocket.pingTimeout,
        ...customConfig
      };

      // Create Socket.IO server with configuration
      const socketOptions: Partial<ServerOptions> = {
        path: wsConfig.path,
        pingInterval: wsConfig.pingInterval,
        pingTimeout: wsConfig.pingTimeout,
        upgradeTimeout: config.websocket.upgradeTimeout,
        cors: {
          origin: config.server.corsOrigin,
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling']
      };

      this.io = new Server(this.server, socketOptions);

      // Set up Redis adapter if Redis is enabled
      if (config.redis.enabled && redisService.isRedisConnected()) {
        try {
          const adapter = redisService.createSocketIOAdapter(this.io);
          this.io.adapter(adapter);
          logger.info('Redis adapter set up for WebSocket server');

          // Set up Redis subscriptions for cross-server communication
          await this.setupRedisSubscriptions();
        } catch (error) {
          logger.error(`Failed to set up Redis adapter: ${error.message}`, { error });
          // Continue without Redis adapter, will work as standalone instance
        }
      }

      // Register event handlers
      this.registerHandlers();

      this.isInitialized = true;
      this.startTime = new Date();
      
      logger.info('WebSocket server initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Failed to initialize WebSocket server: ${error.message}`, { error });
      return false;
    }
  }

  /**
   * Gracefully shuts down the WebSocket server
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('WebSocket server not initialized, nothing to shut down');
      return;
    }

    logger.info('Shutting down WebSocket server');

    try {
      // Disconnect all active connections with a reason
      for (const connection of this.connections.values()) {
        if (connection.status !== ConnectionStatus.DISCONNECTED) {
          connection.socket.disconnect(true);
        }
      }

      // Clear connections map
      this.connections.clear();

      // Close the Socket.IO server
      await new Promise<void>((resolve) => {
        this.io.close(() => {
          logger.info('Socket.IO server closed');
          resolve();
        });
      });

      this.isInitialized = false;
      logger.info('WebSocket server shutdown complete');
    } catch (error) {
      logger.error(`Error during WebSocket server shutdown: ${error.message}`, { error });
      // Force shutdown in case of error
      this.isInitialized = false;
    }
  }

  /**
   * Registers event handlers for the WebSocket server
   */
  registerHandlers(): void {
    // Register connection handler
    this.io.on(WEBSOCKET_EVENTS.CONNECT, async (socket: Socket) => {
      try {
        await this.handleConnection(socket);
      } catch (error) {
        logger.error(`Error handling connection: ${error.message}`, { 
          socketId: socket.id,
          error 
        });
        socket.disconnect(true);
      }
    });

    // Set up error handler for the server
    this.io.engine.on('error', (error: Error) => {
      logger.error(`Socket.IO engine error: ${error.message}`, { error });
    });

    logger.info('WebSocket event handlers registered');
  }

  /**
   * Handles new WebSocket connections
   * @param socket Socket.io socket instance
   */
  async handleConnection(socket: Socket): Promise<void> {
    // Check if maximum connections limit has been reached
    if (this.connections.size >= config.websocket.maxConnections) {
      logger.warn(`Connection limit exceeded, current count: ${this.connections.size}`);
      
      const error = createWebSocketError(WebSocketErrorType.CONNECTION_LIMIT_EXCEEDED, {
        message: 'Maximum connection limit reached. Please try again later.',
        connectionId: socket.id
      });
      
      socket.emit('error', { 
        errorType: error.errorCode, 
        message: error.message 
      });
      
      socket.disconnect(true);
      return;
    }

    // Apply rate limiting for connections
    if (!this.applyRateLimiting(socket, 'connection')) {
      return;
    }

    // Create a new connection entry
    const connection = await handleSocketConnection(socket, this.connections);
    
    // Set up authentication timeout
    const authTimeout = setTimeout(() => {
      if (connection.status !== ConnectionStatus.AUTHENTICATED) {
        logger.warn(`Authentication timeout for connection ${connection.connectionId}`);
        
        const error = createWebSocketError(WebSocketErrorType.AUTHENTICATION_FAILED, {
          message: 'Authentication timeout',
          connectionId: connection.connectionId
        });
        
        socket.emit('error', { 
          errorType: error.errorCode, 
          message: error.message 
        });
        
        socket.disconnect(true);
      }
    }, TIMEOUT_VALUES.SOCKET_CONNECTION);

    // Handle authentication
    socket.on('authenticate', async (authData: any) => {
      try {
        clearTimeout(authTimeout);
        const isAuthenticated = await this.handleAuthentication(socket, connection, authData);
        
        if (!isAuthenticated) {
          socket.disconnect(true);
        }
      } catch (error) {
        logger.error(`Authentication error: ${error.message}`, {
          connectionId: connection.connectionId,
          error
        });
        
        socket.emit('error', {
          errorType: WebSocketErrorType.AUTHENTICATION_FAILED,
          message: 'Authentication failed: ' + error.message
        });
        
        socket.disconnect(true);
      }
    });

    // Handle message events
    socket.on(WEBSOCKET_EVENTS.MESSAGE, async (message: IWebSocketMessage) => {
      try {
        await this.handleMessage(socket, connection, message);
      } catch (error) {
        logger.error(`Error handling message: ${error.message}`, {
          connectionId: connection.connectionId,
          error
        });
        
        socket.emit('error', {
          errorType: WebSocketErrorType.SERVER_ERROR,
          message: 'Error processing message'
        });
      }
    });

    // Handle disconnection
    socket.on(WEBSOCKET_EVENTS.DISCONNECT, async (reason: string) => {
      clearTimeout(authTimeout);
      await this.handleDisconnect(socket, connection, reason);
    });

    // Update stats
    this.stats.totalConnections++;
    this.stats.activeConnections = this.connections.size;
    
    logger.info(`New connection handled: ${connection.connectionId}`);
  }

  /**
   * Handles WebSocket authentication
   * @param socket Socket.io socket instance
   * @param connection WebSocket connection object
   * @param authData Authentication data from client
   * @returns Promise resolving to true if authentication was successful
   */
  async handleAuthentication(
    socket: Socket,
    connection: IWebSocketConnection,
    authData: any
  ): Promise<boolean> {
    try {
      // Call the utility function to handle authentication
      const isAuthenticated = await handleSocketAuthentication(socket, connection, authData);
      
      // If authentication failed, return false
      if (!isAuthenticated) {
        return false;
      }
      
      // Update connection status
      connection.status = ConnectionStatus.AUTHENTICATED;
      
      // Join socket to a room based on agent ID for targeted messages
      socket.join(`agent:${connection.agentId}`);
      
      // Emit presence update to other agents
      socket.broadcast.emit(WEBSOCKET_EVENTS.PRESENCE, {
        agentId: connection.agentId,
        status: 'online',
        timestamp: Date.now()
      });
      
      logger.info(`Agent authenticated: ${connection.agentId}`, {
        connectionId: connection.connectionId,
        userId: connection.userId
      });
      
      return true;
    } catch (error) {
      logger.error(`Authentication error: ${error.message}`, {
        connectionId: connection.connectionId,
        error
      });
      
      const wsError = createWebSocketError(WebSocketErrorType.AUTHENTICATION_FAILED, {
        message: 'Authentication failed: ' + error.message,
        connectionId: connection.connectionId
      });
      
      socket.emit('error', { 
        errorType: wsError.errorCode, 
        message: wsError.message 
      });
      
      return false;
    }
  }

  /**
   * Handles incoming WebSocket messages
   * @param socket Socket.io socket instance
   * @param connection WebSocket connection object
   * @param message WebSocket message
   */
  async handleMessage(
    socket: Socket,
    connection: IWebSocketConnection,
    message: IWebSocketMessage
  ): Promise<void> {
    // Ensure connection is authenticated
    if (connection.status !== ConnectionStatus.AUTHENTICATED) {
      logger.warn(`Received message from unauthenticated connection: ${connection.connectionId}`);
      
      socket.emit('error', {
        errorType: WebSocketErrorType.AUTHENTICATION_FAILED,
        message: 'You must be authenticated to send messages'
      });
      
      return;
    }

    // Apply rate limiting for messages
    if (!this.applyRateLimiting(socket, 'message')) {
      return;
    }

    // Update connection's last activity timestamp
    connection.lastActivity = new Date();

    // Process the message
    try {
      // Handle the message using the utility function
      await handleSocketMessage(socket, connection, message, this.connections);
      
      // Update stats
      this.stats.messagesReceived++;
      
      // If the message has a specific recipient, route it
      if (message.message.recipientId) {
        const deliveryStatus = await routeMessageToRecipient(message.message, this.connections);
        
        if (deliveryStatus === MessageDeliveryStatus.DELIVERED || 
            deliveryStatus === MessageDeliveryStatus.SENT) {
          this.stats.messagesDelivered++;
        } else {
          this.stats.messagesFailed++;
        }
      }
    } catch (error) {
      logger.error(`Failed to process message: ${error.message}`, {
        connectionId: connection.connectionId,
        messageId: message.message?.messageId,
        error
      });
      
      // Update stats
      this.stats.messagesFailed++;
      
      // Emit error to the client
      socket.emit('error', {
        errorType: WebSocketErrorType.INVALID_MESSAGE_FORMAT,
        message: 'Failed to process message: ' + error.message
      });
    }
  }

  /**
   * Handles WebSocket disconnection
   * @param socket Socket.io socket instance
   * @param connection WebSocket connection object
   * @param reason Reason for disconnection
   */
  async handleDisconnect(
    socket: Socket,
    connection: IWebSocketConnection,
    reason: string
  ): Promise<void> {
    try {
      // Process disconnection using the utility function
      await handleSocketDisconnect(socket, connection, reason, this.connections);
      
      // If the agent was authenticated, emit presence update
      if (connection.agentId) {
        socket.broadcast.emit(WEBSOCKET_EVENTS.PRESENCE, {
          agentId: connection.agentId,
          status: 'offline',
          timestamp: Date.now()
        });
        
        // If Redis is enabled, publish presence update for cross-server awareness
        if (config.redis.enabled && redisService.isRedisConnected()) {
          await redisService.publish('presence-updates', {
            agentId: connection.agentId,
            status: 'offline',
            timestamp: Date.now()
          });
        }
      }
      
      // Update stats
      this.stats.activeConnections = this.connections.size;
      
      logger.info(`Connection disconnected: ${connection.connectionId}`, { 
        reason,
        agentId: connection.agentId 
      });
    } catch (error) {
      logger.error(`Error handling disconnection: ${error.message}`, {
        connectionId: connection.connectionId,
        socketId: socket.id,
        error
      });
    }
  }

  /**
   * Sends a message to a specific agent
   * @param message Message to send
   * @returns Promise resolving to the delivery status of the message
   */
  async sendMessage(message: IMessage): Promise<MessageDeliveryStatus> {
    if (!this.isInitialized) {
      logger.error('Cannot send message: WebSocket server not initialized');
      return MessageDeliveryStatus.FAILED;
    }
    
    // Validate message
    if (!message || !message.messageId || !message.senderId || !message.recipientId) {
      logger.error('Invalid message format', { message });
      return MessageDeliveryStatus.FAILED;
    }
    
    try {
      // Find recipient connection
      const recipientConnection = this.getConnectionByAgentId(message.recipientId);
      
      // If recipient is not connected to this server instance but Redis is enabled,
      // publish the message to Redis for other instances to deliver
      if (!recipientConnection && config.redis.enabled && redisService.isRedisConnected()) {
        logger.debug(`Recipient ${message.recipientId} not found locally, publishing to Redis`);
        
        await redisService.publish('agent-messages', message);
        
        // We can't know if it was delivered, so return SENT
        this.stats.messagesSent++;
        return MessageDeliveryStatus.SENT;
      }
      
      // If recipient not found (either locally or no Redis), return FAILED
      if (!recipientConnection) {
        logger.warn(`Recipient agent not found: ${message.recipientId}`);
        this.stats.messagesFailed++;
        return MessageDeliveryStatus.FAILED;
      }
      
      // Deliver the message directly if the recipient is connected to this instance
      const socketMessage: IWebSocketMessage = {
        message: message,
        encrypted: false, // Assuming encryption is handled at a higher level if needed
        signature: '', // Signature would be added at a higher level if needed
        timestamp: Date.now()
      };
      
      recipientConnection.socket.emit(WEBSOCKET_EVENTS.MESSAGE, socketMessage);
      
      // Update stats
      this.stats.messagesSent++;
      this.stats.messagesDelivered++;
      
      logger.debug(`Message ${message.messageId} sent to recipient ${message.recipientId}`);
      return MessageDeliveryStatus.DELIVERED;
    } catch (error) {
      logger.error(`Failed to send message: ${error.message}`, {
        messageId: message.messageId,
        recipientId: message.recipientId,
        error
      });
      
      // Update stats
      this.stats.messagesFailed++;
      
      return MessageDeliveryStatus.FAILED;
    }
  }

  /**
   * Broadcasts a message to all connected agents
   * @param message Message to broadcast
   * @param excludeAgentIds Optional array of agent IDs to exclude from broadcast
   * @returns Promise resolving to the number of recipients the message was sent to
   */
  async broadcastMessage(message: IMessage, excludeAgentIds: string[] = []): Promise<number> {
    if (!this.isInitialized) {
      logger.error('Cannot broadcast message: WebSocket server not initialized');
      return 0;
    }
    
    // Validate message
    if (!message || !message.messageId || !message.senderId) {
      logger.error('Invalid message format for broadcast', { message });
      return 0;
    }
    
    try {
      let recipientCount = 0;
      
      // Find all active connections excluding the specified agent IDs
      for (const connection of this.connections.values()) {
        if (connection.status === ConnectionStatus.AUTHENTICATED && 
            connection.agentId && 
            !excludeAgentIds.includes(connection.agentId) &&
            connection.agentId !== message.senderId) {
          
          // Create a copy of the message with this specific recipient
          const recipientMessage: IMessage = {
            ...message,
            recipientId: connection.agentId
          };
          
          // Create socket message
          const socketMessage: IWebSocketMessage = {
            message: recipientMessage,
            encrypted: false, // Assuming encryption is handled at a higher level if needed
            signature: '', // Signature would be added at a higher level if needed
            timestamp: Date.now()
          };
          
          // Send to this recipient
          connection.socket.emit(WEBSOCKET_EVENTS.MESSAGE, socketMessage);
          recipientCount++;
        }
      }
      
      // If Redis is enabled, publish the broadcast message for other instances
      if (config.redis.enabled && redisService.isRedisConnected()) {
        logger.debug(`Publishing broadcast message to Redis`);
        
        await redisService.publish('agent-messages', {
          ...message,
          _isBroadcast: true,
          _excludeAgentIds: excludeAgentIds
        });
        
        // We don't know how many recipients on other instances
        // but we count it as at least one more for stats
        if (recipientCount === 0) {
          recipientCount = 1;
        }
      }
      
      // Update stats
      this.stats.messagesSent += recipientCount;
      this.stats.messagesDelivered += recipientCount;
      
      logger.debug(`Broadcast message ${message.messageId} sent to ${recipientCount} recipients`);
      return recipientCount;
    } catch (error) {
      logger.error(`Failed to broadcast message: ${error.message}`, {
        messageId: message.messageId,
        error
      });
      
      return 0;
    }
  }

  /**
   * Finds a WebSocket connection by agent ID
   * @param agentId Agent ID to look up
   * @returns The connection object if found, undefined otherwise
   */
  getConnectionByAgentId(agentId: string): IWebSocketConnection | undefined {
    return getConnectionByAgentId(agentId, this.connections);
  }

  /**
   * Checks if an agent is currently connected
   * @param agentId Agent ID to check
   * @returns True if the agent is connected, false otherwise
   */
  isAgentConnected(agentId: string): boolean {
    const connection = this.getConnectionByAgentId(agentId);
    return !!(connection && connection.status === ConnectionStatus.AUTHENTICATED);
  }

  /**
   * Forcibly disconnects an agent
   * @param agentId Agent ID to disconnect
   * @param reason Reason for disconnection
   * @returns Promise resolving to true if disconnection was successful
   */
  async disconnectAgent(agentId: string, reason: string = 'Server initiated disconnect'): Promise<boolean> {
    // Find the agent's connection
    const connection = this.getConnectionByAgentId(agentId);
    
    if (!connection) {
      logger.warn(`Cannot disconnect agent ${agentId}: not found`);
      return false;
    }
    
    try {
      // Disconnect the socket
      connection.socket.disconnect(true);
      
      logger.info(`Agent ${agentId} disconnected by server`, { 
        reason,
        connectionId: connection.connectionId 
      });
      
      return true;
    } catch (error) {
      logger.error(`Failed to disconnect agent ${agentId}: ${error.message}`, { 
        error,
        agentId 
      });
      
      return false;
    }
  }

  /**
   * Gets statistics about WebSocket connections and messages
   * @returns WebSocket statistics
   */
  getStats(): IWebSocketStats {
    // Update active connections count
    this.stats.activeConnections = this.connections.size;
    
    // Calculate uptime in seconds
    const uptimeMs = Date.now() - this.startTime.getTime();
    this.stats.uptime = Math.floor(uptimeMs / 1000);
    
    return { ...this.stats };
  }

  /**
   * Sets up Redis subscriptions for cross-server communication
   * @returns Promise resolving to true if setup was successful
   */
  private async setupRedisSubscriptions(): Promise<boolean> {
    // Check if Redis is enabled and connected
    if (!config.redis.enabled || !redisService.isRedisConnected()) {
      logger.debug('Redis not enabled or not connected, skipping subscription setup');
      return false;
    }
    
    try {
      // Subscribe to agent messages channel
      await redisService.subscribe('agent-messages', 
        this.handleRedisMessage.bind(this, 'agent-messages'));
      
      // Subscribe to presence updates channel
      await redisService.subscribe('presence-updates', 
        this.handleRedisMessage.bind(this, 'presence-updates'));
      
      logger.info('Redis subscriptions set up successfully');
      return true;
    } catch (error) {
      logger.error(`Failed to set up Redis subscriptions: ${error.message}`, { error });
      return false;
    }
  }

  /**
   * Handles messages received from Redis
   * @param channel Redis channel the message was received on
   * @param message Message received
   */
  private async handleRedisMessage(channel: string, message: any): Promise<void> {
    try {
      // Parse the message if it's a string
      let parsedMessage = message;
      if (typeof message === 'string') {
        try {
          parsedMessage = JSON.parse(message);
        } catch (e) {
          // Not JSON, use as is
        }
      }
      
      logger.debug(`Received Redis message on channel ${channel}`);
      
      // Handle message based on channel
      switch (channel) {
        case 'agent-messages':
          // Handle agent-to-agent message from another server instance
          
          // Check if this is a broadcast message
          if (parsedMessage._isBroadcast) {
            // Handle broadcast message
            const excludeAgentIds = parsedMessage._excludeAgentIds || [];
            
            // Remove broadcast flags before processing
            const { _isBroadcast, _excludeAgentIds, ...originalMessage } = parsedMessage;
            
            // Broadcast locally (excluding the specified agent IDs)
            await this.broadcastMessage(originalMessage, excludeAgentIds);
          } else if (parsedMessage.recipientId) {
            // Check if the recipient is connected to this instance
            const recipientConnection = this.getConnectionByAgentId(parsedMessage.recipientId);
            
            if (recipientConnection) {
              // Deliver the message
              const socketMessage: IWebSocketMessage = {
                message: parsedMessage,
                encrypted: false, // Assuming encryption is handled at a higher level
                signature: '', // Would be added at a higher level if needed
                timestamp: Date.now()
              };
              
              recipientConnection.socket.emit(WEBSOCKET_EVENTS.MESSAGE, socketMessage);
              
              // Update stats
              this.stats.messagesSent++;
              this.stats.messagesDelivered++;
              
              logger.debug(`Delivered Redis message to local recipient ${parsedMessage.recipientId}`);
            }
          }
          break;
          
        case 'presence-updates':
          // Handle presence updates from another server instance
          if (parsedMessage.agentId && parsedMessage.status) {
            // Broadcast presence update to local connections
            this.io.emit(WEBSOCKET_EVENTS.PRESENCE, {
              agentId: parsedMessage.agentId,
              status: parsedMessage.status,
              timestamp: parsedMessage.timestamp || Date.now()
            });
            
            logger.debug(`Broadcast presence update for agent ${parsedMessage.agentId}: ${parsedMessage.status}`);
          }
          break;
          
        default:
          logger.warn(`Received message on unknown Redis channel: ${channel}`);
      }
    } catch (error) {
      logger.error(`Error handling Redis message: ${error.message}`, {
        channel,
        error
      });
    }
  }

  /**
   * Applies rate limiting to connections or messages
   * @param socket Socket.io socket instance
   * @param type Type of rate limiting to apply ('connection' or 'message')
   * @returns True if rate limit not exceeded, false otherwise
   */
  private applyRateLimiting(socket: Socket, type: string): boolean {
    // Determine rate limit based on type
    const rateLimit = type === 'connection' 
      ? RATE_LIMITS.WEBSOCKET_CONNECTIONS 
      : RATE_LIMITS.WEBSOCKET_MESSAGES;
    
    // Check if socket has rate limiting data
    if (!(socket as any).rateLimit) {
      (socket as any).rateLimit = {
        connection: {
          count: 0,
          resetTime: Date.now() + 60000 // 1 minute window
        },
        message: {
          count: 0,
          resetTime: Date.now() + 60000 // 1 minute window
        }
      };
    }
    
    const rateLimitData = (socket as any).rateLimit[type];
    
    // Reset count if time window has expired
    if (Date.now() > rateLimitData.resetTime) {
      rateLimitData.count = 0;
      rateLimitData.resetTime = Date.now() + 60000; // Reset for next minute
    }
    
    // Increment count
    rateLimitData.count++;
    
    // Check if rate limit exceeded
    if (rateLimitData.count > rateLimit) {
      logger.warn(`Rate limit exceeded for ${type}`, {
        socketId: socket.id,
        count: rateLimitData.count,
        limit: rateLimit
      });
      
      // Emit rate limit error
      socket.emit('error', {
        errorType: WebSocketErrorType.RATE_LIMIT_EXCEEDED,
        message: `Too many ${type}s. Please try again later.`
      });
      
      // For connection rate limiting, disconnect the socket
      if (type === 'connection') {
        socket.disconnect(true);
      }
      
      return false;
    }
    
    return true;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export { WebSocketService, websocketService };