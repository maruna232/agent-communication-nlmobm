import { useState, useEffect, useCallback, useMemo } from 'react'; // react v18.0+
import {
  useAgentStore,
  Agent,
  AgentConfiguration,
  AgentConversation,
  AgentMessage,
  AgentApprovalRequest,
  ApprovalStatus,
  useAuth,
  initializeAgentService
} from './';

/**
 * Custom React hook that provides agent-related functionality to components
 * @returns Agent state and actions for the application
 */
export const useAgent = () => {
  // LD1: Extract user information from authentication state
  const { state: authState } = useAuth();
  const userId = authState.user?.userId;

  // LD1: Access agent-related state and actions from the global agent store
  const {
    currentAgent: agent,
    loading,
    error,
    conversations,
    currentConversation,
    approvalRequests,
    setCurrentAgent,
    setConversations,
    setApprovalRequests,
    fetchUserAgent,
    createNewAgent,
    updateAgentConfig,
    processCommand,
    startConversation,
    fetchConversations,
    fetchConversation,
    sendConversationMessage,
    fetchApprovalRequests,
    respondToApproval,
    connectWebSocketClient,
    disconnectWebSocketClient,
    connected: isConnected
  } = useAgentStore();

  // LD1: Initialize agent service when the user is authenticated
  const initializeAgent = useCallback(async (userId: string) => {
    try {
      // LD1: Call initializeAgentService with the user ID
      await initializeAgentService(userId);
      // LD1: Fetch the user's agent using fetchUserAgent
      await fetchUserAgent(userId);
    } catch (err) {
      // LD1: Handle any errors during initialization
      console.error("Failed to initialize agent service", err);
    }
  }, [fetchUserAgent]);

  // LD1: Fetch the user's agent when authenticated
  useEffect(() => {
    if (userId) {
      initializeAgent(userId);
    }
  }, [userId, initializeAgent]);

  // LD1: Fetch agent conversations when the agent is available
  useEffect(() => {
    if (agent) {
      fetchConversations(agent.agentId);
    }
  }, [agent, fetchConversations]);

  // LD1: Fetch approval requests when the agent is available
  useEffect(() => {
    if (userId) {
      fetchApprovalRequests(userId);
    }
  }, [userId, fetchApprovalRequests]);

  // LD1: Connect to WebSocket for agent communication when authenticated
  useEffect(() => {
    if (agent && authState.token) {
      connectWebSocketClient(agent.agentId, authState.token.token);
    }
    // LD1: Disconnect from WebSocket when user logs out
    return () => {
      if (agent) {
        disconnectWebSocketClient(agent.agentId);
      }
    };
  }, [agent, authState.token, connectWebSocketClient, disconnectWebSocketClient]);

  // LD1: Provide methods for agent creation, configuration, and communication
  const createAgent = useCallback(async (userId: string, config: AgentConfiguration) => {
    try {
      // LD1: Call createAgent from the agent store with user ID and configuration
      return await createNewAgent(userId, config);
    } catch (err) {
      // LD1: Handle any errors during agent creation
      console.error("Failed to create agent", err);
      throw err;
    }
  }, [createNewAgent]);

  const updateAgentConfiguration = useCallback(async (agentId: string, config: AgentConfiguration) => {
    try {
      // LD1: Call updateAgentConfig from the agent store with agent ID and configuration
      return await updateAgentConfig(agentId, config);
    } catch (err) {
      // LD1: Handle any errors during configuration update
      console.error("Failed to update agent configuration", err);
      throw err;
    }
  }, [updateAgentConfig]);

  // LD1: Provide methods for processing natural language commands
  const processAgentCommand = useCallback(async (command: string) => {
    try {
      // LD1: Call processCommand from the agent store with the command text
      return await processCommand(command);
    } catch (err) {
      // LD1: Handle any errors during command processing
      console.error("Failed to process command", err);
      throw err;
    }
  }, [processCommand]);

  // LD1: Provide methods for handling approval requests
  const startAgentConversation = useCallback(async (recipientAgentId: string, context: any) => {
    try {
      // LD1: Get the current agent ID from state
      if (!agent) {
        throw new Error("No agent available to start conversation");
      }
      // LD1: Call startConversation from the agent store with initiator and recipient IDs
      return await startConversation(agent.agentId, recipientAgentId, context);
    } catch (err) {
      // LD1: Handle any errors during conversation creation
      console.error("Failed to start conversation", err);
      throw err;
    }
  }, [agent, startConversation]);

  const getAgentConversation = useCallback(async (conversationId: string) => {
    try {
      // LD1: Call fetchConversation from the agent store with the conversation ID
      return await fetchConversation(conversationId);
    } catch (err) {
      // LD1: Handle any errors during conversation retrieval
      console.error("Failed to fetch conversation", err);
      throw err;
    }
  }, [fetchConversation]);

  const sendAgentMessage = useCallback(async (conversationId: string, messageType: string, content: any) => {
    try {
      // LD1: Get the current agent ID from state
      if (!agent) {
        throw new Error("No agent available to send message");
      }
      // LD1: Call sendMessage from the agent store with conversation ID, sender ID, message type, and content
      return await sendConversationMessage(conversationId, agent.agentId, messageType, content);
    } catch (err) {
      // LD1: Handle any errors during message sending
      console.error("Failed to send message", err);
      throw err;
    }
  }, [agent, sendConversationMessage]);

  const respondToApprovalRequest = useCallback(async (requestId: string, status: ApprovalStatus, modifiedData?: any) => {
    try {
      // LD1: Call respondToApproval from the agent store with request ID, status, and modified data
      return await respondToApproval(requestId, status, modifiedData);
    } catch (err) {
      // LD1: Handle any errors during approval response
      console.error("Failed to respond to approval request", err);
      throw err;
    }
  }, [respondToApproval]);

  // LD1: Return agent state and actions for use in components
  return useMemo(() => ({
    agent,
    loading,
    error,
    conversations,
    currentConversation,
    approvalRequests,
    createAgent,
    updateAgentConfiguration,
    processCommand: processAgentCommand,
    startConversation: startAgentConversation,
    getConversation: getAgentConversation,
    sendMessage: sendAgentMessage,
    respondToApproval: respondToApprovalRequest,
    isConnected
  }), [agent, loading, error, conversations, currentConversation, approvalRequests, createAgent, updateAgentConfiguration, processAgentCommand, startAgentConversation, getAgentConversation, sendAgentMessage, respondToApprovalRequest, isConnected]);
};