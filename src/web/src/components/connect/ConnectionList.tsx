import React, { useState, useEffect } from 'react'; // React core functionality for component creation and hooks
import classNames from 'classnames'; // v2.3.2 // Utility for conditionally joining class names

import Card from '../common/Card'; // Container component for each connection item
import Button from '../common/Button'; // Button components for message and disconnect actions
import { useConnectionStore } from '../../store/connectionStore'; // Global state store for connection management
import { useAgentStore } from '../../store/agentStore'; // Global state store for agent information
import { useWebSocket } from '../../hooks/useWebSocket'; // Hook for WebSocket communication between agents
import { formatDate } from '../../lib/utils/formatters'; // Format date values for display
import { IConnection } from '@app/types'; // Assuming @app/types is a local alias

interface ConnectionListProps {
  className?: string;
  onMessageClick?: (connectionId: string) => void;
}

/**
 * Renders a status badge for a connection
 * @param status 
 * @returns 
 */
const ConnectionStatusBadge = (status: string): JSX.Element => {
  let badgeColor = 'bg-green-100 text-green-800'; // Default to green for connected
  if (status === 'pending') {
    badgeColor = 'bg-yellow-100 text-yellow-800';
  } else if (status === 'disconnected') {
    badgeColor = 'bg-red-100 text-red-800';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
      {status}
    </span>
  );
};

/**
 * Component that displays a list of connected agents and provides actions to message or disconnect
 */
export const ConnectionList: React.FC<ConnectionListProps> = ({ className, onMessageClick }) => {
  // LD1: Extract className and onMessageClick from props
  // LD1: Get currentAgent from useAgentStore
  const { currentAgent } = useAgentStore();
  // LD1: Get connections, loading, fetchConnections, and disconnectConnection from useConnectionStore
  const { connections, loading, fetchConnections, disconnectConnection } = useConnectionStore();
  // LD1: Get sendMessage and connect from useWebSocket
  const { sendMessage, connect } = useWebSocket();
  // LD1: Initialize actionLoading state with useState to track which connection is being processed
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // LD1: Fetch connections on component mount using useEffect
  useEffect(() => {
    if (currentAgent) {
      fetchConnections(currentAgent.agentId);
    }
  }, [currentAgent, fetchConnections]);

  // LD1: Define handleDisconnect function to disconnect from a connection
  const handleDisconnect = async (connectionId: string) => {
    if (!currentAgent) return;

    setActionLoading(connectionId);
    try {
      await disconnectConnection(connectionId);
    } finally {
      setActionLoading(null);
    }
  };

  // LD1: Define handleMessage function to initiate agent communication
  const handleMessage = async (connectionId: string) => {
    onMessageClick?.(connectionId);
  };

  // LD1: Render a heading for the Connected Agents section
  return (
    <div className={className}>
      <h3>Connected Agents</h3>
      {/* LD1: If loading is true, render a loading indicator */}
      {loading && <p>Loading connections...</p>}
      {/* LD1: If no connections, render a message indicating no connections */}
      {(!loading && connections.length === 0) && <p>No connections yet.</p>}
      {/* LD1: Otherwise, render a list of connections using the Card component */}
      {!loading && connections.length > 0 && (
        <ul className="space-y-4">
          {connections.map((connection) => (
            <li key={connection.id}>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    {/* LD1: For each connection, display user information and connection date */}
                    <p>Connected to: {connection.recipientAgentId}</p>
                    <p>Since: {formatDate(connection.createdAt)}</p>
                    <ConnectionStatusBadge status={connection.status} />
                  </div>
                  {/* LD1: Provide Message and Disconnect buttons for each connection */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleMessage(connection.id)}
                      disabled={actionLoading === connection.id}
                      isLoading={actionLoading === connection.id}
                    >
                      Message
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDisconnect(connection.id)}
                      disabled={actionLoading === connection.id}
                      isLoading={actionLoading === connection.id}
                    >
                      {/* LD1: Disable buttons and show loading state for the connection being processed */}
                      Disconnect
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};