/**
 * OpenAI Mock Implementation
 * 
 * This file provides mock implementations of OpenAI API services for testing purposes.
 * It enables unit testing of OpenAI-dependent features without making actual API calls,
 * supporting the privacy-first approach of the AI Agent Network.
 */

import { AgentCommand, Agent } from '../lib/types/agent.types';

// Mock response for chat completions
export const mockCompletionResponse = {
  id: 'mock-completion-id',
  object: 'chat.completion',
  created: 1677858242,
  model: 'gpt-4o',
  choices: [
    {
      message: {
        role: 'assistant',
        content: 'This is a mock response from the OpenAI API.'
      },
      index: 0,
      finish_reason: 'stop'
    }
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 10,
    total_tokens: 20
  }
};

// Mock response for structured outputs (function calling)
export const mockStructuredResponse = {
  id: 'mock-structured-id',
  object: 'chat.completion',
  created: 1677858242,
  model: 'gpt-4o',
  choices: [
    {
      message: {
        role: 'assistant',
        content: null,
        function_call: {
          name: 'get_result',
          arguments: '{"result": {"key": "value"}}'
        }
      },
      index: 0,
      finish_reason: 'function_call'
    }
  ],
  usage: {
    prompt_tokens: 15,
    completion_tokens: 15,
    total_tokens: 30
  }
};

// Mock response for agent interactions
export let mockAgentResponse = "I'll help you schedule that meeting. Let me check your calendar and contact the other person.";

// Mock meeting proposal for scheduling
export const mockMeetingProposal = {
  title: 'Coffee Meeting',
  description: 'Quick coffee catch-up',
  startTime: '2023-06-01T15:00:00Z',
  endTime: '2023-06-01T16:00:00Z',
  location: {
    name: 'Blue Bottle Coffee',
    address: '123 Main St, Anytown',
    locationType: 'COFFEE_SHOP'
  },
  meetingType: 'COFFEE',
  participants: ['user-1', 'user-2'],
  status: 'PENDING'
};

// Mock scheduling options for availability analysis
export const mockSchedulingOptions = [
  {
    startTime: '2023-06-01T15:00:00Z',
    endTime: '2023-06-01T16:00:00Z',
    location: 'Blue Bottle Coffee',
    score: 0.9,
    reason: 'Both users are available and prefer coffee shops'
  },
  {
    startTime: '2023-06-02T14:00:00Z',
    endTime: '2023-06-02T15:00:00Z',
    location: 'Starbucks',
    score: 0.8,
    reason: 'Both users are available but location is less preferred'
  }
];

// Mock agent-to-agent message
export const mockAgentToAgentMessage = {
  messageType: 'PROPOSAL',
  content: {
    proposalId: 'mock-proposal-id',
    details: {
      title: 'Coffee Meeting',
      startTime: '2023-06-01T15:00:00Z',
      endTime: '2023-06-01T16:00:00Z',
      location: {
        name: 'Blue Bottle Coffee',
        address: '123 Main St, Anytown',
        locationType: 'COFFEE_SHOP'
      }
    }
  }
};

/**
 * Creates a mock OpenAI client for testing
 */
export const createOpenAIClient = () => {
  const mockClient = {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue(mockCompletionResponse)
      }
    }
  };
  return mockClient;
};

/**
 * Mock implementation of text completion generation
 */
export const generateCompletion = (prompt: string, options = {}) => {
  console.log('Mock generateCompletion called with:', prompt, options);
  
  // Simulate errors based on prompt content for testing error handling
  if (prompt.includes('error')) {
    return Promise.reject(new Error('Mock API error'));
  }
  
  return Promise.resolve('This is a mock completion text.');
};

/**
 * Mock implementation of chat completion generation
 */
export const generateChatCompletion = (messages: any[], options = {}) => {
  console.log('Mock generateChatCompletion called with:', messages, options);
  
  // Simulate errors based on message content for testing error handling
  if (messages.some(msg => msg.content?.includes('error'))) {
    return Promise.reject(new Error('Mock API error'));
  }
  
  return Promise.resolve(mockCompletionResponse.choices[0].message.content);
};

/**
 * Mock implementation of structured JSON output generation
 */
export const generateStructuredOutput = (prompt: string, schema: any, options = {}) => {
  console.log('Mock generateStructuredOutput called with:', prompt, schema, options);
  
  // Simulate errors based on prompt content for testing error handling
  if (prompt.includes('error')) {
    return Promise.reject(new Error('Mock API error'));
  }
  
  // Parse the function call arguments as JSON
  const resultJson = JSON.parse(mockStructuredResponse.choices[0].message.function_call.arguments);
  return Promise.resolve(resultJson.result);
};

/**
 * Mock implementation of agent response generation
 */
export const generateAgentResponse = (userInput: string, context = {}, options = {}) => {
  console.log('Mock generateAgentResponse called with:', userInput, context, options);
  
  // Simulate errors based on userInput for testing error handling
  if (userInput.includes('error')) {
    return Promise.reject(new Error('Mock API error'));
  }
  
  // Customize response based on userInput for different test scenarios
  if (userInput.includes('schedule')) {
    return Promise.resolve(mockAgentResponse);
  }
  
  return Promise.resolve('I understand your request. How can I assist you further?');
};

/**
 * Mock implementation of structured command processing
 */
export const processAgentCommand = (command: AgentCommand, context = {}, options = {}) => {
  console.log('Mock processAgentCommand called with:', command, context, options);
  
  // Simulate errors based on command type for testing error handling
  if (command.command.includes('error')) {
    return Promise.reject(new Error('Mock API error'));
  }
  
  // Return appropriate mock responses based on command
  if (command.command.includes('schedule') || command.parameters?.action === 'schedule') {
    return Promise.resolve(mockMeetingProposal);
  }
  
  return Promise.resolve({ success: true, message: 'Command processed successfully' });
};

/**
 * Mock implementation of agent-to-agent message generation
 */
export const generateAgentToAgentMessage = (
  sourceAgent: Agent,
  targetAgent: Agent,
  conversationHistory: any[] = [],
  context = {},
  options = {}
) => {
  console.log('Mock generateAgentToAgentMessage called with:', 
    sourceAgent, targetAgent, conversationHistory, context, options);
  
  // Simulate errors based on agent configurations for testing error handling
  if (sourceAgent.agentId.includes('error') || targetAgent.agentId.includes('error')) {
    return Promise.reject(new Error('Mock API error'));
  }
  
  // Customize message based on conversation history for different test scenarios
  if (conversationHistory.length > 3) {
    return Promise.resolve({
      ...mockAgentToAgentMessage,
      messageType: 'CONFIRMATION'
    });
  }
  
  return Promise.resolve(mockAgentToAgentMessage);
};

/**
 * Mock implementation of scheduling options analysis
 */
export const analyzeSchedulingOptions = (
  availabilitySlots: any[],
  userPreferences: any,
  otherUserPreferences: any,
  options = {}
) => {
  console.log('Mock analyzeSchedulingOptions called with:', 
    availabilitySlots, userPreferences, otherUserPreferences, options);
  
  // Simulate errors based on availability data for testing error handling
  if (availabilitySlots.length === 0) {
    return Promise.reject(new Error('No availability slots provided'));
  }
  
  // Customize options based on input parameters for different test scenarios
  if (userPreferences?.preferredLocationType === 'RESTAURANT') {
    return Promise.resolve([
      {
        startTime: '2023-06-01T18:00:00Z',
        endTime: '2023-06-01T20:00:00Z',
        location: 'Italian Restaurant',
        score: 0.95,
        reason: 'Both users prefer restaurants for dinner'
      },
      ...mockSchedulingOptions
    ]);
  }
  
  return Promise.resolve(mockSchedulingOptions);
};

/**
 * Mock implementation of meeting proposal generation
 */
export const generateMeetingProposal = (
  meetingParameters: any,
  availabilityOptions: any[],
  userPreferences: any,
  options = {}
) => {
  console.log('Mock generateMeetingProposal called with:', 
    meetingParameters, availabilityOptions, userPreferences, options);
  
  // Simulate errors based on meeting parameters for testing error handling
  if (!meetingParameters || availabilityOptions.length === 0) {
    return Promise.reject(new Error('Invalid meeting parameters or no availability options'));
  }
  
  // Customize proposal based on input parameters for different test scenarios
  if (meetingParameters.meetingType === 'LUNCH') {
    return Promise.resolve({
      ...mockMeetingProposal,
      title: 'Lunch Meeting',
      meetingType: 'LUNCH',
      startTime: '2023-06-01T12:00:00Z',
      endTime: '2023-06-01T13:00:00Z',
      location: {
        name: 'Sandwich Shop',
        address: '123 Main St, Anytown',
        locationType: 'RESTAURANT'
      }
    });
  }
  
  return Promise.resolve(mockMeetingProposal);
};

/**
 * Mock implementation of OpenAI error handling
 */
export const handleOpenAIError = async (
  error: Error,
  retryCallback: Function,
  attempt: number,
  maxAttempts: number
) => {
  console.log('Mock handleOpenAIError called with:', error, attempt, maxAttempts);
  
  if (attempt < maxAttempts) {
    // Simulate retry delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return retryCallback();
  }
  
  throw error;
};

/**
 * Mock implementation of the OpenAI service for testing
 */
export class MockOpenAIService {
  private client: any;
  private initialized: boolean;
  private cache: Map<string, any>;
  
  constructor() {
    this.client = null;
    this.initialized = false;
    this.cache = new Map();
  }
  
  /**
   * Initializes the mock OpenAI service
   */
  async initialize(): Promise<boolean> {
    this.client = createOpenAIClient();
    this.initialized = true;
    return true;
  }
  
  /**
   * Mock implementation of text completion generation
   */
  async generateCompletion(prompt: string, options = {}): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Check cache for this prompt
    const cacheKey = `completion:${prompt}`;
    if (options?.cache !== false && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = await generateCompletion(prompt, options);
    
    // Cache the result if caching is enabled
    if (options?.cache !== false) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }
  
  /**
   * Mock implementation of chat completion generation
   */
  async generateChatCompletion(messages: any[], options = {}): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Generate a cache key from the messages
    const cacheKey = `chat:${JSON.stringify(messages)}`;
    if (options?.cache !== false && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = await generateChatCompletion(messages, options);
    
    // Cache the result if caching is enabled
    if (options?.cache !== false) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }
  
  /**
   * Mock implementation of structured JSON output generation
   */
  async generateStructuredOutput(prompt: string, schema: any, options = {}): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Generate a cache key from the prompt and schema
    const cacheKey = `structured:${prompt}:${JSON.stringify(schema)}`;
    if (options?.cache !== false && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = await generateStructuredOutput(prompt, schema, options);
    
    // Cache the result if caching is enabled
    if (options?.cache !== false) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }
  
  /**
   * Mock implementation of agent response generation
   */
  async generateAgentResponse(userInput: string, context = {}, options = {}): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return generateAgentResponse(userInput, context, options);
  }
  
  /**
   * Mock implementation of structured command processing
   */
  async processAgentCommand(command: AgentCommand, context = {}, options = {}): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return processAgentCommand(command, context, options);
  }
  
  /**
   * Mock implementation of agent-to-agent message generation
   */
  async generateAgentToAgentMessage(
    sourceAgent: Agent,
    targetAgent: Agent,
    conversationHistory: any[] = [],
    context = {},
    options = {}
  ): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return generateAgentToAgentMessage(sourceAgent, targetAgent, conversationHistory, context, options);
  }
  
  /**
   * Mock implementation of scheduling options analysis
   */
  async analyzeSchedulingOptions(
    availabilitySlots: any[],
    userPreferences: any,
    otherUserPreferences: any,
    options = {}
  ): Promise<any[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return analyzeSchedulingOptions(availabilitySlots, userPreferences, otherUserPreferences, options);
  }
  
  /**
   * Mock implementation of meeting proposal generation
   */
  async generateMeetingProposal(
    meetingParameters: any,
    availabilityOptions: any[],
    userPreferences: any,
    options = {}
  ): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return generateMeetingProposal(meetingParameters, availabilityOptions, userPreferences, options);
  }
  
  /**
   * Clears the response cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Gets the current size of the cache
   */
  getCacheSize(): number {
    return this.cache.size;
  }
  
  /**
   * Checks if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Sets custom mock responses for testing specific scenarios
   */
  setMockResponses(responses: any): void {
    if (responses.completionResponse) {
      Object.assign(mockCompletionResponse, responses.completionResponse);
    }
    if (responses.structuredResponse) {
      Object.assign(mockStructuredResponse, responses.structuredResponse);
    }
    if (responses.agentResponse) {
      mockAgentResponse = responses.agentResponse;
    }
    if (responses.meetingProposal) {
      Object.assign(mockMeetingProposal, responses.meetingProposal);
    }
    if (responses.schedulingOptions) {
      mockSchedulingOptions.length = 0;
      responses.schedulingOptions.forEach((option: any) => mockSchedulingOptions.push(option));
    }
    if (responses.agentToAgentMessage) {
      Object.assign(mockAgentToAgentMessage, responses.agentToAgentMessage);
    }
  }
  
  /**
   * Resets all mock responses to their default values
   */
  resetMockResponses(): void {
    // Reset all mock responses to their original values
    // For simplicity, we'll just clear the cache
    this.clearCache();
  }
}

// Create a singleton instance for easier importing in tests
export const mockOpenAIService = new MockOpenAIService();