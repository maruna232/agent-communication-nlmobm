/**
 * WebSocket Message Handlers
 * 
 * This module implements message handling functionality for WebSocket communication 
 * between agents in the AI Agent Network. It provides utilities for creating, registering,
 * and managing handlers for different types of messages exchanged between agents,
 * ensuring secure and reliable agent-to-agent communication.
 */

import {
  WebSocketHandler,
  AgentMessage,
  WebSocketEncryptedMessage,
  MessageAcknowledgement,
  PresenceUpdate,
  TypingIndicator
} from '../types/websocket.types';
import {
  WEBSOCKET_EVENTS,
  MESSAGE_TYPES
} from '../constants';
import { processEncryptedWebSocketMessage } from './encryption';
import { createWebSocketError } from '../utils/errorHandling';

/**
 * Creates a handler function for processing generic WebSocket messages
 * @param messageProcessor Function to process the decrypted message
 * @param errorHandler Function to handle errors during processing
 * @returns Handler function for WebSocket messages
 */
export function createGenericMessageHandler(
  messageProcessor: (message: AgentMessage) => void,
  errorHandler: (error: Error) => void = createDefaultErrorHandler()
): (encryptedMessage: WebSocketEncryptedMessage, sharedSecret?: string, signingPublicKey?: string) => void {
  return (encryptedMessage: WebSocketEncryptedMessage, sharedSecret?: string, signingPublicKey?: string) => {
    try {
      // Validate message structure
      if (!validateMessage(encryptedMessage)) {
        throw new Error('Invalid message structure');
      }
      
      // If message is encrypted and we have the necessary keys, decrypt it
      let message = encryptedMessage.message;
      if (encryptedMessage.encrypted && sharedSecret && signingPublicKey) {
        try {
          message = processEncryptedWebSocketMessage(encryptedMessage, sharedSecret, signingPublicKey);
        } catch (error) {
          errorHandler(error as Error);
          return;
        }
      }
      
      // Process the message
      messageProcessor(message);
    } catch (error) {
      errorHandler(error as Error);
    }
  };
}

/**
 * Creates a specialized handler for specific message types
 * @param messageType The type of message to handle
 * @param processor Function to process messages of the specified type
 * @param errorHandler Function to handle errors during processing
 * @returns Handler function for specific message types
 */
export function createMessageHandler(
  messageType: string,
  processor: (message: AgentMessage) => void,
  errorHandler: (error: Error) => void = createDefaultErrorHandler()
): (encryptedMessage: WebSocketEncryptedMessage, sharedSecret?: string, signingPublicKey?: string) => void {
  const genericHandler = createGenericMessageHandler(
    (message: AgentMessage) => {
      // Only process messages of the specified type
      if (message.messageType === messageType) {
        processor(message);
      }
    },
    errorHandler
  );
  
  return genericHandler;
}

/**
 * Creates a handler for message delivery acknowledgements
 * @param ackProcessor Function to process acknowledgements
 * @param errorHandler Function to handle errors during processing
 * @returns Handler function for acknowledgement messages
 */
export function createAcknowledgementHandler(
  ackProcessor: (messageId: string, status: string) => void,
  errorHandler: (error: Error) => void = createDefaultErrorHandler()
): (ack: MessageAcknowledgement) => void {
  return (ack: MessageAcknowledgement) => {
    try {
      // Validate acknowledgement structure
      if (!ack || !ack.messageId || !ack.status) {
        throw new Error('Invalid acknowledgement structure');
      }
      
      // Process the acknowledgement
      ackProcessor(ack.messageId, ack.status);
    } catch (error) {
      errorHandler(error as Error);
    }
  };
}

/**
 * Creates a handler for agent presence updates
 * @param presenceProcessor Function to process presence updates
 * @param errorHandler Function to handle errors during processing
 * @returns Handler function for presence updates
 */
export function createPresenceHandler(
  presenceProcessor: (agentId: string, status: string) => void,
  errorHandler: (error: Error) => void = createDefaultErrorHandler()
): (presence: PresenceUpdate) => void {
  return (presence: PresenceUpdate) => {
    try {
      // Validate presence update structure
      if (!presence || !presence.agentId || !presence.status) {
        throw new Error('Invalid presence update structure');
      }
      
      // Process the presence update
      presenceProcessor(presence.agentId, presence.status);
    } catch (error) {
      errorHandler(error as Error);
    }
  };
}

/**
 * Creates a handler for typing indicator updates
 * @param typingProcessor Function to process typing indicators
 * @param errorHandler Function to handle errors during processing
 * @returns Handler function for typing indicators
 */
export function createTypingIndicatorHandler(
  typingProcessor: (agentId: string, conversationId: string, isTyping: boolean) => void,
  errorHandler: (error: Error) => void = createDefaultErrorHandler()
): (typing: TypingIndicator) => void {
  return (typing: TypingIndicator) => {
    try {
      // Validate typing indicator structure
      if (!typing || !typing.agentId || !typing.conversationId || typeof typing.isTyping !== 'boolean') {
        throw new Error('Invalid typing indicator structure');
      }
      
      // Process the typing indicator
      typingProcessor(typing.agentId, typing.conversationId, typing.isTyping);
    } catch (error) {
      errorHandler(error as Error);
    }
  };
}

/**
 * Creates a registry for managing WebSocket message handlers
 * @returns Handler registry with registration and retrieval methods
 */
export function createHandlerRegistry() {
  const handlers: Map<string, Function> = new Map();
  
  return {
    /**
     * Register a handler for a specific event type
     * @param eventType The event type to handle
     * @param handler The handler function
     */
    register: (eventType: string, handler: Function) => {
      handlers.set(eventType, handler);
    },
    
    /**
     * Unregister a handler for a specific event type
     * @param eventType The event type to unregister
     */
    unregister: (eventType: string) => {
      handlers.delete(eventType);
    },
    
    /**
     * Get the handler for a specific event type
     * @param eventType The event type to get the handler for
     * @returns The handler function or undefined if not found
     */
    getHandler: (eventType: string) => {
      return handlers.get(eventType);
    },
    
    /**
     * Check if a handler exists for a specific event type
     * @param eventType The event type to check
     * @returns True if a handler exists, false otherwise
     */
    hasHandler: (eventType: string) => {
      return handlers.has(eventType);
    },
    
    /**
     * Get all registered handlers
     * @returns All registered handlers as an array of WebSocketHandler objects
     */
    getAllHandlers: () => {
      return Array.from(handlers.entries()).map(([eventType, handler]) => ({
        eventType,
        handler
      }) as WebSocketHandler);
    }
  };
}

/**
 * Validates that a message has the required structure and fields
 * @param message The message to validate
 * @returns True if the message is valid, false otherwise
 */
export function validateMessage(message: any): boolean {
  if (!message) return false;
  
  // Check message type based on properties
  if (typeof message === 'object') {
    if ('message' in message && 'encrypted' in message && 'signature' in message) {
      // WebSocketEncryptedMessage check
      return true;
    } else if ('messageId' in message && 'status' in message) {
      // MessageAcknowledgement check
      return true;
    } else if ('agentId' in message && 'status' in message && !('conversationId' in message)) {
      // PresenceUpdate check
      return true;
    } else if ('agentId' in message && 'conversationId' in message && 'isTyping' in message) {
      // TypingIndicator check
      return true;
    } else if ('messageId' in message && 'senderId' in message && 'recipientId' in message && 'messageType' in message) {
      // AgentMessage check
      return true;
    }
  }
  
  return false;
}

/**
 * Creates a default error handler for WebSocket message processing
 * @returns Default error handler function
 */
export function createDefaultErrorHandler() {
  return (error: Error) => {
    const wsError = createWebSocketError(
      `WebSocket message processing error: ${error.message}`,
      { originalError: error }
    );
    console.error('[WebSocket Error]', wsError);
  };
}