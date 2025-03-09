/**
 * Agent Service
 * 
 * Implements the core agent service for the AI Agent Network, providing a high-level interface
 * for creating, configuring, and managing AI agents. This service orchestrates agent-to-agent
 * communication, natural language processing, scheduling negotiations, and user approval workflows
 * while maintaining the privacy-first approach of the application.
 */

import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import {
  Agent,
  AgentConfiguration,
  AgentMessage,
  AgentConversation,
  AgentApprovalRequest,
  AgentStatus,
  ApprovalType,
  ApprovalStatus,
  ICalendarEvent,
  createAgent,
  getAgent,
  updateAgent,
  updateAgentStatus,
  processCommand,
  startConversation,
  sendAgentMessage,
  generateAgentResponse,
  generateAgentToAgentMessage,
  analyzeSchedulingOptions,
  generateMeetingProposal,
  IndexedDBStorage,
  createWebSocketClient,
  WebSocketClientInterface,
  CalendarSyncManager,
  generateKeyPair,
  createAgentError,
  AGENT_STATUS,
  APPROVAL_TYPES,
  APPROVAL_STATUS
} from '../lib';

// Define constants for storage names
const AGENT_STORE_NAME = 'agents';
const CONVERSATION_STORE_NAME = 'conversations';
const APPROVAL_STORE_NAME = 'approval_requests';

/**
 * Service class for managing AI agents, their communication, and scheduling negotiations
 */
export class AgentService {
  private storage: IndexedDBStorage;
  private calendarManager: CalendarSyncManager;
  private webSocketClients: Record<string, WebSocketClientInterface> = {};
  private initialized: boolean = false;

  /**
   * Creates a new AgentService instance
   */
  constructor() {
    this.storage = null;
    this.calendarManager = null;
    this.webSocketClients = {};
    this.initialized = false;
  }

  /**
   * Initializes the agent service with required dependencies
   * @param storage IndexedDB storage instance
   * @param calendarManager CalendarSyncManager instance
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(storage: IndexedDBStorage, calendarManager: CalendarSyncManager): Promise<boolean> {
    // Store the provided dependencies
    this.storage = storage;
    this.calendarManager = calendarManager;

    // Check if the storage is initialized
    if (!this.storage.isInitialized()) {
      throw new Error('Storage must be initialized before initializing AgentService');
    }

    // Set the initialized flag to true
    this.initialized = true;

    // Return true if initialization was successful
    return true;
  }

  /**
   * Creates a new agent for a user with the specified configuration
   * @param userId User ID to associate with the agent
   * @param config Agent configuration options
   * @returns Promise resolving to the newly created agent
   */
  async createAgent(userId: string, config: AgentConfiguration): Promise<Agent> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before creating an agent');
    }

    // Generate a unique agent ID
    const agentId = uuidv4();

    // Generate encryption keys for the agent
    const { publicKey, privateKey } = generateKeyPair();

    // Create an agent object with the provided configuration
    const agent: Agent = {
      agentId,
      userId,
      name: config.name,
      configuration: config,
      publicKey,
      status: AGENT_STATUS.OFFLINE,
      lastActive: new Date(),
      created: new Date(),
      updated: new Date()
    };

    // Store the agent in the local database
    await this.storage.create(AGENT_STORE_NAME, agent);

    // Return the created agent
    return agent;
  }

  /**
   * Retrieves an agent by its ID
   * @param agentId ID of the agent to retrieve
   * @returns Promise resolving to the agent if found, null otherwise
   */
  async getAgent(agentId: string): Promise<Agent | null> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before retrieving an agent');
    }

    // Query the local database for the agent with the specified ID
    const agent = await this.storage.read(AGENT_STORE_NAME, agentId);

    // Return the agent if found, null otherwise
    return agent as Agent | null;
  }

  /**
   * Retrieves the agent associated with a user
   * @param userId ID of the user
   * @returns Promise resolving to the user's agent if found, null otherwise
   */
  async getUserAgent(userId: string): Promise<Agent | null> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before retrieving a user agent');
    }

    // Query the local database for agents with the specified user ID
    const agents = await this.storage.query({
      storeName: AGENT_STORE_NAME,
      indexName: 'userId',
      range: { lower: userId, upper: userId }
    });

    // Return the first agent found (users should have only one agent)
    return agents.length > 0 ? agents[0] as Agent : null;
  }

  /**
   * Updates an agent's configuration
   * @param agentId ID of the agent to update
   * @param config Partial agent configuration to update
   * @returns Promise resolving to the updated agent
   */
  async updateAgent(agentId: string, config: Partial<AgentConfiguration>): Promise<Agent> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before updating an agent');
    }

    // Retrieve the agent from the local database
    let agent = await this.getAgent(agentId);

    // If the agent doesn't exist, throw an error
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Merge the existing configuration with the provided updates
    agent = { ...agent, configuration: { ...agent.configuration, ...config } };

    // Update the agent in the local database
    await this.storage.update(AGENT_STORE_NAME, agentId, agent);

    // Return the updated agent
    return agent;
  }

  /**
   * Updates an agent's status (online, offline, busy)
   * @param agentId ID of the agent to update
   * @param status New status for the agent
   * @returns Promise resolving to the updated agent
   */
  async updateAgentStatus(agentId: string, status: AgentStatus): Promise<Agent> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before updating agent status');
    }

    // Retrieve the agent from the local database
    let agent = await this.getAgent(agentId);

    // If the agent doesn't exist, throw an error
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Update the agent's status
    agent.status = status;

    // Update the agent in the local database
    await this.storage.update(AGENT_STORE_NAME, agentId, agent);

    // If the agent is connected to WebSocket, update presence
    if (this.webSocketClients[agentId]) {
      this.webSocketClients[agentId].updatePresence(status);
    }

    // Return the updated agent
    return agent;
  }

  /**
   * Deletes an agent
   * @param agentId ID of the agent to delete
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before deleting an agent');
    }

    // Disconnect the agent from WebSocket if connected
    if (this.webSocketClients[agentId]) {
      await this.disconnectWebSocket(agentId);
    }

    // Delete the agent from the local database
    await this.storage.delete(AGENT_STORE_NAME, agentId);

    // Delete all conversations associated with the agent
    // TODO: Implement conversation deletion

    // Delete all approval requests associated with the agent
    // TODO: Implement approval request deletion

    // Return true if deletion was successful
    return true;
  }

  /**
   * Processes a natural language command through the agent
   * @param agentId ID of the agent to process the command
   * @param command Natural language command to process
   * @param context Additional context for command processing
   * @returns Promise resolving to the agent's response and any action details
   */
  async processCommand(agentId: string, command: string, context: any): Promise<{ response: string; action?: any }> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before processing a command');
    }

    // Retrieve the agent from the local database
    const agent = await this.getAgent(agentId);

    // If the agent doesn't exist, throw an error
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Process the command using OpenAI API
    const result = await processCommand(command, {
      userPreferences: agent.configuration,
      constraints: context.constraints || {}
    });

    // Determine if the command requires an action (e.g., scheduling)
    // TODO: Implement action determination logic

    // If scheduling is required, initiate the scheduling workflow
    // TODO: Implement scheduling workflow

    // Return the agent's response and any action details
    return { response: result.response, action: result.action };
  }

  /**
   * Gets a natural language response from the agent
   * @param agentId ID of the agent to get response from
   * @param userInput User's message or question
   * @param context Additional context for response generation
   * @returns Promise resolving to the agent's response to the user input
   */
  async getAgentResponse(agentId: string, userInput: string, context: any): Promise<string> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before getting a response');
    }

    // Retrieve the agent from the local database
    const agent = await this.getAgent(agentId);

    // If the agent doesn't exist, throw an error
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Generate a response using OpenAI API
    const response = await generateAgentResponse(userInput, {
      agentName: agent.name,
      userPreferences: agent.configuration,
      conversationHistory: context.conversationHistory || []
    });

    // Return the generated response
    return response;
  }

  /**
   * Starts a conversation between two agents
   * @param initiatorAgentId ID of the agent initiating the conversation
   * @param recipientAgentId ID of the recipient agent
   * @param context Additional context for the conversation
   * @returns Promise resolving to the newly created conversation
   */
  async startConversation(initiatorAgentId: string, recipientAgentId: string, context: any): Promise<AgentConversation> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before starting a conversation');
    }

    // Retrieve both agents from the local database
    const [initiatorAgent, recipientAgent] = await Promise.all([
      this.getAgent(initiatorAgentId),
      this.getAgent(recipientAgentId)
    ]);

    // If either agent doesn't exist, throw an error
    if (!initiatorAgent) {
      throw new Error(`Initiator agent with ID ${initiatorAgentId} not found`);
    }
    if (!recipientAgent) {
      throw new Error(`Recipient agent with ID ${recipientAgentId} not found`);
    }

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

    // Store the conversation in the local database
    await this.storage.create(CONVERSATION_STORE_NAME, conversation);

    // Return the created conversation
    return conversation;
  }

  /**
   * Retrieves a conversation by its ID
   * @param conversationId ID of the conversation to retrieve
   * @returns Promise resolving to the conversation if found, null otherwise
   */
  async getConversation(conversationId: string): Promise<AgentConversation | null> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before retrieving a conversation');
    }

    // Query the local database for the conversation with the specified ID
    const conversation = await this.storage.read(CONVERSATION_STORE_NAME, conversationId);

    // Return the conversation if found, null otherwise
    return conversation as AgentConversation | null;
  }

  /**
   * Retrieves all conversations for an agent
   * @param agentId ID of the agent
   * @returns Promise resolving to an array of conversation objects
   */
  async getAgentConversations(agentId: string): Promise<AgentConversation[]> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before retrieving agent conversations');
    }

    // Query the local database for conversations where the agent is initiator or recipient
    const conversations = await this.storage.query({
      storeName: CONVERSATION_STORE_NAME,
      indexName: 'agentId',
      range: { lower: agentId, upper: agentId }
    });

    // Return the array of conversations
    return conversations as AgentConversation[];
  }

  /**
   * Sends a message from one agent to another
   * @param conversationId ID of the conversation
   * @param senderId ID of the sending agent
   * @param messageType Type of message (QUERY, PROPOSAL, etc.)
   * @param content Message content
   * @returns Promise resolving to the sent message object
   */
  async sendMessage(conversationId: string, senderId: string, messageType: string, content: any): Promise<AgentMessage> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before sending a message');
    }

    // Retrieve the conversation from the local database
    const conversation = await this.getConversation(conversationId);

    // If the conversation doesn't exist, throw an error
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }

    // Determine the recipient ID from the conversation
    const recipientId = conversation.initiatorAgentId === senderId ? conversation.recipientAgentId : conversation.initiatorAgentId;

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

    // If the WebSocket client exists, send the message via WebSocket
    if (this.webSocketClients[senderId]) {
      await this.webSocketClients[senderId].sendMessage(message);
    }

    // Store the message in the conversation in the local database
    // TODO: Implement message storage

    // Return the sent message
    return message;
  }

  /**
   * Generates a message from one agent to another using AI
   * @param conversationId ID of the conversation
   * @param senderId ID of the sending agent
   * @param context Additional context for message generation
   * @returns Promise resolving to the generated message object
   */
  async generateMessage(conversationId: string, senderId: string, context: any): Promise<AgentMessage> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before generating a message');
    }

    // Retrieve the conversation from the local database
    const conversation = await this.getConversation(conversationId);

    // If the conversation doesn't exist, throw an error
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }

    // Generate a message using OpenAI API
    const content = await generateAgentToAgentMessage(senderId, conversationId, context);

    // Send the generated message
    return this.sendMessage(conversationId, senderId, 'MESSAGE', content);
  }

  /**
   * Connects an agent to the WebSocket server for real-time communication
   * @param agentId ID of the agent to connect
   * @param authToken Authentication token
   * @returns Promise resolving to true if connection was successful
   */
  async connectWebSocket(agentId: string, authToken: string): Promise<boolean> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before connecting to WebSocket');
    }

    // Retrieve the agent from the local database
    const agent = await this.getAgent(agentId);

    // If the agent doesn't exist, throw an error
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    // Create a WebSocket client
    const webSocketClient = createWebSocketClient();

    // Store the client instance
    this.webSocketClients[agentId] = webSocketClient;

    // Connect to the WebSocket server
    const authPayload = { token: authToken, agentId: agent.agentId, publicKey: agent.publicKey };
    const authResult = await webSocketClient.connect(authPayload);

    // Register message handlers
    webSocketClient.registerHandler({ eventType: 'message', handler: this.handleIncomingMessage });

    // Update agent status to ONLINE
    await this.updateAgentStatus(agentId, AGENT_STATUS.ONLINE);

    // Return true if connection was successful
    return true;
  }

  /**
   * Disconnects an agent from the WebSocket server
   * @param agentId ID of the agent to disconnect
   */
  async disconnectWebSocket(agentId: string): Promise<boolean> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before disconnecting from WebSocket');
    }

    // Check if the WebSocket client exists for the agent
    if (this.webSocketClients[agentId]) {
      // Disconnect from the WebSocket server
      this.webSocketClients[agentId].disconnect();

      // Remove the client instance
      delete this.webSocketClients[agentId];

      // Update agent status to OFFLINE
      await this.updateAgentStatus(agentId, AGENT_STATUS.OFFLINE);
    }

    // Return true if disconnection was successful
    return true;
  }

  /**
   * Creates a new approval request for user decision
   * @param agentId ID of the agent creating the request
   * @param userId ID of the user to approve the request
   * @param type Type of approval request
   * @param data Data for the approval request
   * @param conversationId Related conversation ID
   * @returns Promise resolving to the created approval request
   */
  async createApprovalRequest(agentId: string, userId: string, type: ApprovalType, data: any, conversationId: string): Promise<AgentApprovalRequest> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before creating an approval request');
    }

    // Generate a unique request ID
    const requestId = uuidv4();

    // Create the approval request object
    const approvalRequest: AgentApprovalRequest = {
      requestId,
      agentId,
      userId,
      type,
      data,
      status: APPROVAL_STATUS.PENDING,
      conversationId,
      created: new Date(),
      updated: new Date(),
      expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours from now
    };

    // Store the approval request in the local database
    await this.storage.create(APPROVAL_STORE_NAME, approvalRequest);

    // Return the created approval request
    return approvalRequest;
  }

  /**
   * Retrieves an approval request by its ID
   * @param requestId ID of the approval request
   * @returns Promise resolving to the approval request if found, null otherwise
   */
  async getApprovalRequest(requestId: string): Promise<AgentApprovalRequest | null> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before retrieving an approval request');
    }

    // Query the local database for the approval request with the specified ID
    const approvalRequest = await this.storage.read(APPROVAL_STORE_NAME, requestId);

    // Return the approval request if found, null otherwise
    return approvalRequest as AgentApprovalRequest | null;
  }

  /**
   * Retrieves all approval requests for a user
   * @param userId ID of the user
   * @returns Promise resolving to an array of approval request objects
   */
  async getUserApprovalRequests(userId: string): Promise<AgentApprovalRequest[]> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before retrieving user approval requests');
    }

    // Query the local database for approval requests with the specified user ID
    const approvalRequests = await this.storage.query({
      storeName: APPROVAL_STORE_NAME,
      indexName: 'userId',
      range: { lower: userId, upper: userId }
    });

    // Return the array of approval requests
    return approvalRequests as AgentApprovalRequest[];
  }

  /**
   * Updates the status of an approval request
   * @param requestId ID of the approval request
   * @param status New status for the request
   * @param modifiedData Modified data if status is 'MODIFIED'
   * @returns Promise resolving to the updated approval request
   */
  async updateApprovalRequest(requestId: string, status: ApprovalStatus, modifiedData?: any): Promise<AgentApprovalRequest> {
    // Validate that the service is initialized
    if (!this.isInitialized()) {
      throw new Error('AgentService must be initialized before updating an approval request');
    }

    // Retrieve the approval request from the local database
    let approvalRequest = await this.getApprovalRequest(requestId);

    // If the request doesn't exist, throw an error
    if (!approvalRequest) {
      throw new Error(`Approval request with ID ${requestId} not found`);
    }

    // Update the status of the approval request
    approvalRequest.status = status;
    approvalRequest.updated = new Date();

    // Update data if modified
    if (modifiedData) {
      approvalRequest.data = modifiedData;
    }

    // Update the approval request in the local database
    await this.storage.update(APPROVAL_STORE_NAME, requestId, approvalRequest);

    // Process the approval based on the new status
    await this.processApproval(approvalRequest);

    // Return the updated approval request
    return approvalRequest;
  }

  /**
   * Processes an approved request based on its type
   * @param request The approval request to process
   */
  async processApproval(request: AgentApprovalRequest): Promise<void> {
    // Check the type of the approval request
    switch (request.type) {
      case APPROVAL_TYPES.MEETING_PROPOSAL:
        // Create a calendar event from the meeting proposal
        await this.createCalendarEvent(request.data, request.userId);
        break;
      case APPROVAL_TYPES.CALENDAR_EVENT:
        // Update the calendar event details
        // TODO: Implement calendar event update logic
        break;
      default:
        console.warn(`Unknown approval type: ${request.type}`);
    }

    // Notify the other agent about the approval
    // TODO: Implement agent notification logic

    // Update the conversation status if applicable
    // TODO: Implement conversation status update logic
  }

  /**
   * Processes a rejected request based on its type
   * @param request The approval request to process
   */
  async processRejection(request: AgentApprovalRequest): Promise<void> {
    // Check the type of the approval request
    switch (request.type) {
      case APPROVAL_TYPES.MEETING_PROPOSAL:
        // Notify the other agent about the rejection
        // TODO: Implement agent notification logic
        break;
      case APPROVAL_TYPES.CALENDAR_EVENT:
        // TODO: Implement calendar event rejection logic
        break;
      default:
        console.warn(`Unknown approval type: ${request.type}`);
    }

    // Update the conversation status if applicable
    // TODO: Implement conversation status update logic
  }

  /**
   * Processes a modified request based on its type
   * @param request The approval request to process
   */
  async processModification(request: AgentApprovalRequest): Promise<void> {
    // Check the type of the approval request
    switch (request.type) {
      case APPROVAL_TYPES.MEETING_PROPOSAL:
        // Update the proposal with modifications
        // TODO: Implement proposal update logic

        // Notify the other agent about the modifications
        // TODO: Implement agent notification logic

        // Continue the negotiation process with the modified data
        // TODO: Implement negotiation logic
        break;
      case APPROVAL_TYPES.CALENDAR_EVENT:
        // TODO: Implement calendar event modification logic
        break;
      default:
        console.warn(`Unknown approval type: ${request.type}`);
    }
  }

  /**
   * Creates a calendar event from an approved meeting proposal
   * @param meetingProposal The meeting proposal data
   * @param userId The user ID
   * @returns Promise resolving to the created calendar event
   */
  async createCalendarEvent(meetingProposal: any, userId: string): Promise<ICalendarEvent> {
    // Extract event details from the meeting proposal
    const { title, description, startTime, endTime, location } = meetingProposal;

    // Create a calendar event object
    const calendarEvent: ICalendarEvent = {
      eventId: uuidv4(),
      calendarId: 'primary', // TODO: Get the user's primary calendar ID
      googleEventId: null,
      title,
      description,
      startTime,
      endTime,
      location,
      status: CALENDAR_EVENT_STATUS.CONFIRMED,
      isAgentCreated: true,
      attendees: [], // TODO: Add attendees
      recurrence: null,
      lastModified: new Date().toISOString(),
      lastSynced: null,
      metadata: {}
    };

    // Save the event using the calendar sync manager
    await this.calendarManager.saveEvent(calendarEvent);

    // Return the created event
    return calendarEvent;
  }

  /**
   * Handles incoming messages from other agents
   * @param message The received message
   */
  async handleIncomingMessage(message: AgentMessage): Promise<void> {
    // Find or create a conversation for this message
    let conversation: AgentConversation | null = await this.getConversation(message.conversationId);
    if (!conversation) {
      conversation = await this.startConversation(message.senderId, message.recipientId, { purpose: 'Scheduling' });
    }

    // Add the message to the conversation in the local database
    // TODO: Implement message storage

    // Process the message based on type
    switch (message.messageType) {
      case 'QUERY':
        // Handle a scheduling request from another agent
        await this.handleSchedulingRequest(message.conversationId, message.recipientId, message.content);
        break;
      case 'PROPOSAL':
        // Handle a meeting proposal from another agent
        await this.handleMeetingProposal(message.conversationId, message.recipientId, message.content);
        break;
      case 'CONFIRMATION':
        // Handle confirmation (e.g., create calendar event)
        // TODO: Implement confirmation handling
        break;
      case 'REJECTION':
        // Handle rejection (e.g., notify user)
        // TODO: Implement rejection handling
        break;
      default:
        console.warn(`Unknown message type: ${message.messageType}`);
    }
  }

  /**
   * Handles a scheduling request from another agent
   * @param conversationId The conversation ID
   * @param recipientAgentId The recipient agent ID
   * @param schedulingParameters The scheduling parameters
   */
  async handleSchedulingRequest(conversationId: string, recipientAgentId: string, schedulingParameters: any): Promise<AgentMessage> {
    // Retrieve the recipient agent from the local database
    const recipientAgent = await this.getAgent(recipientAgentId);

    // Get the user's calendar availability using the calendar sync manager
    const availability = await this.calendarManager.checkAvailability(recipientAgent.userId, schedulingParameters);

    // Apply the user's scheduling preferences to filter available times
    // TODO: Implement preference filtering

    // Create a response with available times and preferences
    const responseContent = {
      availableTimes: availability.timeSlots,
      preferences: recipientAgent.configuration.schedulingPreferences
    };

    // Send the response message
    return this.sendMessage(conversationId, recipientAgentId, 'RESPONSE', responseContent);
  }

  /**
   * Handles a meeting proposal from another agent
   * @param conversationId The conversation ID
   * @param recipientAgentId The recipient agent ID
   * @param proposalData The proposal data
   */
  async handleMeetingProposal(conversationId: string, recipientAgentId: string, proposalData: any): Promise<AgentApprovalRequest> {
    // Retrieve the recipient agent from the local database
    const recipientAgent = await this.getAgent(recipientAgentId);

    // Check if the proposed time conflicts with existing calendar events
    // TODO: Implement conflict checking

    // If there's a conflict, generate a counter-proposal
    // TODO: Implement counter-proposal generation

    // If there's no conflict, create an approval request for the user
    return this.createApprovalRequest(recipientAgentId, recipientAgent.userId, APPROVAL_TYPES.MEETING_PROPOSAL, proposalData, conversationId);
  }

  /**
   * Checks if the service is initialized
   * @returns True if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Factory function to create and initialize an AgentService instance
 * @param storage IndexedDB storage instance
 * @param calendarManager CalendarSyncManager instance
 * @returns Initialized AgentService instance
 */
export async function createAgentService(storage: IndexedDBStorage, calendarManager: CalendarSyncManager): Promise<AgentService> {
  const agentService = new AgentService();
  await agentService.initialize(storage, calendarManager);
  return agentService;
}

export {
  AGENT_STORE_NAME,
  CONVERSATION_STORE_NAME,
  APPROVAL_STORE_NAME
};