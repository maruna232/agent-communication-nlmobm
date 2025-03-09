import { NextRequest, NextResponse } from 'next/server'; // version: any
import {
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentService,
  StorageService,
  createAgentError,
  AgentStatus,
  IndexedDBStorage,
  DB_SCHEMA
} from '../../../lib/index';

// Initialize services (global scope for reuse)
let agentService: AgentService | null = null;
let storageService: StorageService | null = null;

/**
 * Initializes the required services if they haven't been initialized yet
 * @returns Promise resolving to true if initialization was successful
 */
async function initializeServices(): Promise<boolean> {
  try {
    // Check if storageService is already initialized
    if (!storageService) {
      // Create a new StorageService instance
      storageService = new StorageService();
    }

    // Initialize the storage service with the DB_SCHEMA
    if (!storageService.isInitialized()) {
      await storageService.initialize();
    }

    // Check if agentService is already initialized
    if (!agentService) {
      // Create a new AgentService instance
      agentService = new AgentService();
    }

    // Initialize the agent service with the storage service
    if (!agentService.isInitialized()) {
      await agentService.initialize(storageService);
    }

    // Return true if both services are initialized successfully
    return true;
  } catch (error) {
    console.error('Failed to initialize services:', error);
    return false;
  }
}

/**
 * Handles GET requests to retrieve agent information
 * @param request Next.js request object
 * @returns JSON response with agent data or error
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize services using initializeServices
    if (!await initializeServices()) {
      return NextResponse.json({ error: 'Failed to initialize services' }, { status: 500 });
    }

    // Extract query parameters from the request URL
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const userId = searchParams.get('userId');
    const conversationId = searchParams.get('conversationId');
    const approvalRequests = searchParams.get('approvalRequests');

    // If agentId is provided, retrieve the specific agent
    if (agentId) {
      const agent = await agentService!.getAgent(agentId);
      return NextResponse.json(agent);
    }

    // If userId is provided, retrieve the user's agent
    if (userId) {
      const agent = await agentService!.getUserAgent(userId);
      return NextResponse.json(agent);
    }

    // If conversationId is provided, retrieve the agent's conversations
    if (conversationId) {
      const conversations = await agentService!.getAgentConversations(conversationId);
      return NextResponse.json(conversations);
    }

    // If approvalRequests is provided, retrieve the user's approval requests
    if (approvalRequests) {
      const requests = await agentService!.getUserApprovalRequests(approvalRequests);
      return NextResponse.json(requests);
    }

    // If no parameters are provided, return an error
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error in GET request:', error);
    return NextResponse.json({ error: 'Failed to retrieve agent data' }, { status: 500 });
  }
}

/**
 * Handles POST requests to create a new agent
 * @param request Next.js request object
 * @returns JSON response with created agent or error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize services using initializeServices
    if (!await initializeServices()) {
      return NextResponse.json({ error: 'Failed to initialize services' }, { status: 500 });
    }

    // Parse the request body as a CreateAgentRequest
    const body = await request.json();
    const { userId, name, configuration } = body as CreateAgentRequest;

    // Validate the required fields (userId, name, configuration)
    if (!userId || !name || !configuration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Call agentService.createAgent with the request data
    const agent = await agentService!.createAgent(userId, { name, configuration });

    // Return the created agent as a JSON response
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

/**
 * Handles PUT requests to update an existing agent
 * @param request Next.js request object
 * @returns JSON response with updated agent or error
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize services using initializeServices
    if (!await initializeServices()) {
      return NextResponse.json({ error: 'Failed to initialize services' }, { status: 500 });
    }

    // Parse the request body as an UpdateAgentRequest
    const body = await request.json();
    const { agentId, name, configuration, status } = body as UpdateAgentRequest;

    // Validate the required fields (agentId)
    if (!agentId) {
      return NextResponse.json({ error: 'Missing required field: agentId' }, { status: 400 });
    }

    // Call agentService.updateAgent with the request data
    const agent = await agentService!.updateAgent(agentId, { name, configuration, status });

    // Return the updated agent as a JSON response
    return NextResponse.json(agent, { status: 200 });
  } catch (error) {
    console.error('Error in PUT request:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

/**
 * Handles PATCH requests to update an agent's status
 * @param request Next.js request object
 * @returns JSON response with updated agent or error
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize services using initializeServices
    if (!await initializeServices()) {
      return NextResponse.json({ error: 'Failed to initialize services' }, { status: 500 });
    }

    // Parse the request body to extract agentId and status
    const body = await request.json();
    const { agentId, status } = body as { agentId: string; status: AgentStatus };

    // Validate the required fields (agentId, status)
    if (!agentId || !status) {
      return NextResponse.json({ error: 'Missing required fields: agentId, status' }, { status: 400 });
    }

    // Call agentService.updateAgentStatus with the agentId and status
    const agent = await agentService!.updateAgentStatus(agentId, status);

    // Return the updated agent as a JSON response
    return NextResponse.json(agent, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH request:', error);
    return NextResponse.json({ error: 'Failed to update agent status' }, { status: 500 });
  }
}

/**
 * Handles DELETE requests to delete an agent
 * @param request Next.js request object
 * @returns JSON response with success status or error
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize services using initializeServices
    if (!await initializeServices()) {
      return NextResponse.json({ error: 'Failed to initialize services' }, { status: 500 });
    }

    // Extract the agentId from the request URL
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    // Validate that agentId is provided
    if (!agentId) {
      return NextResponse.json({ error: 'Missing required parameter: agentId' }, { status: 400 });
    }

    // Call agentService.deleteAgent with the agentId
    await agentService!.deleteAgent(agentId);

    // Return a success response if deletion was successful
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE request:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}