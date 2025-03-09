import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';

import { Card } from '../common/Card';
import { Loading } from '../common/Loading';
import { 
  AgentConversation, 
  AgentMessage 
} from '../../lib/types/agent.types';
import { 
  formatAgentMessage, 
  formatProposalContent, 
  formatQueryContent, 
  formatResponseContent 
} from '../../lib/utils/formatters';
import { formatDate } from '../../lib/utils/dateTime';
import { MESSAGE_TYPES } from '../../lib/constants';

export interface AgentToAgentConversationProps {
  conversation: AgentConversation;
  userAgentId: string;
  otherAgentName: string;
  className?: string;
}

export const AgentToAgentConversation: React.FC<AgentToAgentConversationProps> = ({
  conversation,
  userAgentId,
  otherAgentName,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const conversationContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages?.length]);

  const scrollToBottom = () => {
    if (conversationContainerRef.current) {
      conversationContainerRef.current.scrollTop = conversationContainerRef.current.scrollHeight;
    }
  };

  // Get the display name for a message sender
  const getSenderDisplayName = (senderId: string): string => {
    if (senderId === userAgentId) {
      return 'Your Agent';
    }
    return otherAgentName || 'Other Agent';
  };

  // Format message content based on message type
  const formatMessageContent = (message: AgentMessage): string => {
    if (!message.content) return '';

    switch (message.messageType) {
      case MESSAGE_TYPES.PROPOSAL:
        return formatProposalContent(message.content);
      case MESSAGE_TYPES.QUERY:
        return formatQueryContent(message.content);
      case MESSAGE_TYPES.RESPONSE:
        return formatResponseContent(message.content);
      case MESSAGE_TYPES.CONFIRMATION:
        return 'Confirmed the proposal.';
      case MESSAGE_TYPES.REJECTION:
        return `Declined the proposal${message.content.reason ? `: ${message.content.reason}` : ''}.`;
      default:
        return formatAgentMessage(message);
    }
  };

  // Render a single message in the conversation
  const renderMessage = (message: AgentMessage, index: number) => {
    const isUserAgent = message.senderId === userAgentId;
    const senderName = getSenderDisplayName(message.senderId);
    const content = formatMessageContent(message);
    const timestamp = formatDate(new Date(message.timestamp), 'h:mm a');

    return (
      <div 
        key={message.messageId || index}
        className={classNames(
          'mb-3 p-3 rounded-lg max-w-[85%]',
          {
            'bg-blue-50 ml-auto': isUserAgent,
            'bg-gray-50': !isUserAgent
          }
        )}
      >
        <div className="font-medium text-sm text-gray-700">
          {senderName}
        </div>
        <div className="mt-1 text-gray-800 whitespace-pre-wrap">
          {content}
        </div>
        <div className="mt-1 text-xs text-gray-500 text-right">
          {timestamp}
        </div>
      </div>
    );
  };

  // Handle loading state
  if (isLoading) {
    return <Loading size="md" label="Loading conversation..." />;
  }

  // Handle empty conversation
  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return (
      <Card
        className={classNames('mb-4', className)}
        variant="outlined"
        padding="md"
      >
        <div className="text-center text-gray-500 py-4">
          Waiting for agent communication to begin...
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={classNames('mb-4', className)}
      variant="outlined"
      padding="sm"
      title="Agent-to-Agent Communication"
    >
      <div 
        ref={conversationContainerRef}
        className="overflow-y-auto max-h-[300px] p-2"
      >
        {conversation.messages.map((message, index) => renderMessage(message, index))}
      </div>
    </Card>
  );
};

export default AgentToAgentConversation;