import { Socket } from 'socket.io'; // v4.7+
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { 
  WEBSOCKET_EVENTS, 
  TIMEOUT_VALUES 
} from '../config/constants';

import {
  IWebSocketConnection,
  IWebSocketMessage,
  ConnectionStatus,
  WebSocketErrorType,
  IWebSocketStats
} from '../interfaces/websocket.interface';

import {
  IMessage,
  IMessageAcknowledgement,
  MessageDeliveryStatus
} from '../interfaces/message.interface';

import { 
  encryptMessage, 
  decryptMessage 
} from '../utils/encryption.utils';

import { createWebSocketError } from '../utils/error.utils';
import { logger } from '../utils/logging.utils';

/**
 * Handles new WebSocket connections, performs initial setup, and registers event listeners
 * 
 * @param socket - The Socket.io socket instance for the new connection
 * @param connections - Map of all active connections keyed by connection ID
 * @returns Promise resolving to the new connection object
 */
export async function handleSocketConnection(
  socket: Socket,
  connections: Map<string, IWebSocketConnection>
): Promise<IWebSocketConnection> {
  // Generate a unique connection ID
  const connectionId = uuidv4();
  
  logger.info(`New connection attempt: ${socket.id}`, { connectionId });
  
  // Create a new connection object with initial status
  const connection: IWebSocketConnection = {
    connectionId,
    agentId: '',  // Will be set during authentication
    userId: '',   // Will be set during authentication
    socket,
    status: ConnectionStatus.CONNECTING,
    publicKey: '', // Will be set during authentication
    connectedAt: new Date(),
    lastActivity: new Date(),
    metadata: {
      userAgent: socket.handshake.headers['user-agent'] || '',
      ipAddress: socket.handshake.address,
      encryptionEnabled: false,
      deviceId: ''
    }
  };
  
  // Add connection to the connections map
  connections.set(connectionId, connection);
  
  // Set up authentication timeout
  const authTimeout = setTimeout(() => {
    if (connection.status === ConnectionStatus.CONNECTING) {
      logger.warn(`Authentication timeout for connection ${connectionId}`);
      
      const error = createWebSocketError(WebSocketErrorType.AUTHENTICATION_FAILED, {
        message: 'Authentication timeout',
        connectionId
      });
      
      socket.emit('error', { 
        errorType: error.errorCode,
        message: error.message
      });
      
      socket.disconnect(true);
    }
  }, TIMEOUT_VALUES.SOCKET_CONNECTION);
  
  // Set up event listeners
  
  // Handle disconnect events
  socket.on(WEBSOCKET_EVENTS.DISCONNECT, async (reason: string) => {
    clearTimeout(authTimeout);
    await handleSocketDisconnect(socket, connection, reason, connections);
  });
  
  // Handle incoming messages
  socket.on(WEBSOCKET_EVENTS.MESSAGE, async (socketMessage: IWebSocketMessage) => {
    try {
      await handleSocketMessage(socket, connection, socketMessage, connections);
    } catch (error) {
      logger.error(`Error handling message: ${(error as Error).message}`, {
        connectionId,
        error
      });
      
      socket.emit('error', {
        errorType: WebSocketErrorType.SERVER_ERROR,
        message: 'Error processing message'
      });
    }
  });
  
  // Handle socket errors
  socket.on('error', (error: Error) => {
    logger.error(`Socket error: ${error.message}`, {
      connectionId,
      socketId: socket.id,
      error
    });
    
    connection.status = ConnectionStatus.ERROR;
  });
  
  // Setup heartbeat for connection health monitoring
  const heartbeatInterval = setupHeartbeat(socket, connection);
  
  // Store the interval ID on the socket for cleanup on disconnect
  (socket as any).heartbeatInterval = heartbeatInterval;
  
  logger.info(`Connection setup complete: ${connectionId}`);
  
  return connection;
}

/**
 * Authenticates a WebSocket connection using the provided credentials
 * 
 * @param socket - The Socket.io socket instance
 * @param connection - The connection object to authenticate
 * @param authData - Authentication data containing agent ID, user ID, and token
 * @returns Promise resolving to true if authentication was successful
 */
export async function handleSocketAuthentication(
  socket: Socket,
  connection: IWebSocketConnection,
  authData: any
): Promise<boolean> {
  if (!connection) {
    logger.error('Cannot authenticate: connection not found');
    return false;
  }
  
  // Update connection status to authenticating
  connection.status = ConnectionStatus.AUTHENTICATING;
  
  // Validate authentication data
  if (!authData || !authData.agentId || !authData.userId || !authData.token) {
    logger.error('Invalid authentication data', { authData });
    
    const error = createWebSocketError(WebSocketErrorType.AUTHENTICATION_FAILED, {
      message: 'Invalid authentication data',
      connectionId: connection.connectionId
    });
    
    socket.emit('error', { 
      errorType: error.errorCode,
      message: error.message
    });
    
    return false;
  }
  
  try {
    // Extract authentication data
    const { agentId, userId, token, publicKey } = authData;
    
    // In a real implementation, verify the token with the auth service
    // This is a placeholder - you would call your actual authentication service here
    // const isValid = await authService.verifyToken(token, userId);
    
    // Simulate token verification (replace with actual verification)
    const isValid = true; // Placeholder
    
    if (!isValid) {
      logger.warn(`Authentication failed for agent ${agentId}`, {
        connectionId: connection.connectionId,
        userId
      });
      
      const error = createWebSocketError(WebSocketErrorType.AUTHENTICATION_FAILED, {
        message: 'Invalid authentication token',
        connectionId: connection.connectionId
      });
      
      socket.emit('error', { 
        errorType: error.errorCode,
        message: error.message
      });
      
      return false;
    }
    
    // Update connection with authenticated information
    connection.agentId = agentId;
    connection.userId = userId;
    connection.publicKey = publicKey || '';
    connection.status = ConnectionStatus.AUTHENTICATED;
    connection.metadata.encryptionEnabled = !!publicKey;
    
    // Emit authentication success event
    socket.emit('authenticated', { 
      connectionId: connection.connectionId,
      agentId
    });
    
    logger.info(`Agent authenticated: ${agentId}`, {
      connectionId: connection.connectionId,
      userId
    });
    
    return true;
  } catch (error) {
    logger.error(`Authentication error: ${(error as Error).message}`, {
      connectionId: connection.connectionId,
      error
    });
    
    const wsError = createWebSocketError(WebSocketErrorType.AUTHENTICATION_FAILED, {
      message: 'Authentication failed',
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
 * Processes incoming WebSocket messages and routes them appropriately
 * 
 * @param socket - The Socket.io socket instance
 * @param connection - The connection object associated with the socket
 * @param socketMessage - The received WebSocket message
 * @param connections - Map of all active connections keyed by connection ID
 * @returns Promise that resolves when message processing is complete
 */
export async function handleSocketMessage(
  socket: Socket,
  connection: IWebSocketConnection,
  socketMessage: IWebSocketMessage,
  connections: Map<string, IWebSocketConnection>
): Promise<void> {
  // Update the last activity timestamp
  connection.lastActivity = new Date();
  
  // Ensure connection is authenticated
  if (connection.status !== ConnectionStatus.AUTHENTICATED) {
    logger.warn(`Received message from unauthenticated connection: ${connection.connectionId}`);
    
    socket.emit('error', {
      errorType: WebSocketErrorType.AUTHENTICATION_FAILED,
      message: 'Connection not authenticated'
    });
    
    return;
  }
  
  // Validate the message
  if (!validateMessage(socketMessage)) {
    logger.warn(`Invalid message format received: ${connection.connectionId}`, {
      message: socketMessage
    });
    
    socket.emit('error', {
      errorType: WebSocketErrorType.INVALID_MESSAGE_FORMAT,
      message: 'Invalid message format'
    });
    
    return;
  }
  
  // Log the message (with sensitive content redacted)
  logger.info(`Message received from agent ${connection.agentId}`, {
    messageId: socketMessage.message.messageId,
    messageType: socketMessage.message.messageType,
    connectionId: connection.connectionId
  });
  
  // Process the message based on its type and content
  try {
    // If the message is encrypted and we have decryption capability, decrypt it
    if (socketMessage.encrypted && connection.metadata.encryptionEnabled) {
      // In a real implementation, you would decrypt the message
      // This is a placeholder - you would actually decrypt using local keys
      // socketMessage.message = await decryptMessage(socketMessage.message, ...);
    }
    
    // Handle different message types (handshake, query, response, etc.)
    switch (socketMessage.message.messageType) {
      case 'HANDSHAKE':
        // Process handshake message
        // This would typically involve key exchange and establishing secure communication
        logger.debug(`Handshake message from ${connection.agentId}`);
        
        // Send acknowledgement
        socket.emit(WEBSOCKET_EVENTS.ACK, createAcknowledgement(
          socketMessage.message.messageId,
          MessageDeliveryStatus.DELIVERED
        ));
        break;
        
      default:
        // For other message types, route to the appropriate recipient if applicable
        if (socketMessage.message.recipientId) {
          const deliveryStatus = await routeMessageToRecipient(socketMessage.message, connections);
          
          // Send acknowledgement to the sender
          socket.emit(WEBSOCKET_EVENTS.ACK, createAcknowledgement(
            socketMessage.message.messageId,
            deliveryStatus
          ));
        } else {
          logger.warn(`Message has no recipient: ${socketMessage.message.messageId}`);
          
          // Send failure acknowledgement
          socket.emit(WEBSOCKET_EVENTS.ACK, createAcknowledgement(
            socketMessage.message.messageId,
            MessageDeliveryStatus.FAILED
          ));
        }
    }
  } catch (error) {
    logger.error(`Error processing message: ${(error as Error).message}`, {
      messageId: socketMessage.message.messageId,
      connectionId: connection.connectionId,
      error
    });
    
    // Send failure acknowledgement
    socket.emit(WEBSOCKET_EVENTS.ACK, createAcknowledgement(
      socketMessage.message.messageId,
      MessageDeliveryStatus.FAILED
    ));
  }
}

/**
 * Handles WebSocket disconnection events, performing cleanup and notification
 * 
 * @param socket - The Socket.io socket instance
 * @param connection - The connection object associated with the socket
 * @param reason - The reason for disconnection
 * @param connections - Map of all active connections keyed by connection ID
 * @returns Promise that resolves when disconnection handling is complete
 */
export async function handleSocketDisconnect(
  socket: Socket,
  connection: IWebSocketConnection,
  reason: string,
  connections: Map<string, IWebSocketConnection>
): Promise<void> {
  logger.info(`Socket disconnected: ${connection.connectionId}`, { reason });
  
  // Update connection status
  connection.status = ConnectionStatus.DISCONNECTING;
  
  // Clear any intervals or timeouts
  if ((socket as any).heartbeatInterval) {
    clearInterval((socket as any).heartbeatInterval);
  }
  
  // If the connection was authenticated, notify other agents about going offline
  if (connection.agentId) {
    // Emit presence update to notify other agents
    // This could be direct notifications or through a presence service
    logger.debug(`Agent ${connection.agentId} went offline`);
    
    // Here you would implement the specific notification logic
    // e.g., socket.broadcast.emit() or through a centralized presence service
  }
  
  // Update connection status and clean up
  connection.status = ConnectionStatus.DISCONNECTED;
  connections.delete(connection.connectionId);
  
  logger.info(`Connection cleanup complete: ${connection.connectionId}`);
}

/**
 * Routes a message to its intended recipient
 * 
 * @param message - The message to route
 * @param connections - Map of all active connections keyed by connection ID
 * @returns Promise resolving to the delivery status of the message
 */
export async function routeMessageToRecipient(
  message: IMessage,
  connections: Map<string, IWebSocketConnection>
): Promise<MessageDeliveryStatus> {
  const recipientId = message.recipientId;
  
  // Find the recipient's connection
  const recipientConnection = getConnectionByAgentId(recipientId, connections);
  
  // If recipient not found, return FAILED status
  if (!recipientConnection) {
    logger.warn(`Recipient agent not found: ${recipientId}`);
    return MessageDeliveryStatus.FAILED;
  }
  
  // Check if recipient is authenticated and connected
  if (recipientConnection.status !== ConnectionStatus.AUTHENTICATED) {
    logger.warn(`Recipient agent not authenticated: ${recipientId}`);
    return MessageDeliveryStatus.FAILED;
  }
  
  // Prepare the message for sending
  // If encryption is enabled for both sender and recipient, encrypt the message
  let messageToSend = { ...message };
  let encrypted = false;
  
  if (recipientConnection.metadata.encryptionEnabled) {
    // In a real implementation, encrypt the message
    // This is a placeholder - actual encryption would happen here
    // messageToSend = await encryptMessage(...);
    encrypted = true;
  }
  
  // Create the socket message
  const socketMessage: IWebSocketMessage = {
    message: messageToSend,
    encrypted,
    signature: '', // In a real implementation, you would sign the message
    timestamp: Date.now()
  };
  
  try {
    // Send the message to the recipient
    recipientConnection.socket.emit(WEBSOCKET_EVENTS.MESSAGE, socketMessage);
    
    // In a complete implementation, you would wait for acknowledgement
    // For now, we'll just return SENT status
    logger.info(`Message ${message.messageId} sent to recipient ${recipientId}`);
    return MessageDeliveryStatus.SENT;
  } catch (error) {
    logger.error(`Failed to send message to recipient: ${(error as Error).message}`, {
      messageId: message.messageId,
      recipientId,
      error
    });
    return MessageDeliveryStatus.FAILED;
  }
}

/**
 * Finds a WebSocket connection by agent ID
 * 
 * @param agentId - The agent ID to look up
 * @param connections - Map of all active connections keyed by connection ID
 * @returns The connection object if found, undefined otherwise
 */
export function getConnectionByAgentId(
  agentId: string,
  connections: Map<string, IWebSocketConnection>
): IWebSocketConnection | undefined {
  // Iterate through connections to find one with the matching agent ID
  for (const connection of connections.values()) {
    if (connection.agentId === agentId && 
        connection.status === ConnectionStatus.AUTHENTICATED) {
      return connection;
    }
  }
  
  return undefined;
}

/**
 * Calculates statistics about WebSocket connections
 * 
 * @param connections - Map of all active connections keyed by connection ID
 * @returns Statistics about WebSocket connections
 */
export function getConnectionStats(
  connections: Map<string, IWebSocketConnection>
): IWebSocketStats {
  // Initialize statistics
  const stats: IWebSocketStats = {
    totalConnections: connections.size,
    activeConnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    messagesDelivered: 0,
    messagesFailed: 0,
    uptime: 0,
    startTime: new Date()
  };
  
  // Count active connections (authenticated status)
  for (const connection of connections.values()) {
    if (connection.status === ConnectionStatus.AUTHENTICATED) {
      stats.activeConnections++;
    }
  }
  
  // In a real implementation, you would track message counts
  // You might store this in a central counter or database
  
  // Calculate uptime
  const uptimeMs = Date.now() - stats.startTime.getTime();
  stats.uptime = Math.floor(uptimeMs / 1000); // Convert to seconds
  
  return stats;
}

/**
 * Validates a WebSocket message format and required fields
 * 
 * @param socketMessage - The WebSocket message to validate
 * @returns True if the message is valid, false otherwise
 */
export function validateMessage(socketMessage: IWebSocketMessage): boolean {
  // Check if the message object exists
  if (!socketMessage || !socketMessage.message) {
    return false;
  }
  
  const message = socketMessage.message;
  
  // Check required fields
  if (!message.messageId || !message.senderId || !message.messageType) {
    return false;
  }
  
  // Validate timestamp
  if (!socketMessage.timestamp || typeof socketMessage.timestamp !== 'number') {
    return false;
  }
  
  // If message requires a recipient, validate recipient ID
  if (['QUERY', 'RESPONSE', 'PROPOSAL', 'CONFIRMATION', 'REJECTION'].includes(message.messageType) 
      && !message.recipientId) {
    return false;
  }
  
  // Validate message content based on message type
  if (!message.content) {
    return false;
  }
  
  // Add specific validation for different message types
  switch (message.messageType) {
    case 'HANDSHAKE':
      // Handshake should include public key
      if (typeof message.content !== 'object' || !message.content.publicKey) {
        return false;
      }
      break;
      
    case 'QUERY':
      // Query should include query type and parameters
      if (typeof message.content !== 'object' || 
          !message.content.queryType || 
          !message.content.parameters) {
        return false;
      }
      break;
      
    // Add validation for other message types as needed
  }
  
  return true;
}

/**
 * Creates a message acknowledgement object
 * 
 * @param messageId - ID of the message being acknowledged
 * @param status - Delivery status of the message
 * @returns Message acknowledgement object
 */
export function createAcknowledgement(
  messageId: string,
  status: MessageDeliveryStatus
): IMessageAcknowledgement {
  return {
    messageId,
    status
  };
}

/**
 * Sets up a heartbeat interval for a WebSocket connection
 * 
 * @param socket - The Socket.io socket instance
 * @param connection - The connection object associated with the socket
 * @returns The interval timer ID
 */
export function setupHeartbeat(
  socket: Socket,
  connection: IWebSocketConnection
): NodeJS.Timeout {
  // Set up an interval to send heartbeats
  const interval = setInterval(() => {
    // Skip heartbeat if connection is no longer active
    if (connection.status !== ConnectionStatus.CONNECTING && 
        connection.status !== ConnectionStatus.CONNECTED &&
        connection.status !== ConnectionStatus.AUTHENTICATED) {
      return;
    }
    
    // Send heartbeat message
    socket.emit('heartbeat', { timestamp: Date.now() });
    
    // Update last activity timestamp
    connection.lastActivity = new Date();
    
    // Check for connection timeout
    const inactivityTime = Date.now() - connection.lastActivity.getTime();
    const timeoutThreshold = TIMEOUT_VALUES.SOCKET_RESPONSE * 2;
    
    if (inactivityTime > timeoutThreshold) {
      logger.warn(`Connection timeout for ${connection.connectionId}`, {
        agentId: connection.agentId,
        inactivityTime
      });
      
      // Disconnect the socket due to inactivity
      socket.disconnect(true);
    }
  }, TIMEOUT_VALUES.HEARTBEAT_INTERVAL);
  
  return interval;
}