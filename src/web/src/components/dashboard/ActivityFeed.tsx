import React, { useState, useEffect, useMemo } from 'react'; // react v18.0+
import { Card } from '../common/Card';
import { useAgent } from '../../hooks/useAgent';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, getRelativeDateString } from '../../lib/utils/dateTime';
import { truncateText } from '../../lib/utils/formatters';
import { AgentApprovalRequest, AgentConversation } from '../../lib/types/agent.types';
import { APPROVAL_TYPES } from '../../lib/constants';

/**
 * Structure for activity items displayed in the feed
 */
interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  entityId: string;
  data: any;
}

/**
 * Props for the ActivityFeed component
 */
interface ActivityFeedProps {
  limit?: number;
  className?: string;
  showViewAll?: boolean;
  onViewAllClick?: () => void;
}

/**
 * Component that displays a feed of recent user and agent activities
 */
export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  limit = 5,
  className = '',
  showViewAll = false,
  onViewAllClick,
}) => {
  // Get agent, conversations, and approval requests from useAgent hook
  const { agent, conversations, approvalRequests } = useAgent();

  // Get user from useAuth hook
  const { user } = useAuth();

  // Use useMemo to generate and sort activity items
  const activityItems = useMemo(() => {
    const items: ActivityItem[] = [];

    // Add conversation activities
    if (conversations && conversations.length > 0) {
      conversations.forEach(conversation => {
        items.push({
          id: conversation.conversationId,
          type: 'conversation',
          title: `Conversation with ${conversation.recipientAgentId}`,
          description: `Started a conversation with ${conversation.recipientAgentId}`,
          timestamp: conversation.created,
          entityId: conversation.conversationId,
          data: conversation
        });
      });
    }

    // Add approval request activities
    if (approvalRequests && approvalRequests.length > 0) {
      approvalRequests.forEach(request => {
        let title = 'Approval Request';
        let description = 'New approval request received';

        if (request.type === APPROVAL_TYPES.MEETING_PROPOSAL) {
          title = 'Meeting Proposal';
          description = `Meeting proposal from ${request.agentId}`;
        }

        items.push({
          id: request.requestId,
          type: 'approval',
          title: title,
          description: description,
          timestamp: request.created,
          entityId: request.requestId,
          data: request
        });
      });
    }

    // Sort items by timestamp in descending order
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return items;
  }, [conversations, approvalRequests]);

  // Limit the number of items displayed based on the limit prop
  const limitedActivityItems = useMemo(() => {
    return activityItems.slice(0, limit);
  }, [activityItems, limit]);

  // Return the complete component JSX
  return (
    <Card title="Recent Activity" className={className}>
      {limitedActivityItems.length > 0 ? (
        <ul>
          {limitedActivityItems.map(item => (
            <li key={item.id} className="py-2 border-b border-gray-200 last:border-b-0">
              <div className="flex items-center space-x-2">
                <div className="text-gray-600">
                  {/* Add appropriate icons and color coding for different activity types */}
                  {item.type === 'conversation' && <i className="fas fa-comment-dots"></i>}
                  {item.type === 'approval' && <i className="fas fa-check-circle"></i>}
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">{truncateText(item.title, 50)}</h4>
                  <p className="text-sm text-gray-500">{truncateText(item.description, 100)}</p>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {getRelativeDateString(item.timestamp)}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No recent activity.</p>
      )}
      {/* Include a 'View All' button if showViewAll is true */}
      {showViewAll && (
        <div className="mt-4 text-center">
          <button
            className="text-blue-500 hover:text-blue-700 focus:outline-none"
            onClick={onViewAllClick}
          >
            View All
          </button>
        </div>
      )}
    </Card>
  );
};