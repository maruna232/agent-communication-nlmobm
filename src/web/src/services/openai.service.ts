import OpenAI from 'openai';
import { 
  createAgentError, 
  createNetworkError, 
  formatApiError 
} from '../lib/utils/errorHandling';
import { 
  DEFAULT_CONFIG, 
  MAX_RETRY_ATTEMPTS 
} from '../lib/constants';
import { 
  Agent, 
  AgentCommand,
  AgentConfiguration 
} from '../lib/types/agent.types';

// Global constants for OpenAI configuration
const API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TIMEOUT_MS = 30000;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 15000;

/**
 * Creates and configures an OpenAI API client instance
 * 
 * @returns Configured OpenAI client instance
 */
function createOpenAIClient(): OpenAI {
  if (!API_KEY) {
    throw createAgentError('OpenAI API key is missing or not configured properly');
  }
  
  return new OpenAI({
    apiKey: API_KEY,
    timeout: DEFAULT_TIMEOUT_MS,
    maxRetries: MAX_RETRY_ATTEMPTS.API
  });
}

/**
 * Generates a text completion from OpenAI based on the provided prompt
 * 
 * @param prompt - The text prompt to generate a completion for
 * @param options - Additional options for the completion request
 * @returns Generated text completion
 */
async function generateCompletion(
  prompt: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    cache?: boolean;
  } = {}
): Promise<string> {
  try {
    const client = createOpenAIClient();
    const { model = DEFAULT_MODEL, temperature = DEFAULT_TEMPERATURE, maxTokens = DEFAULT_MAX_TOKENS } = options;
    
    const completion = await client.completions.create({
      model,
      prompt,
      temperature,
      max_tokens: maxTokens,
    });
    
    return completion.choices[0]?.text?.trim() || '';
  } catch (error) {
    return handleOpenAIError(error as Error, () => generateCompletion(prompt, options), 1, DEFAULT_CONFIG.MESSAGE_RETRY_ATTEMPTS);
  }
}

/**
 * Generates a chat completion from OpenAI based on the provided messages
 * 
 * @param messages - The array of messages to generate a completion for
 * @param options - Additional options for the completion request
 * @returns Generated chat completion
 */
async function generateChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    cache?: boolean;
  } = {}
): Promise<string> {
  try {
    const client = createOpenAIClient();
    const { model = DEFAULT_MODEL, temperature = DEFAULT_TEMPERATURE, maxTokens = DEFAULT_MAX_TOKENS } = options;
    
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    
    return completion.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    return handleOpenAIError(error as Error, () => generateChatCompletion(messages, options), 1, DEFAULT_CONFIG.MESSAGE_RETRY_ATTEMPTS);
  }
}

/**
 * Generates a structured JSON output from OpenAI based on the provided prompt and schema
 * 
 * @param prompt - The text prompt to generate structured output for
 * @param schema - The schema defining the expected structure
 * @param options - Additional options for the completion request
 * @returns Structured JSON output
 */
async function generateStructuredOutput(
  prompt: string,
  schema: Record<string, any>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    cache?: boolean;
  } = {}
): Promise<object> {
  try {
    const client = createOpenAIClient();
    const { model = DEFAULT_MODEL, temperature = DEFAULT_TEMPERATURE, maxTokens = DEFAULT_MAX_TOKENS } = options;
    
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a structured data generator. Generate JSON output that conforms to the following schema: ${JSON.stringify(schema)}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" }
    });
    
    const jsonString = completion.choices[0]?.message?.content?.trim() || '{}';
    return validateJsonResponse(jsonString, schema);
  } catch (error) {
    return handleOpenAIError(error as Error, () => generateStructuredOutput(prompt, schema, options), 1, DEFAULT_CONFIG.MESSAGE_RETRY_ATTEMPTS);
  }
}

/**
 * Generates a response from the AI agent based on user input and context
 * 
 * @param userInput - The user's message or command
 * @param context - Context information including user preferences and agent configuration
 * @param options - Additional options for the completion request
 * @returns AI-generated agent response
 */
async function generateAgentResponse(
  userInput: string,
  context: {
    agent: Agent;
    conversationHistory?: Array<{ role: string; content: string }>;
    userPreferences?: Record<string, any>;
  },
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  try {
    const { agent, conversationHistory = [], userPreferences = {} } = context;
    
    // Create system prompt with agent personality and constraints
    const systemPrompt = createSystemPrompt(agent, context);
    
    // Prepare messages for chat completion
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userInput }
    ];
    
    return await generateChatCompletion(messages, options);
  } catch (error) {
    throw createAgentError('Failed to generate agent response', { 
      originalError: error,
      userInput
    });
  }
}

/**
 * Processes a structured command through the AI agent
 * 
 * @param command - The command to process
 * @param context - Context information including user preferences and agent configuration
 * @param options - Additional options for the completion request
 * @returns Processed command result
 */
async function processAgentCommand(
  command: AgentCommand,
  context: {
    agent: Agent;
    userPreferences?: Record<string, any>;
  },
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<object> {
  try {
    const { agent, userPreferences = {} } = context;
    
    // Create specialized prompt based on command type
    let prompt = `Process the following command: ${command.command}\n`;
    prompt += `Command parameters: ${JSON.stringify(command.parameters)}\n`;
    prompt += `User preferences: ${JSON.stringify(userPreferences)}\n`;
    
    // Define response schema based on command type
    const responseSchema = {
      type: 'object',
      properties: {
        result: { type: 'string' },
        success: { type: 'boolean' },
        data: { type: 'object' }
      },
      required: ['result', 'success']
    };
    
    return await generateStructuredOutput(prompt, responseSchema, options);
  } catch (error) {
    throw createAgentError('Failed to process agent command', { 
      originalError: error,
      command
    });
  }
}

/**
 * Generates a message from one agent to another for scheduling negotiation
 * 
 * @param sourceAgent - The agent generating the message
 * @param targetAgent - The recipient agent
 * @param conversationHistory - Previous messages in the conversation
 * @param context - Additional context information
 * @param options - Additional options for the completion request
 * @returns Structured message for agent-to-agent communication
 */
async function generateAgentToAgentMessage(
  sourceAgent: Agent,
  targetAgent: Agent,
  conversationHistory: Array<{ sender: string; content: string }>,
  context: {
    purpose: string;
    schedulingContext?: {
      proposedTime?: string;
      proposedLocation?: string;
      meetingType?: string;
    };
  },
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<object> {
  try {
    // Create specialized prompt for agent-to-agent communication
    let prompt = `You are agent "${sourceAgent.name}" communicating with agent "${targetAgent.name}".\n`;
    prompt += `Your communication style is: ${JSON.stringify(sourceAgent.configuration.communicationStyle)}\n`;
    prompt += `Your scheduling preferences are: ${JSON.stringify(sourceAgent.configuration.schedulingPreferences)}\n`;
    prompt += `Your location preferences are: ${JSON.stringify(sourceAgent.configuration.locationPreferences)}\n\n`;
    
    prompt += `The other agent's communication style is: ${JSON.stringify(targetAgent.configuration.communicationStyle)}\n`;
    prompt += `The purpose of this communication is: ${context.purpose}\n\n`;
    
    if (context.schedulingContext) {
      prompt += `Scheduling context: ${JSON.stringify(context.schedulingContext)}\n\n`;
    }
    
    prompt += `Conversation history:\n${conversationHistory.map(msg => `${msg.sender}: ${msg.content}`).join('\n')}\n\n`;
    
    prompt += `Generate the next message in this conversation from ${sourceAgent.name} to ${targetAgent.name}.`;
    
    // Define message schema based on the communication protocol
    const messageSchema = {
      type: 'object',
      properties: {
        messageType: { type: 'string', enum: ['query', 'response', 'proposal', 'confirmation', 'rejection'] },
        content: { type: 'string' },
        metadata: { type: 'object' }
      },
      required: ['messageType', 'content']
    };
    
    return await generateStructuredOutput(prompt, messageSchema, options);
  } catch (error) {
    throw createAgentError('Failed to generate agent-to-agent message', { 
      originalError: error,
      sourceAgentId: sourceAgent.agentId,
      targetAgentId: targetAgent.agentId
    });
  }
}

/**
 * Analyzes scheduling options based on calendar availability and preferences
 * 
 * @param availabilitySlots - Available time slots from calendars
 * @param userPreferences - Preferences of the current user
 * @param otherUserPreferences - Preferences of the other user
 * @param options - Additional options for the completion request
 * @returns Ranked list of scheduling options
 */
async function analyzeSchedulingOptions(
  availabilitySlots: Array<{ start: string; end: string }>,
  userPreferences: Record<string, any>,
  otherUserPreferences: Record<string, any>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<Array<{ start: string; end: string; score: number; reason: string }>> {
  try {
    // Create specialized prompt for scheduling analysis
    let prompt = `Analyze the following availability slots to find optimal meeting times:\n`;
    prompt += `Availability slots: ${JSON.stringify(availabilitySlots)}\n\n`;
    prompt += `User preferences: ${JSON.stringify(userPreferences)}\n`;
    prompt += `Other user preferences: ${JSON.stringify(otherUserPreferences)}\n\n`;
    prompt += `Rank the slots based on both users' preferences and provide a score from 0-100 for each slot.`;
    
    // Define response schema for ranked options
    const responseSchema = {
      type: 'object',
      properties: {
        rankedSlots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' },
              score: { type: 'number' },
              reason: { type: 'string' }
            },
            required: ['start', 'end', 'score', 'reason']
          }
        }
      },
      required: ['rankedSlots']
    };
    
    const result = await generateStructuredOutput(prompt, responseSchema, options);
    return (result as any).rankedSlots;
  } catch (error) {
    throw createAgentError('Failed to analyze scheduling options', { 
      originalError: error
    });
  }
}

/**
 * Generates a meeting proposal based on user preferences and availability
 * 
 * @param meetingParameters - Basic parameters for the meeting
 * @param availabilityOptions - Available time options
 * @param userPreferences - User preferences for meetings
 * @param options - Additional options for the completion request
 * @returns Structured meeting proposal
 */
async function generateMeetingProposal(
  meetingParameters: {
    purpose: string;
    duration: number;
    participantIds: string[];
    meetingType?: string;
  },
  availabilityOptions: Array<{ start: string; end: string }>,
  userPreferences: Record<string, any>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<object> {
  try {
    // Create specialized prompt for meeting proposal generation
    let prompt = `Generate a meeting proposal based on the following parameters:\n`;
    prompt += `Meeting parameters: ${JSON.stringify(meetingParameters)}\n`;
    prompt += `Availability options: ${JSON.stringify(availabilityOptions)}\n`;
    prompt += `User preferences: ${JSON.stringify(userPreferences)}\n\n`;
    prompt += `Create a detailed meeting proposal optimized for the participants.`;
    
    // Define the expected proposal schema
    const proposalSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        suggestedTime: { type: 'string' },
        duration: { type: 'number' },
        location: { 
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            type: { type: 'string' }
          }
        },
        meetingType: { type: 'string' },
        reason: { type: 'string' }
      },
      required: ['title', 'suggestedTime', 'duration', 'location', 'meetingType']
    };
    
    return await generateStructuredOutput(prompt, proposalSchema, options);
  } catch (error) {
    throw createAgentError('Failed to generate meeting proposal', { 
      originalError: error
    });
  }
}

/**
 * Handles errors from the OpenAI API with appropriate retry logic
 * 
 * @param error - The error that occurred
 * @param retryCallback - Function to retry on failure
 * @param attempt - Current attempt number
 * @param maxAttempts - Maximum number of retry attempts
 * @returns Result from successful retry or throws error after max attempts
 */
async function handleOpenAIError<T>(
  error: Error,
  retryCallback: () => Promise<T>,
  attempt: number,
  maxAttempts: number
): Promise<T> {
  // Parse the error to determine its type
  const errorObject = error as any;
  const status = errorObject.status || errorObject.statusCode;
  const type = errorObject.type;
  const message = errorObject.message || 'Unknown OpenAI API error';
  
  // Determine if we should retry based on error type
  let shouldRetry = false;
  let backoffDelay = 0;
  
  // Rate limit errors
  if (status === 429 || type === 'rate_limit_exceeded') {
    shouldRetry = true;
    backoffDelay = calculateBackoff(attempt, BASE_RETRY_DELAY_MS * 2, MAX_RETRY_DELAY_MS);
    console.warn(`OpenAI rate limit exceeded. Retrying in ${backoffDelay}ms...`);
  }
  // Server errors
  else if (status >= 500 && status < 600) {
    shouldRetry = true;
    backoffDelay = calculateBackoff(attempt, BASE_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS);
    console.warn(`OpenAI server error (${status}). Retrying in ${backoffDelay}ms...`);
  }
  // Timeout or network errors
  else if (message.includes('timeout') || message.includes('network') || message.includes('ECONNRESET')) {
    shouldRetry = true;
    backoffDelay = calculateBackoff(attempt, BASE_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS);
    console.warn(`OpenAI network error. Retrying in ${backoffDelay}ms...`);
  }
  
  // Retry if we should and haven't exceeded max attempts
  if (shouldRetry && attempt < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    return retryCallback();
  }
  
  // Otherwise, format and throw the error
  if (status === 401 || status === 403) {
    throw createAgentError('OpenAI authentication error: Invalid API key or unauthorized access', { 
      originalError: error,
      status
    });
  } else if (status === 404) {
    throw createAgentError('OpenAI resource not found: The requested model or endpoint does not exist', { 
      originalError: error,
      status
    });
  } else if (status === 429) {
    throw createAgentError('OpenAI rate limit exceeded: Too many requests', { 
      originalError: error,
      status,
      retryAfter: errorObject.headers?.['retry-after']
    });
  } else if (status >= 500) {
    throw createNetworkError('OpenAI server error', { 
      originalError: error,
      status 
    });
  } else {
    throw createAgentError(`OpenAI API error: ${message}`, { 
      originalError: error
    });
  }
}

/**
 * Calculates exponential backoff time with jitter for retries
 * 
 * @param attempt - Current attempt number
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay time in milliseconds
 */
function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  // Calculate exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  
  // Add random jitter (±30%) to prevent thundering herd problem
  const jitter = exponentialDelay * 0.3 * (Math.random() * 2 - 1);
  
  // Apply jitter and ensure we don't exceed maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Creates a system prompt for the AI model based on agent configuration
 * 
 * @param agent - The agent configuration
 * @param context - Additional context information
 * @returns Formatted system prompt
 */
function createSystemPrompt(agent: Agent, context: any): string {
  // Start with base instructions
  let prompt = `You are an AI assistant named "${agent.name}" that helps with scheduling and coordination.\n\n`;
  
  // Add privacy-focused constraints
  prompt += "Privacy constraints:\n";
  prompt += "- Keep all user data confidential\n";
  prompt += "- Only share information explicitly approved by the user\n";
  prompt += "- Do not store or remember personal details beyond the current conversation\n\n";
  
  // Add communication style
  const style = agent.configuration.communicationStyle;
  prompt += "Communication style:\n";
  prompt += `- Formality: ${style.formality}\n`;
  prompt += `- Verbosity: ${style.verbosity}\n`;
  prompt += `- Tone: ${style.tone}\n\n`;
  
  // Add scheduling preferences if relevant
  if (context.schedulingContext) {
    const prefs = agent.configuration.schedulingPreferences;
    prompt += "Scheduling preferences:\n";
    if (prefs.preferredTimes && prefs.preferredTimes.length > 0) {
      prompt += `- Preferred times: ${JSON.stringify(prefs.preferredTimes)}\n`;
    }
    prompt += `- Buffer duration: ${prefs.bufferDuration} minutes\n`;
    prompt += `- Advance notice: ${prefs.advanceNotice} minutes\n`;
    if (prefs.preferredMeetingTypes && prefs.preferredMeetingTypes.length > 0) {
      prompt += `- Preferred meeting types: ${prefs.preferredMeetingTypes.join(', ')}\n`;
    }
    prompt += "\n";
  }
  
  // Add location preferences if relevant
  if (context.schedulingContext) {
    const prefs = agent.configuration.locationPreferences;
    prompt += "Location preferences:\n";
    prompt += `- Default location: ${prefs.defaultLocation}\n`;
    if (prefs.favoriteLocations && prefs.favoriteLocations.length > 0) {
      prompt += `- Favorite locations: ${prefs.favoriteLocations.join(', ')}\n`;
    }
    if (prefs.locationTypes && prefs.locationTypes.length > 0) {
      prompt += `- Preferred location types: ${prefs.locationTypes.join(', ')}\n`;
    }
    prompt += `- Travel radius: ${prefs.travelRadius} miles\n\n`;
  }
  
  return prompt;
}

/**
 * Formats conversation history for inclusion in prompts
 * 
 * @param messages - Array of messages to format
 * @param maxMessages - Maximum number of messages to include
 * @returns Formatted conversation history
 */
function formatConversationHistory(
  messages: Array<{ role: string; content: string }>,
  maxMessages: number = 10
): string {
  // Take the most recent messages up to maxMessages
  const recentMessages = messages.slice(-maxMessages);
  
  // Format each message
  return recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
}

/**
 * Validates that a response is valid JSON and matches the expected schema
 * 
 * @param jsonString - The JSON string to parse and validate
 * @param schema - The schema to validate against
 * @returns Parsed and validated JSON object
 */
function validateJsonResponse(jsonString: string, schema: Record<string, any>): object {
  try {
    // Parse the JSON string
    const parsedJson = JSON.parse(jsonString);
    
    // Basic schema validation (could be expanded with a proper JSON Schema validator)
    if (schema.type === 'object' && typeof parsedJson !== 'object') {
      throw new Error('Response is not an object');
    }
    
    if (schema.properties) {
      // Check required properties
      if (schema.required) {
        for (const requiredProp of schema.required) {
          if (!(requiredProp in parsedJson)) {
            throw new Error(`Missing required property: ${requiredProp}`);
          }
        }
      }
    }
    
    return parsedJson;
  } catch (error) {
    throw createAgentError('Failed to parse or validate JSON response', {
      originalError: error,
      jsonString
    });
  }
}

/**
 * Service class for interacting with OpenAI's API
 */
class OpenAIService {
  private client: OpenAI | null = null;
  private initialized: boolean = false;
  private cache: Map<string, any> = new Map();
  
  /**
   * Creates a new OpenAIService instance
   */
  constructor() {
    this.client = null;
    this.initialized = false;
    this.cache = new Map();
  }
  
  /**
   * Initializes the OpenAI service
   * 
   * @returns True if initialization was successful
   */
  async initialize(): Promise<boolean> {
    try {
      this.client = createOpenAIClient();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize OpenAI service:', error);
      this.initialized = false;
      return false;
    }
  }
  
  /**
   * Generates a text completion
   * 
   * @param prompt - The text prompt to generate a completion for
   * @param options - Additional options for the completion request
   * @returns Generated text completion
   */
  async generateCompletion(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      cache?: boolean;
    } = {}
  ): Promise<string> {
    if (!this.initialized) {
      throw createAgentError('OpenAI service not initialized');
    }
    
    const { cache = true } = options;
    
    // Check cache if enabled
    if (cache) {
      const cacheKey = `completion:${prompt}:${options.model || DEFAULT_MODEL}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
    }
    
    const result = await generateCompletion(prompt, options);
    
    // Cache result if enabled
    if (cache) {
      const cacheKey = `completion:${prompt}:${options.model || DEFAULT_MODEL}`;
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }
  
  /**
   * Generates a chat completion
   * 
   * @param messages - The array of messages to generate a completion for
   * @param options - Additional options for the completion request
   * @returns Generated chat completion
   */
  async generateChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      cache?: boolean;
    } = {}
  ): Promise<string> {
    if (!this.initialized) {
      throw createAgentError('OpenAI service not initialized');
    }
    
    const { cache = true } = options;
    
    // Check cache if enabled
    if (cache) {
      // Create a cache key from the messages
      const cacheKey = `chat:${JSON.stringify(messages)}:${options.model || DEFAULT_MODEL}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
    }
    
    const result = await generateChatCompletion(messages, options);
    
    // Cache result if enabled
    if (cache) {
      const cacheKey = `chat:${JSON.stringify(messages)}:${options.model || DEFAULT_MODEL}`;
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }
  
  /**
   * Generates a structured JSON output
   * 
   * @param prompt - The text prompt to generate structured output for
   * @param schema - The schema defining the expected structure
   * @param options - Additional options for the completion request
   * @returns Structured JSON output
   */
  async generateStructuredOutput(
    prompt: string,
    schema: Record<string, any>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      cache?: boolean;
    } = {}
  ): Promise<object> {
    if (!this.initialized) {
      throw createAgentError('OpenAI service not initialized');
    }
    
    const { cache = true } = options;
    
    // Check cache if enabled
    if (cache) {
      const cacheKey = `structured:${prompt}:${JSON.stringify(schema)}:${options.model || DEFAULT_MODEL}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
    }
    
    const result = await generateStructuredOutput(prompt, schema, options);
    
    // Cache result if enabled
    if (cache) {
      const cacheKey = `structured:${prompt}:${JSON.stringify(schema)}:${options.model || DEFAULT_MODEL}`;
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }
  
  /**
   * Generates a response from the AI agent
   * 
   * @param userInput - The user's message or command
   * @param context - Context information including user preferences and agent configuration
   * @param options - Additional options for the completion request
   * @returns AI-generated agent response
   */
  async generateAgentResponse(
    userInput: string,
    context: {
      agent: Agent;
      conversationHistory?: Array<{ role: string; content: string }>;
      userPreferences?: Record<string, any>;
    },
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    if (!this.initialized) {
      throw createAgentError('OpenAI service not initialized');
    }
    
    return generateAgentResponse(userInput, context, options);
  }
  
  /**
   * Processes a structured command through the AI agent
   * 
   * @param command - The command to process
   * @param context - Context information including user preferences and agent configuration
   * @param options - Additional options for the completion request
   * @returns Processed command result
   */
  async processAgentCommand(
    command: AgentCommand,
    context: {
      agent: Agent;
      userPreferences?: Record<string, any>;
    },
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<object> {
    if (!this.initialized) {
      throw createAgentError('OpenAI service not initialized');
    }
    
    return processAgentCommand(command, context, options);
  }
  
  /**
   * Generates a message from one agent to another
   * 
   * @param sourceAgent - The agent generating the message
   * @param targetAgent - The recipient agent
   * @param conversationHistory - Previous messages in the conversation
   * @param context - Additional context information
   * @param options - Additional options for the completion request
   * @returns Structured message for agent-to-agent communication
   */
  async generateAgentToAgentMessage(
    sourceAgent: Agent,
    targetAgent: Agent,
    conversationHistory: Array<{ sender: string; content: string }>,
    context: {
      purpose: string;
      schedulingContext?: {
        proposedTime?: string;
        proposedLocation?: string;
        meetingType?: string;
      };
    },
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<object> {
    if (!this.initialized) {
      throw createAgentError('OpenAI service not initialized');
    }
    
    return generateAgentToAgentMessage(sourceAgent, targetAgent, conversationHistory, context, options);
  }
  
  /**
   * Analyzes scheduling options
   * 
   * @param availabilitySlots - Available time slots from calendars
   * @param userPreferences - Preferences of the current user
   * @param otherUserPreferences - Preferences of the other user
   * @param options - Additional options for the completion request
   * @returns Ranked list of scheduling options
   */
  async analyzeSchedulingOptions(
    availabilitySlots: Array<{ start: string; end: string }>,
    userPreferences: Record<string, any>,
    otherUserPreferences: Record<string, any>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<Array<{ start: string; end: string; score: number; reason: string }>> {
    if (!this.initialized) {
      throw createAgentError('OpenAI service not initialized');
    }
    
    return analyzeSchedulingOptions(availabilitySlots, userPreferences, otherUserPreferences, options);
  }
  
  /**
   * Generates a meeting proposal
   * 
   * @param meetingParameters - Basic parameters for the meeting
   * @param availabilityOptions - Available time options
   * @param userPreferences - User preferences for meetings
   * @param options - Additional options for the completion request
   * @returns Structured meeting proposal
   */
  async generateMeetingProposal(
    meetingParameters: {
      purpose: string;
      duration: number;
      participantIds: string[];
      meetingType?: string;
    },
    availabilityOptions: Array<{ start: string; end: string }>,
    userPreferences: Record<string, any>,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<object> {
    if (!this.initialized) {
      throw createAgentError('OpenAI service not initialized');
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
   * 
   * @returns Number of items in the cache
   */
  getCacheSize(): number {
    return this.cache.size;
  }
  
  /**
   * Checks if the service is initialized
   * 
   * @returns True if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export {
  OpenAIService,
  createOpenAIClient,
  generateCompletion,
  generateChatCompletion,
  generateStructuredOutput,
  generateAgentResponse,
  processAgentCommand,
  generateAgentToAgentMessage,
  analyzeSchedulingOptions,
  generateMeetingProposal
};