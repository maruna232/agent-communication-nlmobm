import React, { useMemo } from 'react'; // React v18.0+
import classNames from 'classnames'; // v2.3.2
import { Card } from '../common/Card';
import { useAgent } from '../../hooks/useAgent';
import {
  AgentConversation,
  AgentMessage,
  MESSAGE_TYPES,
  CONVERSATION_STATUS,
} from '../../lib/types/agent.types';
import { formatDate } from '../../lib/utils/dateTime';

/**
 * @AgentConversationProps
 * @description Props interface for the AgentConversation component.
 */
interface AgentConversationProps {
  conversationId: string;
  className?: string;
  otherAgentName?: string;
}

/**
 * @FormattedMessage
 * @description Interface for formatted message objects used in the component.
 */
interface FormattedMessage {
  id: string;
  senderId: string;
  formattedContent: string;
  timestamp: string;
  messageType: string;
  isUserAgent: boolean;
}

/**
 * @AgentConversation
 * @description Main component for displaying agent-to-agent conversations.
 * @param {AgentConversationProps} props - The props for the component.
 * @returns {JSX.Element} Rendered component.
 */
export const AgentConversation: React.FC<AgentConversationProps> = ({
  conversationId,
  className,
  otherAgentName = 'Other Agent',
}) => {
  // LD2: Use useAgent hook to access the current agent and conversation data
  const { agent, currentConversation } = useAgent();

  // LD2: Use useMemo to format messages for display with appropriate styling
  const formattedMessages = useMemo(() => {
    if (!currentConversation?.messages) {
      return [];
    }
    return formatMessages(currentConversation.messages, agent?.agentId);
  }, [currentConversation, agent?.agentId]);

  // LD2: Determine which agent is the user's agent and which is the other agent
  const userAgentId = agent?.agentId;

  // LD2: Create a header component with conversation status indicator
  const headerContent = useMemo(() => {
    if (!currentConversation) {
      return null;
    }
    return renderConversationHeader(currentConversation, otherAgentName);
  }, [currentConversation, otherAgentName]);

  // LD2: Render the conversation in a Card component
  return (
    <Card
      title={`Conversation with ${otherAgentName}`}
      headerContent={headerContent}
      className={classNames('w-full', className)}
      padding="md"
      variant="outlined"
    >
      {formattedMessages.length > 0 ? (
        <div className="space-y-4">
          {formattedMessages.map((message) => (
            <div
              key={message.id}
              className={getMessageStyle(message.senderId, userAgentId, message.messageType)}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">
                  {getAgentName(message.senderId, userAgentId, otherAgentName)}:
                </span>
                <span className="text-gray-500 text-sm">{message.timestamp}</span>
              </div>
              <p className="text-gray-800">{message.formattedContent}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No messages in this conversation.</p>
      )}
    </Card>
  );
};

/**
 * @formatMessages
 * @description Formats raw agent messages into displayable message objects.
 * @param {AgentMessage[]} messages - Array of agent messages.
 * @param {string} userAgentId - ID of the user's agent.
 * @returns {FormattedMessage[]} Array of formatted messages.
 */
const formatMessages = (messages: AgentMessage[], userAgentId: string): FormattedMessage[] => {
  // LD2: Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  // LD2: Map each message to a formatted message object
  return sortedMessages.map((message) => ({
    id: message.messageId,
    senderId: message.senderId,
    formattedContent: formatMessageContent(message, userAgentId, 'Other Agent'),
    timestamp: formatDate(message.timestamp, 'MMM d, yyyy h:mm a'),
    messageType: message.messageType,
    isUserAgent: message.senderId === userAgentId,
  }));
};

/**
 * @formatMessageContent
 * @description Formats message content based on message type for human-readable display.
 * @param {AgentMessage} message - The agent message.
 * @param {string} userAgentId - ID of the user's agent.
 * @param {string} otherAgentName - Name of the other agent.
 * @returns {string} Formatted message content.
 */
const formatMessageContent = (message: AgentMessage, userAgentId: string, otherAgentName: string): string => {
  // LD2: Determine message type from message.messageType
  switch (message.messageType) {
    case MESSAGE_TYPES.HANDSHAKE:
      return `Connection established with ${otherAgentName}.`;
    case MESSAGE_TYPES.QUERY:
      return `Query: ${JSON.stringify(message.content)}`;
    case MESSAGE_TYPES.RESPONSE:
      return `Response: ${JSON.stringify(message.content)}`;
    case MESSAGE_TYPES.PROPOSAL:
      return `Proposal: ${JSON.stringify(message.content)}`;
    case MESSAGE_TYPES.CONFIRMATION:
      return `Confirmation: ${JSON.stringify(message.content)}`;
    case MESSAGE_TYPES.REJECTION:
      return `Rejection: ${message.content.reason || 'No reason provided'}`;
    default:
      return message.content;
  }
};

/**
 * @getMessageStyle
 * @description Determines the styling for a message based on sender and type.
 * @param {string} senderId - ID of the message sender.
 * @param {string} userAgentId - ID of the user's agent.
 * @param {string} messageType - Type of the message.
 * @returns {string} CSS class names.
 */
const getMessageStyle = (senderId: string, userAgentId: string, messageType: string): string => {
  // LD2: Determine if message is from user's agent or other agent
  const isUserAgent = senderId === userAgentId;

  // LD2: Apply different background colors based on sender
  const baseClasses = isUserAgent ? 'bg-blue-100 text-left' : 'bg-gray-100 text-right';

  // LD2: Apply different styling based on message type
  let typeClasses = '';
  switch (messageType) {
    case MESSAGE_TYPES.HANDSHAKE:
      typeClasses = 'font-italic';
      break;
    case MESSAGE_TYPES.QUERY:
      typeClasses = 'font-semibold';
      break;
    case MESSAGE_TYPES.RESPONSE:
      typeClasses = 'text-green-600';
      break;
    case MESSAGE_TYPES.PROPOSAL:
      typeClasses = 'text-purple-600';
      break;
    case MESSAGE_TYPES.CONFIRMATION:
      typeClasses = 'text-green-700';
      break;
    case MESSAGE_TYPES.REJECTION:
      typeClasses = 'text-red-700';
      break;
    default:
      typeClasses = 'text-gray-800';
  }

  // LD2: Use classNames utility to combine conditional classes
  return classNames('rounded-lg p-3', baseClasses, typeClasses);
};

/**
 * @getAgentName
 * @description Gets a display name for an agent based on whether it's the user's agent or not.
 * @param {string} agentId - ID of the agent.
 * @param {string} userAgentId - ID of the user's agent.
 * @param {string} otherAgentName - Name of the other agent.
 * @returns {string} Display name for the agent.
 */
const getAgentName = (agentId: string, userAgentId: string, otherAgentName: string): string => {
  // LD2: Check if agentId matches userAgentId
  if (agentId === userAgentId) {
    return 'Your Agent';
  }

  // LD2: Return otherAgentName or 'Other Agent' if it's not the user's agent
  return otherAgentName || 'Other Agent';
};

/**
 * @getConversationStatusText
 * @description Gets a human-readable status text for the conversation.
 * @param {string} status - Conversation status.
 * @returns {string} Status text.
 */
const getConversationStatusText = (status: string): string => {
  // LD2: Map CONVERSATION_STATUS values to human-readable text
  switch (status) {
    case CONVERSATION_STATUS.ACTIVE:
      return 'Active';
    case CONVERSATION_STATUS.COMPLETED:
      return 'Completed';
    case CONVERSATION_STATUS.CANCELLED:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

/**
 * @renderConversationHeader
 * @description Renders the header for the conversation card with status indicator.
 * @param {AgentConversation} conversation - The conversation object.
 * @param {string} otherAgentName - Name of the other agent.
 * @returns {JSX.Element} Header component.
 */
const renderConversationHeader = (conversation: AgentConversation, otherAgentName: string): JSX.Element => {
  // LD2: Get status text using getConversationStatusText
  const statusText = getConversationStatusText(conversation.status);

  // LD2: Determine status indicator color based on conversation status
  let statusColor = 'bg-gray-500';
  if (conversation.status === CONVERSATION_STATUS.ACTIVE) {
    statusColor = 'bg-green-500';
  } else if (conversation.status === CONVERSATION_STATUS.CANCELLED) {
    statusColor = 'bg-red-500';
  }

  // LD2: Create header with conversation title including other agent's name
  return (
    <div className="flex items-center">
      <span className="mr-2">{`Conversation with ${otherAgentName}`}</span>

      {/* LD2: Add status indicator with appropriate color */}
      <span
        className={classNames(
          statusColor,
          'rounded-full h-2 w-2 inline-block align-middle'
        )}
        title={`Conversation Status: ${statusText}`}
      />
    </div>
  );
};