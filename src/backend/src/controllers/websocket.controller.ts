import { Request, Response, NextFunction } from 'express'; // v4.18.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { websocketService } from '../services/websocket.service';
import { 
  IMessage,
  MessageDeliveryStatus 
} from '../interfaces/message.interface';
import {
  IWebSocketConnection,
  IWebSocketStats,
  ConnectionStatus
} from '../interfaces/websocket.interface';
import { HTTP_STATUS } from '../config/constants';
import {
  createWebSocketError,
  formatErrorResponse,
  handleAsyncError
} from '../utils/error.utils';
import { logger } from '../utils/logging.utils';

/**
 * Retrieves statistics about WebSocket connections and messages
 */
export const getWebSocketStats = handleAsyncError(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.debug('WebSocket stats requested');
  
  // Get statistics from WebSocket service
  const stats: IWebSocketStats = websocketService.getStats();
  
  // Return stats with 200 OK status
  res.status(HTTP_STATUS.OK).json({
    success: true,
    stats
  });
});

/**
 * Checks if a specific agent is currently connected
 */
export const getConnectionStatus = handleAsyncError(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { agentId } = req.params;
  
  // Validate agentId
  if (!agentId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      formatErrorResponse(createWebSocketError('websocket_error.invalid_agent_id', {
        message: 'Agent ID is required'
      }))
    );
  }
  
  // Check if agent is connected
  const isConnected = websocketService.isAgentConnected(agentId);
  
  // Return connection status
  res.status(HTTP_STATUS.OK).json({
    success: true,
    isConnected,
    agentId
  });
});

/**
 * Retrieves detailed information about a specific agent connection
 */
export const getConnectionDetails = handleAsyncError(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { agentId } = req.params;
  
  // Validate agentId
  if (!agentId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      formatErrorResponse(createWebSocketError('websocket_error.invalid_agent_id', {
        message: 'Agent ID is required'
      }))
    );
  }
  
  // Get connection details
  const connection = websocketService.getConnectionByAgentId(agentId);
  
  // If connection not found, return 404
  if (!connection) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      formatErrorResponse(createWebSocketError('websocket_error.agent_unavailable', {
        message: `Agent ${agentId} not found or not connected`
      }))
    );
  }
  
  // Sanitize connection details to remove sensitive information
  const sanitizedConnection = sanitizeConnectionDetails(connection);
  
  // Return connection details
  res.status(HTTP_STATUS.OK).json({
    success: true,
    connection: sanitizedConnection
  });
});

/**
 * Forcibly disconnects an agent from the WebSocket server
 */
export const disconnectAgent = handleAsyncError(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { agentId } = req.params;
  const { reason } = req.body;
  
  // Validate agentId
  if (!agentId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      formatErrorResponse(createWebSocketError('websocket_error.invalid_agent_id', {
        message: 'Agent ID is required'
      }))
    );
  }
  
  // Set default reason if not provided
  const disconnectReason = reason || 'Disconnected by server';
  
  // Attempt to disconnect the agent
  const success = await websocketService.disconnectAgent(agentId, disconnectReason);
  
  if (success) {
    // Return success response
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Agent ${agentId} disconnected successfully`,
      agentId
    });
  } else {
    // If agent not found, return 404
    res.status(HTTP_STATUS.NOT_FOUND).json(
      formatErrorResponse(createWebSocketError('websocket_error.agent_unavailable', {
        message: `Agent ${agentId} not found or not connected`
      }))
    );
  }
});

/**
 * Sends a message to a specific agent
 */
export const sendMessage = handleAsyncError(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const messageData = req.body;
  
  // Validate required message fields
  if (!validateMessage(messageData)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      formatErrorResponse(createWebSocketError('websocket_error.invalid_message_format', {
        message: 'Invalid message format. Required fields: recipientId, messageType, content'
      }))
    );
  }
  
  // Generate messageId if not provided
  const messageId = messageData.messageId || uuidv4();
  
  // Extract sender from authenticated user or request body
  // In a production app, this would come from authenticated user
  const senderId = (req as any).user?.agentId || messageData.senderId;
  
  // Create message object
  const message: IMessage = {
    messageId,
    conversationId: messageData.conversationId || messageId,
    senderId,
    recipientId: messageData.recipientId,
    messageType: messageData.messageType,
    content: messageData.content,
    timestamp: Date.now(),
    metadata: messageData.metadata || {}
  };
  
  // Send message
  const deliveryStatus = await websocketService.sendMessage(message);
  
  // Return appropriate response based on delivery status
  if (deliveryStatus === MessageDeliveryStatus.DELIVERED || 
      deliveryStatus === MessageDeliveryStatus.SENT) {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: deliveryStatus === MessageDeliveryStatus.DELIVERED 
        ? 'Message delivered successfully' 
        : 'Message sent but delivery not confirmed',
      messageId,
      status: deliveryStatus
    });
  } else {
    // If delivery failed, return appropriate error
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      formatErrorResponse(createWebSocketError('websocket_error.message_delivery_failed', {
        message: 'Failed to deliver message',
        messageId,
        status: deliveryStatus
      }))
    );
  }
});

/**
 * Broadcasts a message to all connected agents or a subset of agents
 */
export const broadcastMessage = handleAsyncError(async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { messageData, excludeAgentIds } = req.body;
  
  // Validate required message fields
  if (!messageData || !messageData.messageType || !messageData.content) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      formatErrorResponse(createWebSocketError('websocket_error.invalid_message_format', {
        message: 'Invalid message format. Required fields: messageType, content'
      }))
    );
  }
  
  // Generate messageId if not provided
  const messageId = messageData.messageId || uuidv4();
  
  // Extract sender from authenticated user or request body
  // In a production app, this would come from authenticated user
  const senderId = (req as any).user?.agentId || messageData.senderId;
  
  // Create message object
  const message: IMessage = {
    messageId,
    conversationId: messageData.conversationId || messageId,
    senderId,
    recipientId: messageData.recipientId || '', // May be empty for broadcasts
    messageType: messageData.messageType,
    content: messageData.content,
    timestamp: Date.now(),
    metadata: messageData.metadata || {}
  };
  
  // Broadcast message
  const recipientCount = await websocketService.broadcastMessage(message, excludeAgentIds);
  
  // Return success response with recipient count
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Message broadcast to ${recipientCount} recipients`,
    messageId,
    recipientCount
  });
});

/**
 * Validates a message object has all required fields
 */
function validateMessage(message: Partial<IMessage>): boolean {
  // Check if message object exists
  if (!message) {
    return false;
  }
  
  // All messages must have message type and content
  if (!message.messageType || !message.content) {
    return false;
  }
  
  // Direct messages must have a recipient
  if (message.messageType !== 'HEARTBEAT' && !message.recipientId) {
    return false;
  }
  
  return true;
}

/**
 * Removes sensitive information from connection details before sending to client
 */
function sanitizeConnectionDetails(connection: IWebSocketConnection): object {
  // Create a copy of the connection object
  const sanitized = { ...connection };
  
  // Remove socket object and other sensitive fields
  delete sanitized.socket;
  delete sanitized.publicKey;
  
  return sanitized;
}

export {
  getWebSocketStats,
  getConnectionStatus,
  getConnectionDetails,
  disconnectAgent,
  sendMessage,
  broadcastMessage
};