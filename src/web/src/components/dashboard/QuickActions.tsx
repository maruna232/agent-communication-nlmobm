import React, { useMemo } from 'react'; // react v18.0+
import classNames from 'classnames'; // v2.3.2
import {
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  UserGroupIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline'; // ^2.0.0
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useAgent } from '../../hooks/useAgent';
import { useCalendar } from '../../hooks/useCalendar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useNotifications } from '../../hooks/useNotifications';
import { WebSocketConnectionStatus } from '../../lib/types/websocket.types';

/**
 * Interface defining the properties for the QuickActions component
 */
interface QuickActionsProps {
  className?: string;
  title?: string;
  showHeader?: boolean;
  onTalkToAgentClick?: () => void;
  onViewScheduleClick?: () => void;
  onConnectAgentClick?: () => void;
  onViewApprovalsClick?: () => void;
}

/**
 * Component that displays quick action buttons for common tasks
 */
export const QuickActions: React.FC<QuickActionsProps> = ({
  className,
  title = 'Quick Actions',
  showHeader = true,
  onTalkToAgentClick,
  onViewScheduleClick,
  onConnectAgentClick,
  onViewApprovalsClick,
}) => {
  // LD1: Get agent state from useAgent hook
  const { agent } = useAgent();

  // LD1: Check if calendar is connected using useCalendar hook
  const { isCalendarConnected } = useCalendar();

  // LD1: Check WebSocket connection status using useWebSocket hook
  const { status: webSocketStatus } = useWebSocket();

  // LD1: Check for pending approvals using useNotifications hook
  const { hasPendingApprovals } = useNotifications();

  // LD1: Define action handlers for each button
  const handleTalkToAgentClick = () => {
    onTalkToAgentClick?.();
  };

  const handleViewScheduleClick = () => {
    onViewScheduleClick?.();
  };

  const handleConnectAgentClick = () => {
    onConnectAgentClick?.();
  };

  const handleViewApprovalsClick = () => {
    onViewApprovalsClick?.();
  };

  // LD1: Render Card component with quick actions title
  return (
    <Card
      className={classNames('col-span-1', className)}
      title={title}
      showHeader={showHeader}
    >
      {/* LD1: Render action buttons in a responsive grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* LD1: Include appropriate icons for each action */}
        <Button
          variant="outline"
          className="justify-center"
          onClick={handleTalkToAgentClick}
          disabled={!agent} // LD1: Disable buttons for unavailable features (e.g., agent chat if agent not configured)
          ariaLabel="Talk to Agent"
          leftIcon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
        >
          Talk to Agent
        </Button>

        <Button
          variant="outline"
          className="justify-center"
          onClick={handleViewScheduleClick}
          disabled={!isCalendarConnected()} // LD1: Disable buttons for unavailable features (e.g., calendar if not connected)
          ariaLabel="View Schedule"
          leftIcon={<CalendarIcon className="h-5 w-5" />}
        >
          View Schedule
        </Button>

        <Button
          variant="outline"
          className="justify-center"
          onClick={handleConnectAgentClick}
          disabled={webSocketStatus !== WebSocketConnectionStatus.CONNECTED} // LD1: Disable buttons for unavailable features (e.g., connect if not connected)
          ariaLabel="Connect Agents"
          leftIcon={<UserGroupIcon className="h-5 w-5" />}
        >
          Connect Agents
        </Button>

        <Button
          variant="outline"
          className="justify-center relative"
          onClick={handleViewApprovalsClick}
          ariaLabel="View Approvals"
          leftIcon={<BellAlertIcon className="h-5 w-5" />}
        >
          View Approvals
          {hasPendingApprovals() && ( // LD1: Add notification badge for pending approvals
            <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5">
              !
            </span>
          )}
        </Button>
      </div>
    </Card>
  );
};