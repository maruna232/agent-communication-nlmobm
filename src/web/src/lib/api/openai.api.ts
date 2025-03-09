/**
 * OpenAI API Integration
 * 
 * This file provides functions for interacting with OpenAI's GPT-4o model
 * to enable natural language processing, agent intelligence, and scheduling tasks
 * while maintaining the privacy-first approach of the application.
 */

import OpenAI from 'openai'; // v4.0.0
import { 
  createAgentError, 
  createNetworkError, 
  formatApiError 
} from '../utils/errorHandling';
import { 
  DEFAULT_CONFIG, 
  MAX_RETRY_ATTEMPTS 
} from '../constants';
import { AgentCommand } from '../types/agent.types';

// API key from environment variables
const API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

// Initialize a global instance for reuse
let openaiClient: OpenAI;

/**
 * Creates and configures an OpenAI API client instance
 * 
 * @returns Configured OpenAI client instance
 */
export function createOpenAIClient(): OpenAI {
  if (!API_KEY) {
    throw createAgentError('OpenAI API key is missing. Please check your environment variables.', {
      service: 'OpenAI',
      operation: 'createClient'
    });
  }

  if (openaiClient) {
    return openaiClient;
  }

  openaiClient = new OpenAI({
    apiKey: API_KEY,
    dangerouslyAllowBrowser: true, // Required for client-side usage
    timeout: 30000, // 30 seconds timeout
    maxRetries: 0 // We'll handle retries ourselves for more control
  });

  return openaiClient;
}

/**
 * Generates a text completion from OpenAI based on the provided prompt
 * 
 * @param prompt - The text prompt to generate completion for
 * @param options - Additional options for the completion request
 * @returns Promise resolving to the generated text
 */
export async function generateCompletion(
  prompt: string, 
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  try {
    const client = createOpenAIClient();
    
    const response = await handleOpenAIError(
      async () => client.completions.create({
        model: options.model || 'gpt-4o',
        prompt,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 500,
      }),
      1,
      MAX_RETRY_ATTEMPTS.API
    );
    
    return response.choices[0]?.text || '';
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to generate completion: ${error.message}`, {
        service: 'OpenAI',
        operation: 'generateCompletion',
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Generates a chat completion from OpenAI based on the provided messages
 * 
 * @param messages - Array of chat messages in the OpenAI format
 * @param options - Additional options for the chat completion request
 * @returns Promise resolving to the generated response text
 */
export async function generateChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: { model?: string; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  try {
    const client = createOpenAIClient();
    
    const response = await handleOpenAIError(
      async () => client.chat.completions.create({
        model: options.model || 'gpt-4o',
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1000,
      }),
      1,
      MAX_RETRY_ATTEMPTS.API
    );
    
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to generate chat completion: ${error.message}`, {
        service: 'OpenAI',
        operation: 'generateChatCompletion',
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Generates a structured JSON output from OpenAI based on the provided prompt and schema
 * 
 * @param prompt - The text prompt to generate structured output for
 * @param schema - The JSON schema defining the expected response structure
 * @param options - Additional options for the request
 * @returns Promise resolving to the structured output as an object
 */
export async function generateStructuredOutput(
  prompt: string,
  schema: Record<string, any>,
  options: { model?: string; temperature?: number } = {}
): Promise<any> {
  try {
    const client = createOpenAIClient();
    
    const systemPrompt = `You are a helpful AI assistant that provides structured data. 
Please respond with valid JSON that conforms to the provided schema. 
Do not include explanations or additional text outside the JSON structure.`;

    const response = await handleOpenAIError(
      async () => client.chat.completions.create({
        model: options.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Schema: ${JSON.stringify(schema)}\n\nPrompt: ${prompt}` }
        ],
        temperature: options.temperature ?? 0.3,
        response_format: { type: 'json_object' }
      }),
      1,
      MAX_RETRY_ATTEMPTS.API
    );
    
    const content = response.choices[0]?.message?.content || '';
    
    try {
      return JSON.parse(content);
    } catch (parseError) {
      throw createAgentError('Failed to parse structured output as JSON', {
        service: 'OpenAI',
        operation: 'generateStructuredOutput',
        content,
        originalError: parseError
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to generate structured output: ${error.message}`, {
        service: 'OpenAI',
        operation: 'generateStructuredOutput',
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Generates a response from the AI agent based on user input and context
 * 
 * @param userInput - The user's message or command
 * @param context - Context information including user preferences and conversation history
 * @param options - Additional options for the request
 * @returns Promise resolving to the agent's response text
 */
export async function generateAgentResponse(
  userInput: string,
  context: { 
    agentName?: string; 
    userPreferences?: Record<string, any>; 
    conversationHistory?: Array<{ role: string; content: string }>;
  } = {},
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  try {
    // Prepare system prompt with agent personality and constraints
    const systemPrompt = `You are ${context.agentName || 'an AI assistant'} that helps with scheduling and coordination tasks. 
You are friendly, efficient, and respectful of user privacy. 
You can suggest times for meetings, help coordinate with other people's agents, and manage calendar events.
You should be transparent about your abilities and limitations.`;

    // Add user preferences to the system prompt if available
    const preferencesPrompt = context.userPreferences 
      ? `\n\nUser preferences: ${JSON.stringify(context.userPreferences, null, 2)}`
      : '';
    
    // Create messages array with system, context, and user messages
    const messages = [
      { role: 'system', content: systemPrompt + preferencesPrompt },
      // Add conversation history if available
      ...(context.conversationHistory || []).map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })),
      // Add current user input
      { role: 'user', content: userInput }
    ];
    
    return await generateChatCompletion(messages, options);
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to generate agent response: ${error.message}`, {
        service: 'OpenAI',
        operation: 'generateAgentResponse',
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Processes a structured command through the AI agent
 * 
 * @param command - The command object containing type and parameters
 * @param context - Context information including user preferences and constraints
 * @param options - Additional options for the request
 * @returns Promise resolving to the processed command result
 */
export async function processAgentCommand(
  command: AgentCommand,
  context: { 
    userPreferences?: Record<string, any>;
    constraints?: Record<string, any>;
  } = {},
  options: { temperature?: number } = {}
): Promise<any> {
  try {
    // Prepare a specialized prompt based on command type
    let prompt = `Process the following command: "${command.command}"\n`;
    prompt += `Command parameters: ${JSON.stringify(command.parameters, null, 2)}\n`;
    
    if (context.userPreferences) {
      prompt += `User preferences: ${JSON.stringify(context.userPreferences, null, 2)}\n`;
    }
    
    if (context.constraints) {
      prompt += `Constraints: ${JSON.stringify(context.constraints, null, 2)}\n`;
    }
    
    // Define the expected response schema based on command type
    // This is a simplified example - you would have more detailed schemas in production
    const schema = {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['success', 'failure', 'pending'] },
        result: { type: 'object' },
        message: { type: 'string' },
        nextSteps: { type: 'array', items: { type: 'string' } }
      },
      required: ['status', 'message']
    };
    
    return await generateStructuredOutput(prompt, schema, {
      temperature: options.temperature ?? 0.3,
      model: 'gpt-4o'
    });
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to process agent command: ${error.message}`, {
        service: 'OpenAI',
        operation: 'processAgentCommand',
        command: command.command,
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Generates a message from one agent to another for scheduling negotiation
 * 
 * @param sourceAgent - Information about the source agent
 * @param targetAgent - Information about the target agent
 * @param conversationHistory - Previous messages in the conversation
 * @param context - Additional context for the generation
 * @param options - Additional options for the request
 * @returns Promise resolving to a structured message for agent-to-agent communication
 */
export async function generateAgentToAgentMessage(
  sourceAgent: { agentId: string; name: string; preferences: Record<string, any> },
  targetAgent: { agentId: string; name: string; preferences?: Record<string, any> },
  conversationHistory: Array<{ senderId: string; content: string; timestamp: number }>,
  context: { purpose: string; parameters?: Record<string, any> },
  options: { temperature?: number } = {}
): Promise<any> {
  try {
    // Prepare a specialized prompt for agent-to-agent communication
    let prompt = `You are ${sourceAgent.name}, an AI agent representing your user in a conversation with ${targetAgent.name}.\n`;
    prompt += `Purpose of communication: ${context.purpose}\n\n`;
    
    // Add source agent's preferences
    prompt += `Your preferences: ${JSON.stringify(sourceAgent.preferences, null, 2)}\n\n`;
    
    // Add target agent's preferences if available
    if (targetAgent.preferences) {
      prompt += `${targetAgent.name}'s preferences: ${JSON.stringify(targetAgent.preferences, null, 2)}\n\n`;
    }
    
    // Add conversation parameters if available
    if (context.parameters) {
      prompt += `Parameters: ${JSON.stringify(context.parameters, null, 2)}\n\n`;
    }
    
    // Add conversation history
    prompt += "Conversation history:\n";
    conversationHistory.forEach(msg => {
      const senderName = msg.senderId === sourceAgent.agentId 
        ? sourceAgent.name : targetAgent.name;
      prompt += `${senderName} (${new Date(msg.timestamp).toISOString()}): ${msg.content}\n`;
    });
    
    prompt += "\nGenerate your next message to continue this conversation effectively.";
    
    // Define the expected message schema
    const schema = {
      type: 'object',
      properties: {
        content: { type: 'string' },
        intent: { type: 'string' },
        proposedAction: { type: 'object' },
        requiresResponse: { type: 'boolean' }
      },
      required: ['content', 'intent', 'requiresResponse']
    };
    
    return await generateStructuredOutput(prompt, schema, {
      temperature: options.temperature ?? 0.7,
      model: 'gpt-4o'
    });
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to generate agent-to-agent message: ${error.message}`, {
        service: 'OpenAI',
        operation: 'generateAgentToAgentMessage',
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Analyzes scheduling options based on calendar availability and preferences
 * 
 * @param availabilitySlots - Array of available time slots from calendar
 * @param userPreferences - User scheduling preferences
 * @param otherUserPreferences - Other user's scheduling preferences if available
 * @param options - Additional options for the request
 * @returns Promise resolving to ranked list of scheduling options
 */
export async function analyzeSchedulingOptions(
  availabilitySlots: Array<{ start: string; end: string }>,
  userPreferences: Record<string, any>,
  otherUserPreferences: Record<string, any> = {},
  options: { temperature?: number } = {}
): Promise<Array<{ start: string; end: string; score: number; reason: string }>> {
  try {
    // Prepare a specialized prompt for scheduling analysis
    let prompt = `Analyze the following availability slots and preferences to recommend optimal meeting times.\n\n`;
    prompt += `Available time slots:\n${JSON.stringify(availabilitySlots, null, 2)}\n\n`;
    prompt += `User preferences:\n${JSON.stringify(userPreferences, null, 2)}\n\n`;
    
    if (Object.keys(otherUserPreferences).length > 0) {
      prompt += `Other participant's preferences:\n${JSON.stringify(otherUserPreferences, null, 2)}\n\n`;
    }
    
    prompt += `Please rank the available slots based on how well they match the preferences, giving each a score from 0-100 and a brief explanation.`;
    
    // Define the expected response schema for ranked options
    const schema = {
      type: 'object',
      properties: {
        rankedOptions: {
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
      required: ['rankedOptions']
    };
    
    const result = await generateStructuredOutput(prompt, schema, {
      temperature: options.temperature ?? 0.3,
      model: 'gpt-4o'
    });
    
    return result.rankedOptions;
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to analyze scheduling options: ${error.message}`, {
        service: 'OpenAI',
        operation: 'analyzeSchedulingOptions',
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Generates a meeting proposal based on user preferences and availability
 * 
 * @param meetingParameters - Parameters for the meeting (type, duration, etc.)
 * @param availabilityOptions - Available time slots for the meeting
 * @param userPreferences - User preferences for meeting arrangements
 * @param options - Additional options for the request
 * @returns Promise resolving to a structured meeting proposal
 */
export async function generateMeetingProposal(
  meetingParameters: {
    purpose: string;
    duration: number;
    participantNames: string[];
    meetingType?: string;
  },
  availabilityOptions: Array<{ start: string; end: string }>,
  userPreferences: Record<string, any>,
  options: { temperature?: number } = {}
): Promise<any> {
  try {
    // Prepare a specialized prompt for meeting proposal generation
    let prompt = `Generate a meeting proposal based on the following parameters:\n\n`;
    prompt += `Meeting purpose: ${meetingParameters.purpose}\n`;
    prompt += `Duration: ${meetingParameters.duration} minutes\n`;
    prompt += `Participants: ${meetingParameters.participantNames.join(', ')}\n`;
    
    if (meetingParameters.meetingType) {
      prompt += `Meeting type: ${meetingParameters.meetingType}\n`;
    }
    
    prompt += `\nAvailable time slots:\n${JSON.stringify(availabilityOptions, null, 2)}\n\n`;
    prompt += `User preferences:\n${JSON.stringify(userPreferences, null, 2)}\n\n`;
    
    prompt += `Create an optimal meeting proposal considering the parameters, availability, and preferences.`;
    
    // Define the expected proposal schema
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        proposedTime: { 
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' }
          },
          required: ['start', 'end']
        },
        location: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { type: 'string', nullable: true },
            locationType: { type: 'string' }
          },
          required: ['name', 'locationType']
        },
        alternativeOptions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' }
            },
            required: ['start', 'end']
          }
        },
        reasoning: { type: 'string' }
      },
      required: ['title', 'description', 'proposedTime', 'location', 'reasoning']
    };
    
    return await generateStructuredOutput(prompt, schema, {
      temperature: options.temperature ?? 0.4,
      model: 'gpt-4o'
    });
  } catch (error) {
    if (error instanceof Error) {
      throw createAgentError(`Failed to generate meeting proposal: ${error.message}`, {
        service: 'OpenAI',
        operation: 'generateMeetingProposal',
        originalError: error
      });
    }
    throw error;
  }
}

/**
 * Handles errors from the OpenAI API with appropriate retry logic
 * 
 * @param operation - The operation function to retry
 * @param attempt - Current attempt number
 * @param maxAttempts - Maximum number of retry attempts
 * @returns Promise resolving to the operation result or throws after max attempts
 */
async function handleOpenAIError<T>(
  operation: () => Promise<T>,
  attempt: number = 1,
  maxAttempts: number = DEFAULT_CONFIG.MESSAGE_RETRY_ATTEMPTS
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const err = error as Error;
    
    // Handle rate limiting errors (429)
    if (err.message?.includes('429') || err.message?.includes('rate limit') || err.message?.includes('too many requests')) {
      if (attempt < maxAttempts) {
        // Calculate backoff with jitter for rate limit errors
        const backoffTime = calculateBackoff(attempt, 2000, 60000);
        
        console.warn(`OpenAI rate limit exceeded. Retrying in ${backoffTime}ms (Attempt ${attempt}/${maxAttempts})`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return handleOpenAIError(operation, attempt + 1, maxAttempts);
      } else {
        throw createNetworkError('OpenAI rate limit exceeded. Please try again later.', {
          service: 'OpenAI',
          statusCode: 429,
          attempts: attempt,
          originalError: err
        });
      }
    }
    
    // Handle server errors (5xx)
    if (err.message?.includes('5') || err.message?.includes('server error')) {
      if (attempt < maxAttempts) {
        // Calculate backoff with jitter for server errors
        const backoffTime = calculateBackoff(attempt, 1000, 30000);
        
        console.warn(`OpenAI server error. Retrying in ${backoffTime}ms (Attempt ${attempt}/${maxAttempts})`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return handleOpenAIError(operation, attempt + 1, maxAttempts);
      } else {
        throw createNetworkError('OpenAI service is currently unavailable. Please try again later.', {
          service: 'OpenAI',
          statusCode: 500,
          attempts: attempt,
          originalError: err
        });
      }
    }
    
    // Handle authentication errors
    if (err.message?.includes('401') || err.message?.includes('authentication') || err.message?.includes('invalid api key')) {
      throw createNetworkError('Invalid OpenAI API key. Please check your configuration.', {
        service: 'OpenAI',
        statusCode: 401,
        originalError: err
      });
    }
    
    // Handle other errors
    throw formatApiError({
      status: 500,
      data: {
        message: `OpenAI API error: ${err.message}`,
        code: 'openai_error'
      }
    });
  }
}

/**
 * Calculates exponential backoff time with jitter for retries
 * 
 * @param attempt - Current attempt number
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Calculated delay time in milliseconds
 */
function calculateBackoff(
  attempt: number, 
  baseDelay: number = 1000, 
  maxDelay: number = 30000
): number {
  // Calculate exponential backoff: 2^attempt * baseDelay
  const expBackoff = Math.min(maxDelay, Math.pow(2, attempt) * baseDelay);
  
  // Add random jitter to prevent all clients from retrying simultaneously
  const jitter = Math.random() * 0.3 * expBackoff;
  
  return Math.floor(expBackoff + jitter);
}