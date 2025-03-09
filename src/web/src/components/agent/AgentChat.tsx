import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'; // react v18.0+
import classNames from 'classnames'; // ^2.3.2

import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Loading } from '../common/Loading';
import { AgentToAgentConversation } from './AgentToAgentConversation';
import { ApprovalModal } from './ApprovalModal';
import { useAgent } from '../../hooks/useAgent';
import {
  AgentMessage,
  AgentConversation,
  AgentApprovalRequest,
  APPROVAL_TYPES,
} from '../../lib/types/agent.types';

/**
 * Interface defining the props for the AgentChat component
 */
interface AgentChatProps {
  className?: string;
}

/**
 * Interface for chat message objects
 */
interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
}

/**
 * Main component for the agent chat interface
 */
export const AgentChat: React.FC<AgentChatProps> = ({ className }) => {
  // LD1: Destructure props to get className and other props
  // LD1: Use useAgent hook to access agent state and functionality
  const {
    agent,
    loading,
    error,
    conversations,
    currentConversation,
    approvalRequests,
    processCommand,
    respondToApproval,
  } = useAgent();

  // LD1: Set up state for message input, chat history, loading states, and approval modal
  const [messageInput, setMessageInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedApprovalRequest, setSelectedApprovalRequest] = useState<AgentApprovalRequest | null>(null);

  // LD1: Set up ref for chat container to enable auto-scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // LD1: Handle initial loading of agent data and conversations
  useEffect(() => {
    if (currentConversation && currentConversation.messages) {
      setChatHistory(currentConversation.messages.map(message => ({
        id: message.messageId,
        sender: message.senderId,
        content: message.content,
        timestamp: new Date(message.timestamp),
        isUser: message.senderId === agent?.agentId,
      })));
    } else {
      setChatHistory([]);
    }
  }, [currentConversation, agent]);

  // LD1: Implement auto-scrolling effect when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // LD1: Create handler for sending messages to the agent
  const handleSendMessage = useCallback(
    async (event: React.FormEvent) => {
      // LD1: Prevent default form submission
      event.preventDefault();

      // LD1: Check if message input is empty
      if (!messageInput.trim()) return;

      // LD1: Set loading state to true
      setIsSending(true);

      try {
        // LD1: Add user message to chat history
        const newMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'You',
          content: messageInput,
          timestamp: new Date(),
          isUser: true,
        };
        setChatHistory(prevHistory => [...prevHistory, newMessage]);

        // LD1: Clear message input
        setMessageInput('');

        // LD1: Process command using agent hook
        if (agent && processCommand) {
          const result = await processCommand(messageInput);

          // LD1: Add agent response to chat history
          const agentResponse: ChatMessage = {
            id: `agent-${Date.now()}`,
            sender: agent.name,
            content: result.response,
            timestamp: new Date(),
            isUser: false,
          };
          setChatHistory(prevHistory => [...prevHistory, agentResponse]);

          // LD1: Handle any agent actions returned from processing
          if (result.action) {
            // TODO: Implement action handling logic
            console.log('Agent action:', result.action);
          }
        }
      } catch (err) {
        // LD1: Handle any errors during processing
        console.error('Failed to send message:', err);
      } finally {
        // LD1: Set loading state to false
        setIsSending(false);
      }
    },
    [agent, messageInput, processCommand]
  );

  // LD1: Create handler for approval actions (approve, modify, decline)
  const handleApprovalAction = useCallback(
    async (action: string, request: AgentApprovalRequest) => {
      // LD1: Close the approval modal
      setSelectedApprovalRequest(null);

      // LD1: Add a message to chat history about the user's action
      const actionMessage: ChatMessage = {
        id: `action-${Date.now()}`,
        sender: 'System',
        content: `You ${action} the proposal.`,
        timestamp: new Date(),
        isUser: false,
      };
      setChatHistory(prevHistory => [...prevHistory, actionMessage]);

      try {
        // LD1: Update chat history with the result of the action
        if (respondToApproval && request.requestId) {
          await respondToApproval(request.requestId, action as any);
          // TODO: Update chat history with the result of the action
        }
      } catch (err) {
        // LD1: Handle any follow-up actions based on the approval result
        console.error('Failed to respond to approval:', err);
      }
    },
    [respondToApproval]
  );

  // LD1: Scrolls the chat container to the bottom
  const scrollToBottom = () => {
    // LD1: Check if chat container ref exists
    if (chatContainerRef.current) {
      // LD1: Set scrollTop to scrollHeight to scroll to bottom
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // LD1: Renders a single chat message
  const renderChatMessage = useCallback(
    (message: ChatMessage, index: number) => {
      // LD1: Determine message style based on sender (user or agent)
      const messageStyle = message.isUser
        ? 'bg-blue-100 text-blue-800 self-end'
        : 'bg-gray-100 text-gray-800 self-start';

      // LD1: Format message content for display
      const formattedContent = message.content;

      return (
        <div
          key={index}
          className={classNames(
            'mb-2 p-3 rounded-lg',
            messageStyle,
            'max-w-2/3 break-words'
          )}
        >
          {/* LD1: Render message with appropriate styling */}
          <div className="text-sm">{formattedContent}</div>
          {/* LD1: Include timestamp if available */}
          <div className="text-xs text-gray-500 text-right">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      );
    },
    []
  );

  // LD1: Renders the agent-to-agent conversation component when active
  const renderAgentToAgentConversation = useCallback(() => {
    // LD1: Check if there is a current conversation
    if (currentConversation) {
      // LD1: Determine the other agent's name from the conversation
      const otherAgentName =
        currentConversation.initiatorAgentId === agent?.agentId
          ? currentConversation.recipientAgentId
          : currentConversation.initiatorAgentId;

      // LD1: Render the AgentToAgentConversation component with appropriate props
      return (
        <AgentToAgentConversation
          conversation={currentConversation}
          userAgentId={agent?.agentId || ''}
          otherAgentName={otherAgentName}
        />
      );
    }

    // LD1: Return null if no active conversation
    return null;
  }, [agent, currentConversation]);

  // LD1: Renders the approval modal for user decisions
  const renderApprovalModal = useCallback(() => {
    // LD1: Check if there is a selected approval request
    if (selectedApprovalRequest) {
      // LD1: Determine the other agent's name from the request
      const otherAgentName = 'Other Agent'; // TODO: Implement logic to get other agent's name

      // LD1: Render the ApprovalModal component with appropriate props
      return (
        <ApprovalModal
          approvalRequest={selectedApprovalRequest}
          isOpen={!!selectedApprovalRequest}
          onClose={() => setSelectedApprovalRequest(null)}
          onAction={handleApprovalAction}
        />
      );
    }

    // LD1: Return null if no active approval request
    return null;
  }, [selectedApprovalRequest, handleApprovalAction]);

  // LD1: Render the complete chat interface component
  return (
    <Card className={className} variant="outlined" padding="md">
      <div className="flex flex-col h-full">
        {/* Chat History */}
        <div
          ref={chatContainerRef}
          className="flex-grow overflow-y-auto mb-4 p-2"
        >
          {chatHistory.map((message, index) => renderChatMessage(message, index))}
        </div>

        {/* Agent-to-Agent Conversation */}
        {renderAgentToAgentConversation()}

        {/* Approval Modal */}
        {renderApprovalModal()}

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="mt-4">
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Type your message..."
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              className="flex-grow rounded-l-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSending}
              className="rounded-r-md"
            >
              Send
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};