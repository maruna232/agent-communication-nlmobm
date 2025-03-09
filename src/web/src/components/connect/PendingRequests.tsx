import React, { useEffect, useState, useCallback } from 'react'; // React v18.0+
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Loading } from '../common/Loading';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { useConnectionStore } from '../../store/connectionStore';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { APPROVAL_TYPES } from '../../lib/constants';

/**
 * Interface defining the properties for the PendingRequests component
 */
interface PendingRequestsProps {
  className?: string;
  title?: string;
  showHeader?: boolean;
  emptyMessage?: string;
  onAccept?: (connectionId: string) => void;
  onReject?: (connectionId: string) => void;
  testId?: string;
}

/**
 * Component that displays pending connection requests and allows users to accept or reject them
 */
export const PendingRequests: React.FC<PendingRequestsProps> = ({
  className = '',
  title = 'Pending Connection Requests',
  showHeader = true,
  emptyMessage = 'No pending connection requests',
  onAccept,
  onReject,
  testId = 'pending-requests',
}) => {
  // Access connection state and actions from the connection store
  const { pendingConnections, loading, error, fetchPendingConnections, acceptConnectionRequest, rejectConnectionRequest } = useConnectionStore();

  // Access current user and authentication status from the auth hook
  const { user, isAuthenticated } = useAuth();

  // Access the addNotification function from the notifications hook
  const { addNotification } = useNotifications();

  // Initialize local loading states for accept/reject operations
  const [acceptLoading, setAcceptLoading] = useState<Record<string, boolean>>({});
  const [rejectLoading, setRejectLoading] = useState<Record<string, boolean>>({});

  // Fetch pending connections when the component mounts or the user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPendingConnections(user.userId);
    }
  }, [isAuthenticated, user, fetchPendingConnections]);

  /**
   * Handles accepting a connection request
   * @param connectionId The ID of the connection to accept
   */
  const handleAccept = useCallback(async (connectionId: string) => {
    setAcceptLoading(prev => ({ ...prev, [connectionId]: true }));
    try {
      await acceptConnectionRequest(connectionId);
      addNotification({
        type: 'success',
        message: 'Connection request accepted',
      });
      if (onAccept) {
        onAccept(connectionId);
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        message: `Failed to accept connection: ${err.message}`,
      });
    } finally {
      setAcceptLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  }, [acceptConnectionRequest, addNotification, onAccept]);

  /**
   * Handles rejecting a connection request
   * @param connectionId The ID of the connection to reject
   */
  const handleReject = useCallback(async (connectionId: string) => {
    setRejectLoading(prev => ({ ...prev, [connectionId]: true }));
    try {
      await rejectConnectionRequest(connectionId);
      addNotification({
        type: 'success',
        message: 'Connection request rejected',
      });
      if (onReject) {
        onReject(connectionId);
      }
    } catch (err: any) {
      addNotification({
        type: 'error',
        message: `Failed to reject connection: ${err.message}`,
      });
    } finally {
      setRejectLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  }, [rejectConnectionRequest, addNotification, onReject]);

  // Render loading indicator when fetching pending connections
  if (loading) {
    return <Loading label="Loading pending requests..." testId={`${testId}-loading`} />;
  }

  // Render error display if an error occurs
  if (error) {
    return <ErrorDisplay error={error} testId={`${testId}-error`} />;
  }

  // Render empty state message if no pending requests exist
  if (!pendingConnections || pendingConnections.length === 0) {
    return <Card className={className} testId={testId}>
      {showHeader && <h3 className="text-lg font-medium text-gray-800">{title}</h3>}
      <p className="text-gray-600">{emptyMessage}</p>
    </Card>;
  }

  return (
    <Card className={className} testId={testId}>
      {showHeader && <h3 className="text-lg font-medium text-gray-800">{title}</h3>}
      <ul>
        {pendingConnections.map(connection => (
          <li key={connection.id} className="py-2 border-b border-gray-200 last:border-b-0 flex items-center justify-between">
            <span>Connection Request from {connection.initiatorAgentId}</span>
            <div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleAccept(connection.id)}
                disabled={acceptLoading[connection.id]}
                ariaLabel={`Accept connection request from ${connection.initiatorAgentId}`}
                testId={`accept-${connection.id}`}
              >
                {acceptLoading[connection.id] ? 'Accepting...' : 'Accept'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleReject(connection.id)}
                disabled={rejectLoading[connection.id]}
                ariaLabel={`Reject connection request from ${connection.initiatorAgentId}`}
                testId={`reject-${connection.id}`}
                className="ml-2"
              >
                {rejectLoading[connection.id] ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export type { PendingRequestsProps };