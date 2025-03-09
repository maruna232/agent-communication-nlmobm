import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import {
  WebSocketClientInterface,
  WebSocketConfig,
  WebSocketConnectionStatus,
  WebSocketAuthPayload,
  WebSocketHandler,
  AgentMessage,
  WEBSOCKET_EVENTS,
  MESSAGE_TYPES
} from '../lib/types/websocket.types';
import {
  createWebSocketClient,
  DEFAULT_WEBSOCKET_CONFIG
} from '../lib/websocket/socketClient';
import {
  generateAgentKeyPair,
  generateAgentSigningKeyPair
} from '../lib/websocket/encryption';
import { createHandlerRegistry } from '../lib/websocket/messageHandlers';

/**
 * Interface for the return value of the useWebSocket hook
 */
interface UseWebSocketReturn {
  client: WebSocketClientInterface | null;
  status: WebSocketConnectionStatus;
  error: Error | null;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  sendMessage: (message: AgentMessage) => Promise<boolean>;
  registerHandler: (handler: WebSocketHandler) => void;
  unregisterHandler: (eventType: string) => void;
  updatePresence: (status: string) => void;
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void;
  getConnectionStatus: () => WebSocketConnectionStatus;
}

/**
 * A custom React hook that provides WebSocket functionality for agent-to-agent communication
 * in the AI Agent Network. This hook abstracts the WebSocket connection management, message
 * handling, and encryption, providing a simplified interface for components.
 * 
 * @param config - Optional WebSocket configuration
 * @returns WebSocket state and functions for components
 */
export function useWebSocket(config?: Partial<WebSocketConfig>): UseWebSocketReturn {
  const { user, token, isAuthenticated } = useAuth();
  const [client, setClient] = useState<WebSocketClientInterface | null>(null);
  const [status, setStatus] = useState<WebSocketConnectionStatus>(WebSocketConnectionStatus.DISCONNECTED);
  const [error, setError] = useState<Error | null>(null);
  
  // Use refs to store values that should persist across renders
  const handlersRef = useRef(createHandlerRegistry());
  const keysRef = useRef<{
    encryptionKeyPair: { publicKey: string; privateKey: string } | null;
    signingKeyPair: { publicKey: string; privateKey: string } | null;
  }>({
    encryptionKeyPair: null,
    signingKeyPair: null
  });
  
  // Initialize WebSocket client with configuration
  useEffect(() => {
    const mergedConfig = {
      ...DEFAULT_WEBSOCKET_CONFIG,
      ...(config || {})
    };
    
    const wsClient = createWebSocketClient(mergedConfig);
    setClient(wsClient);
    
    // Cleanup on unmount
    return () => {
      if (wsClient) {
        wsClient.disconnect();
      }
    };
  }, []);
  
  // Generate encryption keys for secure communication
  useEffect(() => {
    async function generateKeys() {
      try {
        const [encryptionKeys, signingKeys] = await Promise.all([
          generateAgentKeyPair(),
          generateAgentSigningKeyPair()
        ]);
        
        keysRef.current = {
          encryptionKeyPair: encryptionKeys,
          signingKeyPair: signingKeys
        };
      } catch (err) {
        console.error('Failed to generate encryption keys:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
    
    if (!keysRef.current.encryptionKeyPair || !keysRef.current.signingKeyPair) {
      generateKeys();
    }
  }, []);
  
  // Connect to WebSocket server with authentication
  const connect = useCallback(async (): Promise<boolean> => {
    if (!client) {
      const err = new Error('WebSocket client not initialized');
      setError(err);
      return false;
    }
    
    if (!isAuthenticated || !token) {
      const err = new Error('User not authenticated');
      setError(err);
      return false;
    }
    
    if (!keysRef.current.encryptionKeyPair) {
      const err = new Error('Encryption keys not generated');
      setError(err);
      return false;
    }
    
    try {
      setStatus(WebSocketConnectionStatus.CONNECTING);
      
      // Create authentication payload
      const authPayload: WebSocketAuthPayload = {
        token: typeof token === 'string' ? token : token.accessToken || token.token || String(token),
        agentId: user?.agentId || '',
        publicKey: keysRef.current.encryptionKeyPair.publicKey
      };
      
      const authResult = await client.connect(authPayload);
      
      if (authResult.authenticated) {
        setStatus(WebSocketConnectionStatus.CONNECTED);
        setError(null);
        return true;
      } else {
        setStatus(WebSocketConnectionStatus.ERROR);
        setError(new Error(authResult.error || 'Authentication failed'));
        return false;
      }
    } catch (err) {
      setStatus(WebSocketConnectionStatus.ERROR);
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, [client, isAuthenticated, token, user]);
  
  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (client) {
      client.disconnect();
      setStatus(WebSocketConnectionStatus.DISCONNECTED);
    }
  }, [client]);
  
  // Send encrypted message to another agent
  const sendMessage = useCallback(async (message: AgentMessage): Promise<boolean> => {
    if (!client) {
      const err = new Error('WebSocket client not initialized');
      setError(err);
      return false;
    }
    
    if (status !== WebSocketConnectionStatus.CONNECTED) {
      const err = new Error('WebSocket not connected');
      setError(err);
      return false;
    }
    
    try {
      return await client.sendMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, [client, status]);
  
  // Register a message handler
  const registerHandler = useCallback((handler: WebSocketHandler) => {
    if (!handler || !handler.eventType || typeof handler.handler !== 'function') {
      console.error('Invalid handler');
      return;
    }
    
    handlersRef.current.register(handler.eventType, handler.handler);
    
    if (client) {
      client.registerHandler(handler);
    }
  }, [client]);
  
  // Unregister a message handler
  const unregisterHandler = useCallback((eventType: string) => {
    handlersRef.current.unregister(eventType);
    
    if (client) {
      client.unregisterHandler(eventType);
    }
  }, [client]);
  
  // Update agent presence status
  const updatePresence = useCallback((status: string) => {
    if (client && client.getConnectionStatus() === WebSocketConnectionStatus.CONNECTED) {
      client.updatePresence(status);
    }
  }, [client]);
  
  // Send typing indicator for real-time feedback
  const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean) => {
    if (client && client.getConnectionStatus() === WebSocketConnectionStatus.CONNECTED) {
      client.sendTypingIndicator(conversationId, isTyping);
    }
  }, [client]);
  
  // Get current connection status
  const getConnectionStatus = useCallback(() => {
    if (client) {
      return client.getConnectionStatus();
    }
    return status;
  }, [client, status]);
  
  // Automatically connect/disconnect based on authentication state
  useEffect(() => {
    if (isAuthenticated && token && client && status === WebSocketConnectionStatus.DISCONNECTED) {
      connect().catch(err => {
        console.error('Failed to connect WebSocket:', err);
      });
    } else if (!isAuthenticated && status === WebSocketConnectionStatus.CONNECTED) {
      disconnect();
    }
  }, [isAuthenticated, token, client, status, connect, disconnect]);
  
  // Register handlers when client changes
  useEffect(() => {
    if (client) {
      const allHandlers = handlersRef.current.getAllHandlers();
      for (const handler of allHandlers) {
        client.registerHandler(handler);
      }
    }
  }, [client]);
  
  return {
    client,
    status,
    error,
    connect,
    disconnect,
    sendMessage,
    registerHandler,
    unregisterHandler,
    updatePresence,
    sendTypingIndicator,
    getConnectionStatus
  };
}