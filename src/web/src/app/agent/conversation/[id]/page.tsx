import React, { useState, useEffect, useCallback } from 'react'; // react v18.0+
import { useParams, useRouter } from 'next/navigation'; // next/navigation v14.0.0
import { PageContainer } from '../../../../components/layout/PageContainer';
import { AgentChat } from '../../../../components/agent/AgentChat';
import { Loading } from '../../../../components/common/Loading';
import { ErrorDisplay } from '../../../../components/common/ErrorDisplay';
import { useAgent } from '../../../../hooks/useAgent';
import { useAuth } from '../../../../hooks/useAuth';

/**
 * Next.js page component for displaying a specific agent conversation
 */
const ConversationPage: React.FC = () => {
  // LD1: Get conversation ID from route parameters using useParams
  const { id: conversationId } = useParams<{ id: string }>();

  // LD1: Access router for navigation using useRouter
  const router = useRouter();

  // LD1: Get authentication state using useAuth hook
  const { state: authState, isAuthenticated } = useAuth();

  // LD1: Get agent state and functionality using useAgent hook
  const {
    agent,
    loading: agentLoading,
    error: agentError,
    getConversation,
    currentConversation,
  } = useAgent();

  // LD1: Set up local state for conversation loading
  const [conversationLoading, setConversationLoading] = useState(false);

  // LD1: Set up local state for conversation error
  const [conversationError, setConversationError] = useState<Error | null>(null);

  // LD1: Check if user is authenticated, redirect to login if not
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // LD1: Fetch conversation data when component mounts
  useEffect(() => {
    if (conversationId) {
      fetchConversation(conversationId);
    }
  }, [conversationId]);

  // LD1: Define fetchConversation function to fetch conversation data
  const fetchConversation = useCallback(async (conversationId: string) => {
    // LD1: Set loading state to true
    setConversationLoading(true);
    // LD1: Clear any previous errors
    setConversationError(null);

    try {
      // LD1: Call getConversation from useAgent hook with the conversation ID
      await getConversation(conversationId);
    } catch (error: any) {
      // LD1: Handle errors by setting error state
      setConversationError(error);
    } finally {
      // LD1: Set loading state to false regardless of outcome
      setConversationLoading(false);
    }
  }, [getConversation]);

  // LD1: Define handleBack function to navigate back to the agent dashboard
  const handleBack = useCallback(() => {
    // LD1: Use router to navigate to the agent dashboard page
    router.push('/agent');
  }, [router]);

  // LD1: Define getOtherAgentName function to determine the name of the other agent in the conversation
  const getOtherAgentName = useCallback(() => {
    // LD1: Check if conversation exists
    if (currentConversation) {
      // LD1: Determine if current agent is initiator or recipient
      const isInitiator = currentConversation.initiatorAgentId === agent?.agentId;

      // LD1: Return appropriate name based on the role
      return isInitiator ? currentConversation.recipientAgentId : currentConversation.initiatorAgentId;
    }

    // LD1: Return default name if conversation doesn't exist
    return 'Other Agent';
  }, [agent?.agentId, currentConversation]);

  // LD1: Handle loading state with Loading component
  if (agentLoading || conversationLoading) {
    return (
      <PageContainer>
        <Loading size="lg" />
      </PageContainer>
    );
  }

  // LD1: Handle error state with ErrorDisplay component
  if (agentError || conversationError) {
    return (
      <PageContainer>
        <ErrorDisplay message={agentError?.message || conversationError?.message || 'An error occurred'} />
      </PageContainer>
    );
  }

  // LD1: Render PageContainer with appropriate max width
  return (
    <PageContainer maxWidth="3xl">
      {/* LD1: Render back button to return to agent dashboard */}
      <button onClick={handleBack} className="mb-4 text-blue-500 hover:underline">
        &larr; Back to Agent Dashboard
      </button>

      {/* LD1: Render conversation title with other agent's name */}
      <h1 className="text-2xl font-bold mb-4">Conversation with {getOtherAgentName()}</h1>

      {/* LD1: Render AgentChat component with conversation data */}
      {currentConversation && <AgentChat className="h-full" />}
    </PageContainer>
  );
};

// LD1: Export the ConversationPage component as the default export for the Next.js page
export default ConversationPage;