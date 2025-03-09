import { create } from 'zustand'; // v4.4.0
import { persist, createJSONStorage } from 'zustand/middleware'; // v4.4.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { CONNECTION_STATUS } from '../lib/constants';
import {
  Agent,
  AgentApprovalRequest,
  ApprovalType,
  ApprovalStatus,
} from '../lib/types/agent.types';
import { useAuthStore } from './authStore';
import { useAgentStore } from './agentStore';
import {
  getFromStorage,
  saveToStorage,
  updateInStorage,
  deleteFromStorage,
} from '../lib/storage/indexedDB';
import { connectToWebSocket, disconnectFromWebSocket } from '../services/websocket.service';
import { IConnection, IConnectionMetadata, IConnectionRequest, IConnectionUpdateRequest, ConnectionState } from '@app/types'; // Assuming @app/types is a local alias

/**
 * Defines the structure of the connection store slice
 */
interface ConnectionSlice {
  connections: IConnection[];
  pendingConnections: IConnection[];
  loading: boolean;
  error: string | null;
  setConnections: (connections: IConnection[]) => void;
  setPendingConnections: (pendingConnections: IConnection[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Defines the structure of the connection operations slice
 */
interface ConnectionOperationsSlice {
  fetchConnections: (agentId: string) => Promise<IConnection[]>;
  fetchPendingConnections: (agentId: string) => Promise<IConnection[]>;
  createConnectionRequest: (initiatorAgentId: string, recipientAgentId: string, purpose: string, metadata?: IConnectionMetadata) => Promise<IConnection>;
  acceptConnectionRequest: (connectionId: string) => Promise<IConnection>;
  rejectConnectionRequest: (connectionId: string) => Promise<IConnection>;
  disconnectConnection: (connectionId: string) => Promise<IConnection>;
  searchUsers: (searchTerm: string) => Promise<Agent[]>;
  handleApprovalResponse: (requestId: string, status: ApprovalStatus) => Promise<IConnection | null>;
}

/**
 * Defines the complete connection store
 */
type ConnectionStore = ConnectionSlice & ConnectionOperationsSlice;

/**
 * Creates a slice of the connection store related to connection state and operations
 * @param set Zustand set function
 * @param get Zustand get function
 * @returns Connection state slice with actions
 */
const createConnectionSlice = (set: any, get: any): ConnectionSlice => ({
  connections: [],
  pendingConnections: [],
  loading: false,
  error: null,
  setConnections: (connections: IConnection[]) => set({ connections }),
  setPendingConnections: (pendingConnections: IConnection[]) => set({ pendingConnections }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
});

/**
 * Creates a slice of the connection store related to connection operations
 * @param set Zustand set function
 * @param get Zustand get function
 * @returns Connection operations slice with actions
 */
const createConnectionOperationsSlice = (set: any, get: any): ConnectionOperationsSlice => ({
  fetchConnections: async (agentId: string): Promise<IConnection[]> => {
    set({ loading: true, error: null });
    try {
      const connections = await getFromStorage<IConnection>('connections', null, 'userId', agentId);
      const connectedConnections = connections?.filter(conn => conn.status === CONNECTION_STATUS.CONNECTED) || [];
      set({ connections: connectedConnections });
      return connectedConnections;
    } catch (error: any) {
      set({ error: `Failed to fetch connections: ${error.message}` });
      return [];
    } finally {
      set({ loading: false });
    }
  },
  fetchPendingConnections: async (agentId: string): Promise<IConnection[]> => {
    set({ loading: true, error: null });
    try {
      const connections = await getFromStorage<IConnection>('connections', null, 'userId', agentId);
      const pendingConnections = connections?.filter(conn => conn.status === CONNECTION_STATUS.PENDING) || [];
      set({ pendingConnections: pendingConnections });
      return pendingConnections;
    } catch (error: any) {
      set({ error: `Failed to fetch pending connections: ${error.message}` });
      return [];
    } finally {
      set({ loading: false });
    }
  },
  createConnectionRequest: async (initiatorAgentId: string, recipientAgentId: string, purpose: string, metadata: IConnectionMetadata = {}): Promise<IConnection> => {
    set({ loading: true, error: null });
    try {
      // Check if a connection already exists
      const existingConnection = await getConnectionByAgents(initiatorAgentId, recipientAgentId);
      if (existingConnection) {
        throw new Error('A connection already exists between these agents');
      }

      const connectionId = uuidv4();
      const newConnection: IConnection = {
        id: connectionId,
        initiatorAgentId: initiatorAgentId,
        recipientAgentId: recipientAgentId,
        status: CONNECTION_STATUS.PENDING,
        purpose: purpose,
        metadata: metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await saveToStorage('connections', newConnection);

      // Create approval request for the recipient user
      const { createApprovalReq } = useAgentStore.getState();
      const { user } = useAuthStore.getState();
      if (user) {
        await createApprovalReq(
          initiatorAgentId,
          user.userId,
          ApprovalType.CONNECTION_REQUEST,
          { connectionId: connectionId },
        );
      }

      set((state: any) => ({ pendingConnections: [...state.pendingConnections, newConnection] }));
      return newConnection;
    } catch (error: any) {
      set({ error: `Failed to create connection request: ${error.message}` });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  acceptConnectionRequest: async (connectionId: string): Promise<IConnection> => {
    set({ loading: true, error: null });
    try {
      const connection = await getFromStorage<IConnection>('connections', connectionId);
      if (!connection) {
        throw new Error('Connection request not found');
      }

      if (connection.status !== CONNECTION_STATUS.PENDING) {
        throw new Error('Connection is not in pending state');
      }

      const updatedConnection: IConnection = {
        ...connection,
        status: CONNECTION_STATUS.CONNECTED,
        metadata: { ...connection.metadata, userApproved: true },
        updatedAt: new Date(),
      };

      await updateInStorage('connections', connectionId, updatedConnection);

      set((state: any) => ({
        connections: [...state.connections, updatedConnection],
        pendingConnections: state.pendingConnections.filter((conn: IConnection) => conn.id !== connectionId),
      }));

      return updatedConnection;
    } catch (error: any) {
      set({ error: `Failed to accept connection request: ${error.message}` });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  rejectConnectionRequest: async (connectionId: string): Promise<IConnection> => {
    set({ loading: true, error: null });
    try {
      const connection = await getFromStorage<IConnection>('connections', connectionId);
      if (!connection) {
        throw new Error('Connection request not found');
      }

      if (connection.status !== CONNECTION_STATUS.PENDING) {
        throw new Error('Connection is not in pending state');
      }

      const updatedConnection: IConnection = {
        ...connection,
        status: CONNECTION_STATUS.REJECTED,
        updatedAt: new Date(),
      };

      await updateInStorage('connections', connectionId, updatedConnection);

      set((state: any) => ({
        pendingConnections: state.pendingConnections.filter((conn: IConnection) => conn.id !== connectionId),
      }));

      return updatedConnection;
    } catch (error: any) {
      set({ error: `Failed to reject connection request: ${error.message}` });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  disconnectConnection: async (connectionId: string): Promise<IConnection> => {
    set({ loading: true, error: null });
    try {
      const connection = await getFromStorage<IConnection>('connections', connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      if (connection.status !== CONNECTION_STATUS.CONNECTED) {
        throw new Error('Connection is not in connected state');
      }

      const updatedConnection: IConnection = {
        ...connection,
        status: CONNECTION_STATUS.DISCONNECTED,
        updatedAt: new Date(),
      };

      await updateInStorage('connections', connectionId, updatedConnection);

      set((state: any) => ({
        connections: state.connections.filter((conn: IConnection) => conn.id !== connectionId),
      }));

      return updatedConnection;
    } catch (error: any) {
      set({ error: `Failed to disconnect connection: ${error.message}` });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  searchUsers: async (searchTerm: string): Promise<Agent[]> => {
    set({ loading: true, error: null });
    try {
      // Simulate searching for users (replace with actual search logic)
      const allAgents = await getFromStorage<Agent>('agents');
      if (!allAgents) {
        return [];
      }
      
      const { currentAgent } = useAgentStore.getState();
      
      // Filter out the current user's agent
      const otherAgents = allAgents.filter(agent => agent.agentId !== currentAgent?.agentId);

      // Filter out agents that already have connections with the current agent
      const connectedAgentIds = get().connections.map(conn => conn.initiatorAgentId === currentAgent?.agentId ? conn.recipientAgentId : conn.initiatorAgentId);
      const unconnectedAgents = otherAgents.filter(agent => !connectedAgentIds.includes(agent.agentId));

      const matchingAgents = unconnectedAgents.filter(agent =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.userId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      set({ loading: false });
      return matchingAgents;
    } catch (error: any) {
      set({ error: `Failed to search users: ${error.message}` });
      return [];
    } finally {
      set({ loading: false });
    }
  },
  handleApprovalResponse: async (requestId: string, status: ApprovalStatus): Promise<IConnection | null> => {
    set({ loading: true, error: null });
    try {
      const { respondToApproval } = useAgentStore.getState();
      const approvalRequest = await respondToApproval(requestId, status);
      if (!approvalRequest) {
        throw new Error('Approval request not found');
      }

      const connectionId = approvalRequest.data.connectionId;
      if (!connectionId) {
        throw new Error('Connection ID not found in approval request data');
      }

      let updatedConnection: IConnection;
      if (status === ApprovalStatus.APPROVED) {
        updatedConnection = await get().acceptConnectionRequest(connectionId);
      } else {
        updatedConnection = await get().rejectConnectionRequest(connectionId);
      }

      return updatedConnection;
    } catch (error: any) {
      set({ error: `Failed to handle approval response: ${error.message}` });
      return null;
    } finally {
      set({ loading: false });
    }
  },
});

/**
 * Helper function to retrieve a connection between two specific agents if it exists
 * @param agentId1 The ID of the first agent
 * @param agentId2 The ID of the second agent
 * @returns Promise resolving to the connection or null if not found
 */
async function getConnectionByAgents(agentId1: string, agentId2: string): Promise<IConnection | null> {
  try {
    const connections = await getFromStorage<IConnection>('connections');
    if (!connections) {
      return null;
    }

    const connection = connections.find(conn =>
      (conn.initiatorAgentId === agentId1 && conn.recipientAgentId === agentId2) ||
      (conn.initiatorAgentId === agentId2 && conn.recipientAgentId === agentId1)
    );

    return connection || null;
  } catch (error) {
    console.error('Failed to get connection by agents:', error);
    return null;
  }
}

/**
 * Global state store for managing agent connections
 */
export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      ...createConnectionSlice(set, get),
      ...createConnectionOperationsSlice(set, get),
    }),
    {
      name: 'connection-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        connections: state.connections,
        pendingConnections: state.pendingConnections,
      }),
    }
  )
);