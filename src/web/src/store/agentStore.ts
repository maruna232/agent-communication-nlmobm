import { create } from 'zustand'; // ^4.4.0
import { persist, createJSONStorage } from 'zustand/middleware'; // ^4.4.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import {
  Agent,
  AgentConfiguration,
  AgentConversation,
  AgentMessage,
  AgentApprovalRequest,
  AgentState,
  AgentError,
  ApprovalStatus
} from '../lib/types/agent.types';
import { createAgentError } from '../lib/utils/errorHandling';
import {
  connectWebSocket,
  disconnectWebSocket,
  sendMessage
} from '../lib/websocket/socketClient';
import {
  getFromStorage,
  saveToStorage,
  updateInStorage,
  deleteFromStorage
} from '../lib/storage/indexedDB';
import { processUserCommand } from '../lib/api/openai.api';

/**
 * Creates a slice of the agent store related to agent state and operations
 */
const createAgentSlice = (set, get) => ({
  // State properties
  currentAgent: null,
  loading: false,
  error: null,
  
  // Actions
  setCurrentAgent: (agent: Agent | null) => set({ currentAgent: agent }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: AgentError | null) => set({ error })
});

/**
 * Creates a slice of the agent store related to agent operations
 */
const createAgentOperationsSlice = (set, get) => ({
  fetchUserAgent: async (userId: string): Promise<Agent | null> => {
    const { setLoading, setError, setCurrentAgent } = get();
    
    try {
      setLoading(true);
      setError(null);
      
      // Query local storage for the agent with the matching userId
      const agents = await getFromStorage('agents', null, 'userId', userId);
      
      if (agents && agents.length > 0) {
        const agent = agents[0];
        setCurrentAgent(agent);
        return agent;
      }
      
      setCurrentAgent(null);
      return null;
    } catch (error) {
      const agentError = createAgentError(`Failed to fetch agent for user: ${error.message}`, { userId });
      setError(agentError);
      return null;
    } finally {
      setLoading(false);
    }
  },
  
  createNewAgent: async (userId: string, config: AgentConfiguration): Promise<Agent> => {
    const { setLoading, setError, setCurrentAgent } = get();
    
    try {
      setLoading(true);
      setError(null);
      
      const agentId = uuidv4();
      const now = new Date();
      
      const newAgent: Agent = {
        agentId,
        userId,
        name: config.communicationStyle?.formality === 'FORMAL' ? 
          `${userId}'s Assistant` : `${userId}'s Agent`,
        configuration: config,
        status: 'offline',
        created: now,
        updated: now
      };
      
      // Save to local storage
      await saveToStorage('agents', newAgent);
      
      setCurrentAgent(newAgent);
      return newAgent;
    } catch (error) {
      const agentError = createAgentError(`Failed to create new agent: ${error.message}`, { userId });
      setError(agentError);
      throw error;
    } finally {
      setLoading(false);
    }
  },
  
  updateAgentConfig: async (agentId: string, config: AgentConfiguration): Promise<Agent> => {
    const { setLoading, setError, setCurrentAgent } = get();
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the current agent
      const agent = await getFromStorage('agents', agentId);
      
      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }
      
      // Update the agent configuration
      const updatedAgent: Agent = {
        ...agent,
        configuration: {
          ...agent.configuration,
          ...config
        },
        updated: new Date()
      };
      
      // Save to local storage
      await updateInStorage('agents', agentId, updatedAgent);
      
      setCurrentAgent(updatedAgent);
      return updatedAgent;
    } catch (error) {
      const agentError = createAgentError(`Failed to update agent configuration: ${error.message}`, { agentId });
      setError(agentError);
      throw error;
    } finally {
      setLoading(false);
    }
  },
  
  processCommand: async (command: string): Promise<{ response: string, action?: any }> => {
    const { currentAgent, setLoading, setError } = get();
    
    if (!currentAgent) {
      throw createAgentError('No agent configured', { command });
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Process the command using OpenAI API
      const result = await processUserCommand(command, {
        agentName: currentAgent.name,
        userPreferences: {
          schedulingPreferences: currentAgent.configuration.schedulingPreferences,
          locationPreferences: currentAgent.configuration.locationPreferences,
          communicationStyle: currentAgent.configuration.communicationStyle
        }
      });
      
      return result;
    } catch (error) {
      const agentError = createAgentError(`Failed to process command: ${error.message}`, { command });
      setError(agentError);
      throw error;
    } finally {
      setLoading(false);
    }
  }
});

/**
 * Creates a slice of the agent store related to agent conversations
 */
const createConversationSlice = (set, get) => ({
  // State properties
  conversations: [],
  currentConversation: null,
  
  // Actions
  setConversations: (conversations: AgentConversation[]) => set({ conversations }),
  setCurrentConversation: (conversation: AgentConversation | null) => set({ currentConversation: conversation }),
  
  fetchConversations: async (agentId: string): Promise<AgentConversation[]> => {
    const { setLoading, setError, setConversations } = get();
    
    try {
      setLoading(true);
      setError(null);
      
      // Query local storage for conversations involving this agent
      const initiatorConversations = await getFromStorage('conversations', null, 'initiatorAgentId', agentId);
      const recipientConversations = await getFromStorage('conversations', null, 'recipientAgentId', agentId);
      
      // Combine and deduplicate conversations
      const allConversations = [...(initiatorConversations || []), ...(recipientConversations || [])];
      const uniqueConversations = Array.from(
        new Map(allConversations.map(conv => [conv.conversationId, conv])).values()
      );
      
      setConversations(uniqueConversations);
      return uniqueConversations;
    } catch (error) {
      const agentError = createAgentError(`Failed to fetch conversations: ${error.message}`, { agentId });
      setError(agentError);
      return [];
    } finally {
      setLoading(false);
    }
  },
  
  fetchConversation: async (conversationId: string): Promise<AgentConversation | null> => {
    const { setLoading, setError, setCurrentConversation } = get();
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the conversation from local storage
      const conversation = await getFromStorage('conversations', conversationId);
      
      setCurrentConversation(conversation);
      return conversation;
    } catch (error) {
      const agentError = createAgentError(`Failed to fetch conversation: ${error.message}`, { conversationId });
      setError(agentError);
      return null;
    } finally {
      setLoading(false);
    }
  },
  
  startConversation: async (initiatorAgentId: string, recipientAgentId: string, context: any): Promise<AgentConversation> => {
    const { setLoading, setError, setCurrentConversation, conversations, setConversations, connectWebSocketClient } = get();
    
    try {
      setLoading(true);
      setError(null);
      
      const conversationId = uuidv4();
      const now = new Date();
      
      const newConversation: AgentConversation = {
        conversationId,
        initiatorAgentId,
        recipientAgentId,
        messages: [],
        status: 'active',
        created: now,
        updated: now,
        metadata: {
          purpose: context.purpose || 'general',
          context: context,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
        }
      };
      
      // Save to local storage
      await saveToStorage('conversations', newConversation);
      
      // Connect to WebSocket for real-time communication
      if (context.authToken) {
        await connectWebSocketClient(initiatorAgentId, context.authToken);
      }
      
      // Update the conversations list
      const updatedConversations = [...conversations, newConversation];
      setConversations(updatedConversations);
      
      setCurrentConversation(newConversation);
      return newConversation;
    } catch (error) {
      const agentError = createAgentError(`Failed to start conversation: ${error.message}`, { 
        initiatorAgentId, 
        recipientAgentId 
      });
      setError(agentError);
      throw error;
    } finally {
      setLoading(false);
    }
  },
  
  sendConversationMessage: async (conversationId: string, senderId: string, messageType: string, content: any): Promise<AgentMessage> => {
    const { setLoading, setError, currentConversation, setCurrentConversation, conversations, setConversations } = get();
    
    try {
      setLoading(true);
      setError(null);
      
      // Generate a unique message ID
      const messageId = uuidv4();
      
      // Fetch the conversation to get the recipient ID
      const conversation = currentConversation && currentConversation.conversationId === conversationId
        ? currentConversation
        : await getFromStorage('conversations', conversationId);
      
      if (!conversation) {
        throw new Error(`Conversation with ID ${conversationId} not found`);
      }
      
      const recipientId = conversation.initiatorAgentId === senderId
        ? conversation.recipientAgentId
        : conversation.initiatorAgentId;
      
      // Create the message object
      const newMessage: AgentMessage = {
        messageId,
        conversationId,
        senderId,
        recipientId,
        messageType,
        content,
        timestamp: Date.now(),
        metadata: {
          priority: 'normal',
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
          encrypted: true,
          requiresResponse: true
        }
      };
      
      // Send the message via WebSocket
      await sendMessage(newMessage);
      
      // Update the conversation with the new message
      const updatedMessages = [...conversation.messages, newMessage];
      const updatedConversation = {
        ...conversation,
        messages: updatedMessages,
        updated: new Date()
      };
      
      // Save to local storage
      await updateInStorage('conversations', conversationId, updatedConversation);
      
      // Update the state
      setCurrentConversation(updatedConversation);
      
      // Update the conversations list
      const updatedConversations = conversations.map(c => 
        c.conversationId === conversationId ? updatedConversation : c
      );
      setConversations(updatedConversations);
      
      return newMessage;
    } catch (error) {
      const agentError = createAgentError(`Failed to send message: ${error.message}`, { conversationId, senderId });
      setError(agentError);
      throw error;
    } finally {
      setLoading(false);
    }
  }
});

/**
 * Creates a slice of the agent store related to approval requests
 */
const createApprovalSlice = (set, get) => ({
  // State properties
  approvalRequests: [],
  
  // Actions
  setApprovalRequests: (requests: AgentApprovalRequest[]) => set({ approvalRequests: requests }),
  
  fetchApprovalRequests: async (userId: string): Promise<AgentApprovalRequest[]> => {
    const { setLoading, setError, setApprovalRequests } = get();
    
    try {
      setLoading(true);
      setError(null);
      
      // Query local storage for approval requests for this user
      const requests = await getFromStorage('approvalRequests', null, 'userId', userId);
      
      setApprovalRequests(requests || []);
      return requests || [];
    } catch (error) {
      const agentError = createAgentError(`Failed to fetch approval requests: ${error.message}`, { userId });
      setError(agentError);
      return [];
    } finally {
      setLoading(false);
    }
  },
  
  createApprovalReq: async (agentId: string, userId: string, type: string, data: any, conversationId?: string): Promise<AgentApprovalRequest> => {
    const { setLoading, setError, approvalRequests, setApprovalRequests } = get();
    
    try {
      setLoading(true);
      setError(null);
      
      const requestId = uuidv4();
      const now = new Date();
      
      const newRequest: AgentApprovalRequest = {
        requestId,
        agentId,
        userId,
        type,
        data,
        status: 'pending',
        conversationId: conversationId || '',
        created: now,
        updated: now,
        expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours from now
      };
      
      // Save to local storage
      await saveToStorage('approvalRequests', newRequest);
      
      // Update the state
      const updatedRequests = [...approvalRequests, newRequest];
      setApprovalRequests(updatedRequests);
      
      return newRequest;
    } catch (error) {
      const agentError = createAgentError(`Failed to create approval request: ${error.message}`, { agentId, userId });
      setError(agentError);
      throw error;
    } finally {
      setLoading(false);
    }
  },
  
  respondToApproval: async (requestId: string, status: ApprovalStatus, modifiedData?: any): Promise<AgentApprovalRequest> => {
    const { setLoading, setError, approvalRequests, setApprovalRequests } = get();
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the approval request
      const request = await getFromStorage('approvalRequests', requestId);
      
      if (!request) {
        throw new Error(`Approval request with ID ${requestId} not found`);
      }
      
      // Update the request
      const updatedRequest: AgentApprovalRequest = {
        ...request,
        status,
        data: modifiedData || request.data,
        updated: new Date()
      };
      
      // Save to local storage
      await updateInStorage('approvalRequests', requestId, updatedRequest);
      
      // Update the state
      const updatedRequests = approvalRequests.map(r => 
        r.requestId === requestId ? updatedRequest : r
      );
      setApprovalRequests(updatedRequests);
      
      // If approved, execute the appropriate action based on request type
      if (status === 'approved') {
        switch (updatedRequest.type) {
          case 'meeting_proposal':
            // In a real implementation, this would create a calendar event
            // or perform other scheduling actions
            break;
          case 'connection_request':
            // In a real implementation, this would establish a connection
            // between agents
            break;
        }
      }
      
      return updatedRequest;
    } catch (error) {
      const agentError = createAgentError(`Failed to respond to approval request: ${error.message}`, { requestId });
      setError(agentError);
      throw error;
    } finally {
      setLoading(false);
    }
  }
});

/**
 * Creates a slice of the agent store related to WebSocket connections
 */
const createWebSocketSlice = (set, get) => ({
  // State properties
  connected: false,
  
  // Actions
  setConnected: (connected: boolean) => set({ connected }),
  
  connectWebSocketClient: async (agentId: string, authToken: string): Promise<boolean> => {
    const { setLoading, setError, setConnected } = get();
    
    try {
      setLoading(true);
      setError(null);
      
      // Connect to WebSocket server
      await connectWebSocket({ 
        token: authToken, 
        agentId, 
        publicKey: 'simulated-public-key' // In a real implementation, this would be an actual cryptographic key
      });
      
      setConnected(true);
      return true;
    } catch (error) {
      const agentError = createAgentError(`Failed to connect to WebSocket server: ${error.message}`, { agentId });
      setError(agentError);
      return false;
    } finally {
      setLoading(false);
    }
  },
  
  disconnectWebSocketClient: async (agentId: string): Promise<void> => {
    const { setLoading, setConnected } = get();
    
    try {
      setLoading(true);
      
      // Disconnect from WebSocket server
      await disconnectWebSocket(agentId);
      
      setConnected(false);
    } catch (error) {
      console.error('Error disconnecting from WebSocket:', error);
    } finally {
      setLoading(false);
    }
  }
});

/**
 * Global state store for agent-related functionality
 * 
 * Uses Zustand for state management with persistence middleware
 * to maintain state across sessions while ensuring privacy-first
 * and local-first data storage.
 */
const useAgentStore = create(
  persist(
    (set, get) => ({
      ...createAgentSlice(set, get),
      ...createAgentOperationsSlice(set, get),
      ...createConversationSlice(set, get),
      ...createApprovalSlice(set, get),
      ...createWebSocketSlice(set, get)
    }),
    {
      name: 'agent-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive parts of the state
      partialize: (state) => ({
        currentAgent: state.currentAgent,
        conversations: state.conversations,
        approvalRequests: state.approvalRequests
      })
    }
  )
);

export { useAgentStore };