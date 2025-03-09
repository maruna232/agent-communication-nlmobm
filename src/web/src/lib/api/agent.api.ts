/**
 * Agent API
 * 
 * Provides a client-side API for interacting with AI agents in the AI Agent Network.
 * This module implements functions for creating, configuring, and managing agents,
 * as well as handling agent-to-agent communication, scheduling negotiations, and
 * user approval workflows while maintaining the privacy-first approach of the application.
 */

import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import {
  Agent,
  AgentConfiguration,
  AgentStatus,
  AgentMessage,
  AgentConversation,
  AgentApprovalRequest,
  CreateAgentRequest,
  UpdateAgentRequest
} from '../types/agent.types';
import { IAuthToken } from '../types/auth.types';
import { WebSocketAuthPayload } from '../types/websocket.types';
import { AGENT_STATUS, API_ENDPOINTS } from '../constants';
import { createAgentError } from '../utils/errorHandling';
import { validateAgentConfiguration, validateAgentMessage } from '../utils/validation';
import {
  generateAgentResponse,
  processAgentCommand,
  generateAgentToAgentMessage
} from './openai.api';
import {
  createWebSocketClient,
  WebSocketClientInterface
} from './websocket.api';

// Store WebSocket client instances by agent ID
const webSocketClients: Record<string, WebSocketClientInterface> = {};

// In-memory cache for conversations (in a real implementation, this would use IndexedDB)
const conversationCache: Record<string, AgentConversation> = {};
const approvalRequestCache: Record<string, AgentApprovalRequest> = {};

/**
 * Creates a new agent for a user with the specified configuration
 * 
 * @param userId - User ID to associate with the agent
 * @param config - Agent configuration options
 * @returns Newly created agent object
 */
export async function createAgent(
  userId: string,
  config: {
    name: string;
    configuration: AgentConfiguration;
  }
): Promise<Agent> {
  try {
    // Validate agent configuration
    const { isValid, errors } = validateAgentConfiguration(config.configuration);
    if (!isValid) {
      throw createAgentError('Invalid agent configuration', { validationErrors: errors });
    }

    // Generate a unique agent ID
    const agentId = uuidv4();

    // Create agent request payload
    const createRequest: CreateAgentRequest = {
      userId,
      name: config.name,
      configuration: config.configuration
    };

    // Make API request to create the agent
    const response = await fetch(`${API_ENDPOINTS.AGENT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw createAgentError(`Failed to create agent: ${errorData.message || 'Unknown error'}`, {
        statusCode: response.status,
        errorData
      });
    }

    const agent: Agent = await response.json();
    return agent;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to create agent: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Retrieves an agent by its ID
 * 
 * @param agentId - ID of the agent to retrieve
 * @returns Agent object if found
 */
export async function getAgent(agentId: string): Promise<Agent> {
  try {
    const response = await fetch(`${API_ENDPOINTS.AGENT}/${agentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw createAgentError(`Failed to retrieve agent: ${errorData.message || 'Unknown error'}`, {
        statusCode: response.status,
        errorData
      });
    }

    const agent: Agent = await response.json();
    return agent;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to retrieve agent: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Retrieves the agent associated with a user
 * 
 * @param userId - ID of the user
 * @returns User's agent object if found
 */
export async function getUserAgent(userId: string): Promise<Agent> {
  try {
    const response = await fetch(`${API_ENDPOINTS.AGENT}/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw createAgentError(`Failed to retrieve user's agent: ${errorData.message || 'Unknown error'}`, {
        statusCode: response.status,
        errorData
      });
    }

    const agent: Agent = await response.json();
    return agent;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to retrieve user's agent: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Updates an existing agent's configuration or status
 * 
 * @param agentId - ID of the agent to update
 * @param updates - Agent properties to update
 * @returns Updated agent object
 */
export async function updateAgent(
  agentId: string,
  updates: {
    name?: string;
    configuration?: Partial<AgentConfiguration>;
    status?: AgentStatus;
  }
): Promise<Agent> {
  try {
    // Validate configuration updates if provided
    if (updates.configuration) {
      const { isValid, errors } = validateAgentConfiguration(updates.configuration);
      if (!isValid) {
        throw createAgentError('Invalid agent configuration', { validationErrors: errors });
      }
    }

    // Create update request
    const updateRequest: UpdateAgentRequest = {
      agentId,
      name: updates.name || '', // The server will ignore this if it's empty
      configuration: updates.configuration || {},
      status: updates.status || AGENT_STATUS.ONLINE
    };

    // Make API request to update the agent
    const response = await fetch(`${API_ENDPOINTS.AGENT}/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw createAgentError(`Failed to update agent: ${errorData.message || 'Unknown error'}`, {
        statusCode: response.status,
        errorData
      });
    }

    const agent: Agent = await response.json();
    return agent;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to update agent: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Updates an agent's status (online, offline, busy)
 * 
 * @param agentId - ID of the agent to update
 * @param status - New status for the agent
 * @returns Updated agent object
 */
export async function updateAgentStatus(
  agentId: string,
  status: AgentStatus
): Promise<Agent> {
  try {
    // Validate status is a valid AgentStatus
    if (!Object.values(AGENT_STATUS).includes(status)) {
      throw createAgentError(`Invalid agent status: ${status}`, {
        validStatus: Object.values(AGENT_STATUS)
      });
    }

    // Make API request to update the agent status
    const response = await fetch(`${API_ENDPOINTS.AGENT}/${agentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw createAgentError(`Failed to update agent status: ${errorData.message || 'Unknown error'}`, {
        statusCode: response.status,
        errorData
      });
    }

    const agent: Agent = await response.json();
    return agent;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to update agent status: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Deletes an agent
 * 
 * @param agentId - ID of the agent to delete
 * @returns True if deletion was successful
 */
export async function deleteAgent(agentId: string): Promise<boolean> {
  try {
    // Disconnect WebSocket if connected
    if (webSocketClients[agentId]) {
      await disconnectAgentWebSocket(agentId);
    }

    // Make API request to delete the agent
    const response = await fetch(`${API_ENDPOINTS.AGENT}/${agentId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw createAgentError(`Failed to delete agent: ${errorData.message || 'Unknown error'}`, {
        statusCode: response.status,
        errorData
      });
    }

    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to delete agent: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Processes a natural language command through the agent
 * 
 * @param agentId - ID of the agent to process the command
 * @param command - Natural language command to process
 * @param context - Additional context for command processing
 * @returns Result of the command processing
 */
export async function processCommand(
  agentId: string,
  command: string,
  context: Record<string, any> = {}
): Promise<object> {
  try {
    // Get the agent to access its configuration
    const agent = await getAgent(agentId);

    // Create a command object
    const commandObj = {
      commandId: uuidv4(),
      command,
      parameters: context,
      status: 'PENDING',
      created: new Date(),
      updated: new Date()
    };

    // Process the command using OpenAI API
    const result = await processAgentCommand(commandObj, {
      userPreferences: agent.configuration,
      constraints: context.constraints || {}
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to process command: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Gets a natural language response from the agent
 * 
 * @param agentId - ID of the agent to get response from
 * @param userInput - User's message or question
 * @param context - Additional context for response generation
 * @returns Agent's response to the user input
 */
export async function getAgentResponse(
  agentId: string,
  userInput: string,
  context: Record<string, any> = {}
): Promise<string> {
  try {
    // Get the agent to access its configuration
    const agent = await getAgent(agentId);

    // Generate a response using OpenAI API
    const response = await generateAgentResponse(userInput, {
      agentName: agent.name,
      userPreferences: agent.configuration,
      conversationHistory: context.conversationHistory || []
    });

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to get agent response: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Starts a conversation between two agents
 * 
 * @param initiatorAgentId - ID of the agent initiating the conversation
 * @param recipientAgentId - ID of the recipient agent
 * @param context - Additional context for the conversation
 * @returns Newly created conversation object
 */
export async function startConversation(
  initiatorAgentId: string,
  recipientAgentId: string,
  context: Record<string, any> = {}
): Promise<AgentConversation> {
  try {
    // Verify that both agents exist
    await Promise.all([
      getAgent(initiatorAgentId),
      getAgent(recipientAgentId)
    ]);

    // Generate a unique conversation ID
    const conversationId = uuidv4();

    // Create a new conversation object
    const conversation: AgentConversation = {
      conversationId,
      initiatorAgentId,
      recipientAgentId,
      messages: [],
      status: 'ACTIVE',
      created: new Date(),
      updated: new Date(),
      metadata: {
        purpose: context.purpose || 'general',
        context: context,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
      }
    };

    // Store the conversation in memory cache
    // In a real implementation, this would use IndexedDB
    conversationCache[conversationId] = conversation;

    return conversation;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to start conversation: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Retrieves a conversation by its ID
 * 
 * @param conversationId - ID of the conversation to retrieve
 * @returns Conversation object if found
 */
export async function getConversation(conversationId: string): Promise<AgentConversation> {
  try {
    // In a real implementation, this would retrieve from IndexedDB
    // For now, use the in-memory cache
    const conversation = conversationCache[conversationId];
    
    if (!conversation) {
      throw createAgentError('Conversation not found', { conversationId });
    }
    
    return conversation;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to retrieve conversation: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Retrieves all conversations for an agent
 * 
 * @param agentId - ID of the agent
 * @returns Array of conversation objects
 */
export async function getAgentConversations(agentId: string): Promise<AgentConversation[]> {
  try {
    // In a real implementation, this would query IndexedDB
    // For now, filter the in-memory cache
    return Object.values(conversationCache).filter(
      conversation => 
        conversation.initiatorAgentId === agentId || 
        conversation.recipientAgentId === agentId
    );
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to retrieve agent conversations: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Sends a message from one agent to another
 * 
 * @param conversationId - ID of the conversation
 * @param senderId - ID of the sending agent
 * @param messageType - Type of message (QUERY, PROPOSAL, etc.)
 * @param content - Message content
 * @returns Sent message object
 */
export async function sendAgentMessage(
  conversationId: string,
  senderId: string,
  messageType: string,
  content: any
): Promise<AgentMessage> {
  try {
    // Get the conversation to determine the recipient
    const conversation = await getConversation(conversationId);
    
    // Determine recipient ID based on sender
    const recipientId = conversation.initiatorAgentId === senderId
      ? conversation.recipientAgentId
      : conversation.initiatorAgentId;
    
    // Generate a unique message ID
    const messageId = uuidv4();
    
    // Create the message object
    const message: AgentMessage = {
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
    
    // Validate the message structure
    const { isValid, errors } = validateAgentMessage(message);
    if (!isValid) {
      throw createAgentError('Invalid agent message', { validationErrors: errors });
    }
    
    // Get the WebSocket client for the sender
    const webSocketClient = webSocketClients[senderId];
    if (!webSocketClient) {
      throw createAgentError('Agent not connected to WebSocket', { agentId: senderId });
    }
    
    // Send the message through WebSocket
    const sent = await webSocketClient.sendMessage(message);
    if (!sent) {
      throw createAgentError('Failed to send message', { message });
    }
    
    // Add the message to the conversation in memory cache
    // In a real implementation, this would update IndexedDB
    conversation.messages.push(message);
    conversation.updated = new Date();
    conversationCache[conversationId] = conversation;
    
    return message;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to send agent message: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Generates a message from one agent to another using AI
 * 
 * @param conversationId - ID of the conversation
 * @param senderId - ID of the sending agent
 * @param context - Additional context for message generation
 * @returns Generated message object
 */
export async function generateAgentMessage(
  conversationId: string,
  senderId: string,
  context: Record<string, any> = {}
): Promise<AgentMessage> {
  try {
    // Get the conversation
    const conversation = await getConversation(conversationId);
    
    // Get the sender agent
    const senderAgent = await getAgent(senderId);
    
    // Determine recipient ID based on sender
    const recipientId = conversation.initiatorAgentId === senderId
      ? conversation.recipientAgentId
      : conversation.initiatorAgentId;
    
    // Get the recipient agent
    const recipientAgent = await getAgent(recipientId);
    
    // Get conversation history
    const conversationHistory = conversation.messages.map(msg => ({
      senderId: msg.senderId,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp: msg.timestamp
    }));
    
    // Generate message content using OpenAI API
    const generatedContent = await generateAgentToAgentMessage(
      {
        agentId: senderAgent.agentId,
        name: senderAgent.name,
        preferences: senderAgent.configuration
      },
      {
        agentId: recipientAgent.agentId,
        name: recipientAgent.name,
        preferences: recipientAgent.configuration
      },
      conversationHistory,
      {
        purpose: conversation.metadata.purpose,
        parameters: context
      }
    );
    
    // Send the generated message
    return await sendAgentMessage(
      conversationId,
      senderId,
      'MESSAGE',
      generatedContent
    );
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to generate agent message: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Connects an agent to the WebSocket server for real-time communication
 * 
 * @param agentId - ID of the agent to connect
 * @param authToken - Authentication token
 * @returns True if connection was successful
 */
export async function connectAgentWebSocket(
  agentId: string,
  authToken: IAuthToken
): Promise<boolean> {
  try {
    // Get the agent
    const agent = await getAgent(agentId);
    
    // Create a WebSocket client
    const webSocketClient = createWebSocketClient();
    
    // Store the client instance
    webSocketClients[agentId] = webSocketClient;
    
    // Create authentication payload
    const authPayload: WebSocketAuthPayload = {
      token: authToken.token,
      agentId: agent.agentId,
      publicKey: agent.publicKey
    };
    
    // Connect to the WebSocket server
    const authResult = await webSocketClient.connect(authPayload);
    
    if (!authResult.authenticated) {
      throw createAgentError(`WebSocket authentication failed: ${authResult.error || 'Unknown error'}`, {
        authResult
      });
    }
    
    // Register message handlers
    webSocketClient.registerHandler({
      eventType: 'message',
      handler: handleIncomingMessage
    });
    
    // Update agent status to ONLINE
    await updateAgentStatus(agentId, AGENT_STATUS.ONLINE);
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to connect agent to WebSocket: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Disconnects an agent from the WebSocket server
 * 
 * @param agentId - ID of the agent to disconnect
 */
export async function disconnectAgentWebSocket(agentId: string): Promise<void> {
  try {
    // Get the WebSocket client
    const webSocketClient = webSocketClients[agentId];
    if (!webSocketClient) {
      return; // Already disconnected
    }
    
    // Disconnect from the WebSocket server
    webSocketClient.disconnect();
    
    // Remove the client instance
    delete webSocketClients[agentId];
    
    // Update agent status to OFFLINE
    await updateAgentStatus(agentId, AGENT_STATUS.OFFLINE);
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to disconnect agent from WebSocket: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Creates a new approval request for user decision
 * 
 * @param agentId - ID of the agent creating the request
 * @param userId - ID of the user to approve the request
 * @param type - Type of approval request
 * @param data - Data for the approval request
 * @param conversationId - Related conversation ID
 * @returns Created approval request object
 */
export async function createApprovalRequest(
  agentId: string,
  userId: string,
  type: string,
  data: any,
  conversationId?: string
): Promise<AgentApprovalRequest> {
  try {
    // Generate a unique request ID
    const requestId = uuidv4();
    
    // Create the approval request object
    const approvalRequest: AgentApprovalRequest = {
      requestId,
      agentId,
      userId,
      type,
      data,
      status: 'PENDING',
      conversationId: conversationId || '',
      created: new Date(),
      updated: new Date(),
      expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours from now
    };
    
    // Store the approval request in memory cache
    // In a real implementation, this would use IndexedDB
    approvalRequestCache[requestId] = approvalRequest;
    
    // Trigger a notification to the user
    // This would use a notification service in a real implementation
    console.log(`Notification: New approval request (${requestId}) for user ${userId}`);
    
    return approvalRequest;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to create approval request: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Retrieves an approval request by its ID
 * 
 * @param requestId - ID of the approval request
 * @returns Approval request object if found
 */
export async function getApprovalRequest(requestId: string): Promise<AgentApprovalRequest> {
  try {
    // In a real implementation, this would retrieve from IndexedDB
    // For now, use the in-memory cache
    const approvalRequest = approvalRequestCache[requestId];
    
    if (!approvalRequest) {
      throw createAgentError('Approval request not found', { requestId });
    }
    
    return approvalRequest;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to retrieve approval request: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Retrieves all approval requests for a user
 * 
 * @param userId - ID of the user
 * @returns Array of approval request objects
 */
export async function getUserApprovalRequests(userId: string): Promise<AgentApprovalRequest[]> {
  try {
    // In a real implementation, this would query IndexedDB
    // For now, filter the in-memory cache
    return Object.values(approvalRequestCache).filter(
      request => request.userId === userId
    );
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to retrieve user approval requests: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Updates the status of an approval request
 * 
 * @param requestId - ID of the approval request
 * @param status - New status for the request
 * @param modifiedData - Modified data if status is 'MODIFIED'
 * @returns Updated approval request object
 */
export async function updateApprovalRequest(
  requestId: string,
  status: string,
  modifiedData?: any
): Promise<AgentApprovalRequest> {
  try {
    // Get the approval request
    const approvalRequest = await getApprovalRequest(requestId);
    
    // Update the status
    approvalRequest.status = status;
    approvalRequest.updated = new Date();
    
    // Update data if modified
    if (status === 'MODIFIED' && modifiedData) {
      approvalRequest.data = modifiedData;
    }
    
    // Store the updated approval request in memory cache
    // In a real implementation, this would update IndexedDB
    approvalRequestCache[requestId] = approvalRequest;
    
    // Process the approval based on status
    if (status === 'APPROVED') {
      // Handle approval (e.g., create calendar event)
      // This would use various services in a real implementation
      
      // For scheduling approvals:
      if (approvalRequest.type === 'MEETING_PROPOSAL' && approvalRequest.conversationId) {
        await sendAgentMessage(
          approvalRequest.conversationId,
          approvalRequest.agentId,
          'CONFIRMATION',
          {
            proposalId: approvalRequest.data.proposalId,
            status: 'ACCEPTED',
            calendarEventId: uuidv4() // In real implementation, this would be the actual created event ID
          }
        );
      }
    } else if (status === 'REJECTED') {
      // Handle rejection (e.g., notify other agent)
      
      // If there's a conversation, send a rejection message
      if (approvalRequest.conversationId) {
        await sendAgentMessage(
          approvalRequest.conversationId,
          approvalRequest.agentId,
          'REJECTION',
          {
            proposalId: approvalRequest.data.proposalId,
            reason: 'User rejected the proposal'
          }
        );
      }
    } else if (status === 'MODIFIED') {
      // Handle modification (e.g., restart negotiation with modified data)
      
      // If there's a conversation, send a modified proposal
      if (approvalRequest.conversationId) {
        await sendAgentMessage(
          approvalRequest.conversationId,
          approvalRequest.agentId,
          'PROPOSAL',
          {
            proposalId: uuidv4(),
            details: modifiedData
          }
        );
      }
    }
    
    return approvalRequest;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to update approval request: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Handles incoming messages from other agents
 * 
 * @param message - The received message
 */
export async function handleIncomingMessage(message: AgentMessage): Promise<void> {
  try {
    // Validate the message
    const { isValid, errors } = validateAgentMessage(message);
    if (!isValid) {
      throw createAgentError('Invalid incoming message', { validationErrors: errors });
    }
    
    // Find or create a conversation for this message
    let conversation: AgentConversation;
    try {
      conversation = await getConversation(message.conversationId);
    } catch (error) {
      // Conversation doesn't exist, create a new one
      conversation = await startConversation(
        message.senderId,
        message.recipientId,
        { purpose: 'Received message' }
      );
    }
    
    // Add the message to the conversation in memory cache
    // In a real implementation, this would update IndexedDB
    conversation.messages.push(message);
    conversation.updated = new Date();
    conversationCache[message.conversationId] = conversation;
    
    // Process the message based on type
    switch (message.messageType) {
      case 'QUERY':
        // Get the recipient agent
        const recipientAgent = await getAgent(message.recipientId);
        
        // Generate a response message
        await generateAgentMessage(
          message.conversationId,
          message.recipientId,
          { query: message.content }
        );
        break;
        
      case 'PROPOSAL':
        // Get the recipient agent
        const proposalRecipientAgent = await getAgent(message.recipientId);
        
        // Create an approval request for the user
        await createApprovalRequest(
          message.recipientId,
          proposalRecipientAgent.userId,
          'MEETING_PROPOSAL',
          message.content,
          message.conversationId
        );
        break;
        
      case 'CONFIRMATION':
        // Handle confirmation (e.g., create calendar event)
        console.log(`Meeting confirmed: ${JSON.stringify(message.content)}`);
        // In a real implementation, this would create a calendar event
        break;
        
      case 'REJECTION':
        // Handle rejection (e.g., notify user)
        console.log(`Meeting rejected: ${JSON.stringify(message.content)}`);
        // In a real implementation, this would notify the user
        break;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to handle incoming message: ${error.message}`, {
        originalError: error
      });
    }
    throw error;
  }
}