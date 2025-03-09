import { NextRequest, NextResponse } from 'next/server'; //  ^14.0.0
import { v4 as uuidv4 } from 'uuid'; //  ^9.0.0

import {
  CONNECTION_STATUS,
} from '../../../lib/constants';
import { authService } from '../../../services/auth.service';
import { StorageService } from '../../../services/storage.service';
import { websocketService } from '../../../services/websocket.service';
import { createValidationError } from '../../../lib/utils/errorHandling';
import { Agent } from '../../../lib/types/agent.types';
import { IUser } from '../../../lib/types/auth.types';

// Define the store name for connections
const STORE_NAME = 'connections';

/**
 * Validates a connection request to ensure it contains all required fields
 * @param request The connection request object
 * @returns True if the request is valid, throws an error otherwise
 */
function validateConnectionRequest(request: any): boolean {
  if (typeof request?.initiatorAgentId !== 'string' || !request.initiatorAgentId) {
    throw createValidationError('Initiator agent ID must be a non-empty string');
  }

  if (typeof request?.recipientAgentId !== 'string' || !request.recipientAgentId) {
    throw createValidationError('Recipient agent ID must be a non-empty string');
  }

  if (request.initiatorAgentId === request.recipientAgentId) {
    throw createValidationError('Initiator and recipient agent IDs must be different');
  }

  if (typeof request?.purpose !== 'string' || !request.purpose) {
    throw createValidationError('Purpose must be a non-empty string');
  }

  return true;
}

/**
 * Validates a connection update request to ensure it contains valid fields
 * @param request The connection update request object
 * @returns True if the request is valid, throws an error otherwise
 */
function validateConnectionUpdateRequest(request: any): boolean {
  if (request.status && !Object.values(CONNECTION_STATUS).includes(request.status)) {
    throw createValidationError(`Invalid status: ${request.status}. Must be one of ${Object.values(CONNECTION_STATUS).join(', ')}`);
  }

  if (request.metadata && typeof request.metadata !== 'object') {
    throw createValidationError('Metadata must be an object');
  }

  return true;
}

/**
 * Validates that the current user owns the specified agent
 * @param agentId The ID of the agent to check
 * @param currentUser The current authenticated user
 * @returns Promise resolving to true if the user owns the agent, throws an error otherwise
 */
async function validateAgentOwnership(agentId: string, currentUser: IUser): Promise<boolean> {
  if (!currentUser) {
    throw createValidationError('Unauthorized: No authenticated user found');
  }

  if (currentUser.agentId === agentId) {
    return true;
  }

  // If not a direct match, query the storage service for the agent
  const storageService = new StorageService();
  const agent = await storageService.read<Agent>('agents', agentId);

  if (!agent) {
    throw createValidationError(`Agent with ID '${agentId}' not found`);
  }

  if (agent.userId !== currentUser.userId) {
    throw createValidationError('Unauthorized: User does not own this agent');
  }

  return true;
}

/**
 * Checks if a connection already exists between two agents
 * @param initiatorAgentId The ID of the agent initiating the connection
 * @param recipientAgentId The ID of the agent receiving the connection
 * @param storageService The storage service to use for querying
 * @returns Promise resolving to the existing connection or null if none exists
 */
async function checkExistingConnection(
  initiatorAgentId: string,
  recipientAgentId: string,
  storageService: StorageService
): Promise<object | null> {
  // Create a query to find connections where initiatorAgentId and recipientAgentId match (in either order)
  const query = {
    storeName: STORE_NAME,
    filter: (connection: any) =>
      (connection.initiatorAgentId === initiatorAgentId && connection.recipientAgentId === recipientAgentId) ||
      (connection.initiatorAgentId === recipientAgentId && connection.recipientAgentId === initiatorAgentId),
  };

  // Execute the query using the storage service
  const connections = await storageService.query(query);

  // Return the first connection found or null if none exists
  return connections.length > 0 ? connections[0] : null;
}

/**
 * Creates a new connection between two agents
 * @param request The connection request object
 * @param storageService The storage service to use for creating the connection
 * @returns Promise resolving to the created connection
 */
async function createConnection(request: any, storageService: StorageService): Promise<object> {
  // Validate the connection request
  validateConnectionRequest(request);

  // Check if a connection already exists between the agents
  const existingConnection = await checkExistingConnection(
    request.initiatorAgentId,
    request.recipientAgentId,
    storageService
  );

  if (existingConnection) {
    throw createValidationError('A connection already exists between these agents');
  }

  // Create a new connection object with a generated connectionId
  const connectionId = uuidv4();
  const newConnection = {
    id: connectionId,
    initiatorAgentId: request.initiatorAgentId,
    recipientAgentId: request.recipientAgentId,
    purpose: request.purpose,
    status: CONNECTION_STATUS.PENDING, // Set initial status to CONNECTION_STATUS.PENDING
    metadata: {
      initiatedBy: request.initiatorAgentId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    },
  };

  // Store the connection in the storage service
  await storageService.create(STORE_NAME, newConnection);

  // Return the created connection
  return newConnection;
}

/**
 * Retrieves a connection by its ID
 * @param connectionId The ID of the connection to retrieve
 * @param storageService The storage service to use for querying
 * @returns Promise resolving to the connection if found, throws an error otherwise
 */
async function getConnection(connectionId: string, storageService: StorageService): Promise<object> {
  // Query the storage service for the connection with the specified ID
  const connection = await storageService.read(STORE_NAME, connectionId);

  // If connection is not found, throw a not found error
  if (!connection) {
    throw createValidationError(`Connection with ID '${connectionId}' not found`);
  }

  // Return the connection
  return connection;
}

/**
 * Updates an existing connection
 * @param connectionId The ID of the connection to update
 * @param updateRequest The update request object
 * @param storageService The storage service to use for updating the connection
 * @returns Promise resolving to the updated connection
 */
async function updateConnection(
  connectionId: string,
  updateRequest: any,
  storageService: StorageService
): Promise<object> {
  // Validate the connection update request
  validateConnectionUpdateRequest(updateRequest);

  // Retrieve the existing connection by ID
  const existingConnection = await getConnection(connectionId, storageService);

  // Update the connection with the new status and/or metadata
  const updatedConnection = {
    ...existingConnection,
    ...updateRequest,
    metadata: {
      ...existingConnection.metadata,
      ...updateRequest.metadata,
      lastActivity: Date.now(), // Update the lastActivity timestamp
    },
  };

  // Store the updated connection in the storage service
  await storageService.update(STORE_NAME, connectionId, updatedConnection);

  // If status changed to CONNECTED, establish WebSocket connection
  if (updateRequest.status === CONNECTION_STATUS.CONNECTED) {
    // TODO: Implement WebSocket connection establishment
    console.log(`Establishing WebSocket connection for connection ID '${connectionId}'`);
  }

  // If status changed to DISCONNECTED or REJECTED, close WebSocket connection
  if (updateRequest.status === CONNECTION_STATUS.DISCONNECTED || updateRequest.status === CONNECTION_STATUS.REJECTED) {
    // TODO: Implement WebSocket connection closure
    console.log(`Closing WebSocket connection for connection ID '${connectionId}'`);
  }

  // Return the updated connection
  return updatedConnection;
}

/**
 * Deletes a connection between agents
 * @param connectionId The ID of the connection to delete
 * @param storageService The storage service to use for deleting the connection
 * @returns Promise resolving to true if the connection was deleted
 */
async function deleteConnection(connectionId: string, storageService: StorageService): Promise<boolean> {
  // Retrieve the existing connection by ID
  const existingConnection = await getConnection(connectionId, storageService);

  // TODO: Close any active WebSocket connection

  // Delete the connection from the storage service
  await storageService.delete(STORE_NAME, connectionId);

  // Return true if deletion was successful
  return true;
}

/**
 * Searches for connections based on query parameters
 * @param searchParams The search parameters from the request URL
 * @param storageService The storage service to use for querying
 * @returns Promise resolving to an array of matching connections
 */
async function searchConnections(searchParams: URLSearchParams, storageService: StorageService): Promise<object[]> {
  const agentId = searchParams.get('agentId');
  const status = searchParams.get('status');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  // Build a query based on the provided search parameters
  const query: any = {
    storeName: STORE_NAME,
  };

  // Apply filters for agentId (as either initiator or recipient)
  if (agentId) {
    query.filter = (connection: any) =>
      connection.initiatorAgentId === agentId || connection.recipientAgentId === agentId;
  }

  // Apply filter for status if provided
  if (status) {
    query.filter = (connection: any) => connection.status === status;
  }

  // Apply pagination with limit and offset
  if (limit) {
    query.limit = parseInt(limit, 10);
  }
  if (offset) {
    query.offset = parseInt(offset, 10);
  }

  // Execute the query using the storage service
  const connections = await storageService.query(query);

  // Return the array of matching connections
  return connections;
}

/**
 * Handles GET requests to retrieve connections
 * @param request The Next.js API request
 * @returns Promise resolving to the API response
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize the storage service
    const storageService = new StorageService();

    // Get the current authenticated user
    const currentUser = await authService.getCurrentUser();

    // Parse query parameters from the request URL
    const { searchParams } = new URL(request.url);

    // Extract connectionId from the URL if present
    const connectionId = searchParams.get('connectionId');

    if (connectionId) {
      // Get the specific connection
      const connection = await getConnection(connectionId, storageService);

      // Validate that the user owns one of the agents in the connection
      if (!connection.initiatorAgentId || !connection.recipientAgentId) {
        throw createValidationError('Connection object missing initiatorAgentId or recipientAgentId');
      }
      await validateAgentOwnership(connection.initiatorAgentId, currentUser!);
      await validateAgentOwnership(connection.recipientAgentId, currentUser!);

      // Return the connection in the response
      return NextResponse.json(connection);
    } else {
      // Ensure the agentId in search params belongs to the current user
      const agentId = searchParams.get('agentId');
      if (agentId) {
        await validateAgentOwnership(agentId, currentUser!);
      }

      // Search for connections based on query parameters
      const connections = await searchConnections(searchParams, storageService);

      // Return the connection(s) in the response
      return NextResponse.json(connections);
    }
  } catch (error: any) {
    // Handle errors and return appropriate error responses
    console.error('GET request failed:', error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

/**
 * Handles POST requests to create new connections
 * @param request The Next.js API request
 * @returns Promise resolving to the API response
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize the storage service
    const storageService = new StorageService();

    // Get the current authenticated user
    const currentUser = await authService.getCurrentUser();

    // Parse the request body as a connection request
    const connectionRequest = await request.json();

    // Validate that the user owns the initiator agent
    await validateAgentOwnership(connectionRequest.initiatorAgentId, currentUser!);

    // Create the connection using the createConnection function
    const newConnection = await createConnection(connectionRequest, storageService);

    // Return the created connection in the response
    return NextResponse.json(newConnection, { status: 201 });
  } catch (error: any) {
    // Handle errors and return appropriate error responses
    console.error('POST request failed:', error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

/**
 * Handles PUT requests to update existing connections
 * @param request The Next.js API request
 * @returns Promise resolving to the API response
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize the storage service
    const storageService = new StorageService();

    // Get the current authenticated user
    const currentUser = await authService.getCurrentUser();

    // Parse the request body as a connection update request
    const connectionUpdateRequest = await request.json();

    // Extract connectionId from the URL
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      throw createValidationError('Connection ID is required');
    }

    // Get the existing connection
    const existingConnection = await getConnection(connectionId, storageService);

    // Validate that the user owns one of the agents in the connection
    if (!existingConnection.initiatorAgentId || !existingConnection.recipientAgentId) {
      throw createValidationError('Connection object missing initiatorAgentId or recipientAgentId');
    }
    await validateAgentOwnership(existingConnection.initiatorAgentId, currentUser!);
    await validateAgentOwnership(existingConnection.recipientAgentId, currentUser!);

    // Update the connection using the updateConnection function
    const updatedConnection = await updateConnection(
      connectionId,
      connectionUpdateRequest,
      storageService
    );

    // Return the updated connection in the response
    return NextResponse.json(updatedConnection);
  } catch (error: any) {
    // Handle errors and return appropriate error responses
    console.error('PUT request failed:', error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

/**
 * Handles DELETE requests to remove connections
 * @param request The Next.js API request
 * @returns Promise resolving to the API response
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize the storage service
    const storageService = new StorageService();

    // Get the current authenticated user
    const currentUser = await authService.getCurrentUser();

    // Extract connectionId from the URL
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      throw createValidationError('Connection ID is required');
    }

    // Get the existing connection
    const existingConnection = await getConnection(connectionId, storageService);

    // Validate that the user owns one of the agents in the connection
    if (!existingConnection.initiatorAgentId || !existingConnection.recipientAgentId) {
      throw createValidationError('Connection object missing initiatorAgentId or recipientAgentId');
    }
    await validateAgentOwnership(existingConnection.initiatorAgentId, currentUser!);
    await validateAgentOwnership(existingConnection.recipientAgentId, currentUser!);

    // Delete the connection using the deleteConnection function
    await deleteConnection(connectionId, storageService);

    // Return a success response
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    // Handle errors and return appropriate error responses
    console.error('DELETE request failed:', error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}