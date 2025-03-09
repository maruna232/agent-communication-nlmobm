import React, { useMemo } from 'react'; // React v18.0+
import { Card } from '../common/Card';
import { Loading } from '../common/Loading';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAgent } from '../../hooks/useAgent';
import { useCalendar } from '../../hooks/useCalendar';
import { useNotifications } from '../../hooks/useNotifications';
import { WebSocketConnectionStatus } from '../../lib/types/websocket.types';
import { CALENDAR_SYNC_STATUS } from '../../lib/constants';
import { getRelativeDateString } from '../../lib/utils/dateTime';

/**
 * Interface defining the properties for the StatusSummary component
 */
interface StatusSummaryProps {
  className?: string;
}

/**
 * A component that displays a summary of system status on the dashboard
 */
export const StatusSummary: React.FC<StatusSummaryProps> = ({ className = '' }) => {
  // LD1: Get WebSocket connection status from useWebSocket hook
  const { status: wsStatus } = useWebSocket();

  // LD1: Get agent status and approval requests from useAgent hook
  const { agent, isConnected: agentIsConnected, approvalRequests } = useAgent();

  // LD1: Get calendar sync status from useCalendar hook
  const { syncInfo, isCalendarConnected, isSyncing } = useCalendar();

  // LD1: Get notification status from useNotifications hook
  const { unreadCount, hasPendingApprovals } = useNotifications();

  // LD1: Use useMemo to compute connection status display information
  const connectionStatusDisplay = useMemo(() => {
    let statusText = '';
    let statusIcon = '⚫'; // Default disconnected icon
    let statusColor = 'text-gray-500'; // Default disconnected color

    switch (wsStatus) {
      case WebSocketConnectionStatus.CONNECTED:
        statusText = 'Connected';
        statusIcon = '🟢';
        statusColor = 'text-green-500';
        break;
      case WebSocketConnectionStatus.CONNECTING:
        statusText = 'Connecting...';
        statusIcon = '🟡';
        statusColor = 'text-yellow-500';
        break;
      case WebSocketConnectionStatus.RECONNECTING:
        statusText = 'Reconnecting...';
        statusIcon = '🟠';
        statusColor = 'text-orange-500';
        break;
      case WebSocketConnectionStatus.ERROR:
        statusText = 'Error';
        statusIcon = '🔴';
        statusColor = 'text-red-500';
        break;
      case WebSocketConnectionStatus.DISCONNECTED:
      default:
        statusText = 'Disconnected';
        break;
    }

    return { statusText, statusIcon, statusColor };
  }, [wsStatus]);

  // LD1: Use useMemo to compute agent status display information
  const agentStatusDisplay = useMemo(() => {
    let statusText = 'Agent Offline';
    let statusIcon = '⚫'; // Default offline icon
    let statusColor = 'text-gray-500'; // Default offline color

    if (agent) {
      if (agentIsConnected) {
        statusText = 'Agent Online';
        statusIcon = '🟢';
        statusColor = 'text-green-500';
      } else {
        statusText = 'Agent Disconnected';
        statusIcon = '🟠';
        statusColor = 'text-orange-500';
      }
    } else {
      statusText = 'Agent Not Configured';
      statusIcon = '⚫';
      statusColor = 'text-gray-500';
    }

    return { statusText, statusIcon, statusColor };
  }, [agent, agentIsConnected]);

  // LD1: Use useMemo to compute calendar sync status display information
  const calendarSyncStatusDisplay = useMemo(() => {
    let statusText = 'Calendar Not Connected';
    let statusIcon = '⚫'; // Default not connected icon
    let statusColor = 'text-gray-500'; // Default not connected color
    let lastSync = '';

    if (isCalendarConnected()) {
      if (isSyncing()) {
        statusText = 'Syncing...';
        statusIcon = '🟡';
        statusColor = 'text-yellow-500';
      } else if (syncInfo?.status === CALENDAR_SYNC_STATUS.SYNCED) {
        statusText = 'Synced';
        statusIcon = '🟢';
        statusColor = 'text-green-500';
        lastSync = syncInfo.lastSyncTime ? `(Last sync: ${getRelativeDateString(syncInfo.lastSyncTime)})` : '';
      } else if (syncInfo?.status === CALENDAR_SYNC_STATUS.ERROR) {
        statusText = 'Sync Error';
        statusIcon = '🔴';
        statusColor = 'text-red-500';
        lastSync = syncInfo.lastSyncTime ? `(Last sync: ${getRelativeDateString(syncInfo.lastSyncTime)})` : '';
      }
    }

    return { statusText, statusIcon, statusColor, lastSync };
  }, [syncInfo, isCalendarConnected, isSyncing]);

  // LD1: Use useMemo to compute approval requests status display information
  const approvalRequestsStatusDisplay = useMemo(() => {
    const pendingCount = approvalRequests?.length || 0;
    const hasPending = hasPendingApprovals();
    let statusText = `Approval Requests: ${pendingCount}`;
    let statusIcon = '⚫'; // Default icon
    let statusColor = 'text-gray-500'; // Default color

    if (hasPending) {
      statusText = `Approval Requests: ${pendingCount} Pending`;
      statusIcon = '❗';
      statusColor = 'text-red-500';
    }

    return { statusText, statusIcon, statusColor };
  }, [approvalRequests, hasPendingApprovals]);

  // LD1: Helper function to generate status indicator elements with appropriate colors and icons
  const getStatusIndicator = (status: string, label: string, description: string) => {
    let color = 'text-gray-500';
    let icon = '⚫';

    if (status === 'good') {
      color = 'text-green-500';
      icon = '🟢';
    } else if (status === 'warning') {
      color = 'text-yellow-500';
      icon = '🟡';
    } else if (status === 'error') {
      color = 'text-red-500';
      icon = '🔴';
    }

    return (
      <div className="flex items-center space-x-2">
        <span className={color}>{icon}</span>
        <span>
          <span className="font-medium">{label}</span>
          {description && <span className="text-sm text-gray-500"> {description}</span>}
        </span>
      </div>
    );
  };

  // LD1: Return the complete component JSX
  return (
    <Card title="System Status" className={className}>
      {getStatusIndicator(
        connectionStatusDisplay.statusColor === 'text-green-500' ? 'good' : connectionStatusDisplay.statusColor === 'text-yellow-500' ? 'warning' : 'error',
        'Connection Status',
        connectionStatusDisplay.statusText
      )}
      {getStatusIndicator(
        agentStatusDisplay.statusColor === 'text-green-500' ? 'good' : agentStatusDisplay.statusColor === 'text-yellow-500' ? 'warning' : 'error',
        'Agent Status',
        agentStatusDisplay.statusText
      )}
      {getStatusIndicator(
        calendarSyncStatusDisplay.statusColor === 'text-green-500' ? 'good' : calendarSyncStatusDisplay.statusColor === 'text-yellow-500' ? 'warning' : 'error',
        'Calendar Sync',
        `${calendarSyncStatusDisplay.statusText} ${calendarSyncStatusDisplay.lastSync}`
      )}
      {getStatusIndicator(
        approvalRequestsStatusDisplay.statusColor === 'text-green-500' ? 'good' : approvalRequestsStatusDisplay.statusColor === 'text-yellow-500' ? 'warning' : 'error',
        'Approval Requests',
        approvalRequestsStatusDisplay.statusText
      )}
    </Card>
  );
};