import React, { useState, useEffect, useCallback } from 'react'; // React core functionality for component creation and state management // react v18.0+
import classNames from 'classnames'; // Utility for conditionally joining class names // ^2.3.2
import { useRouter, useSearchParams } from 'next/navigation'; // Next.js router for navigation and URL parameter handling
import { PageContainer } from '../../components/layout/PageContainer'; // Container component for consistent page layout
import { Card } from '../../components/common/Card'; // Container component for the agent interface sections
import { AgentChat } from '../../components/agent/AgentChat'; // Component for chat interaction with the agent
import { AgentSettings } from '../../components/agent/AgentSettings'; // Component for configuring agent preferences and settings
import { useAgent } from '../../hooks/useAgent'; // Hook for accessing agent functionality and state
import { useAuth } from '../../hooks/useAuth'; // Hook for checking authentication status

/**
 * Component for tab navigation
 */
const TabNavigation: React.FC<{ activeTab: string; onTabChange: (tabId: string) => void }> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-4" aria-label="Tabs">
        <button
          onClick={() => onTabChange('chat')}
          className={classNames(
            activeTab === 'chat'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          )}
          aria-current={activeTab === 'chat' ? 'page' : undefined}
        >
          Chat
        </button>
        <button
          onClick={() => onTabChange('settings')}
          className={classNames(
            activeTab === 'settings'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          )}
          aria-current={activeTab === 'settings' ? 'page' : undefined}
        >
          Settings
        </button>
      </nav>
    </div>
  );
};

/**
 * Main component for the Agent page that provides a tabbed interface for chat and settings
 * @returns Rendered Agent page component
 */
const AgentPage: React.FC = () => {
  // IE1: Use the useAuth hook to check if the user is authenticated
  const { isAuthenticated } = useAuth();
  // IE1: Use the useRouter hook to redirect the user if not authenticated
  const router = useRouter();
  // IE1: Use the useSearchParams hook to get the current URL parameters
  const searchParams = useSearchParams();
  // IE1: Use the useAgent hook to access agent data and functionality
  const { agent, loading, error } = useAgent();

  // LD1: Set up state for tracking the active tab (chat or settings)
  const [activeTab, setActiveTab] = useState<string>('chat');

  // IE1: Handle tab switching between chat and settings views
  const handleTabChange = useCallback((tabId: string) => {
    // LD1: Update the activeTab state with the selected tab ID
    setActiveTab(tabId);
    // LD1: Update the URL query parameter to reflect the active tab
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('tab', tabId);
    router.push(`/agent?${newParams.toString()}`, { shallow: true });
  }, [router, searchParams]);

  // LD1: Maintain tab selection across page refreshes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'settings' || tab === 'chat') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // IE1: Redirect to login page if user is not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // LD1: Show loading state while agent data is being fetched
  if (loading) {
    return (
      <PageContainer maxWidth="7xl">
        <Card variant="outlined" padding="md">
          <div>Loading agent...</div>
        </Card>
      </PageContainer>
    );
  }

  // LD1: Show error state if agent data fetching fails
  if (error) {
    return (
      <PageContainer maxWidth="7xl">
        <Card variant="outlined" padding="md">
          <div>Error: {error.message}</div>
        </Card>
      </PageContainer>
    );
  }

  // LD1: Render the active tab content (AgentChat or AgentSettings)
  const renderTabContent = useCallback(() => {
    // LD1: Check the activeTab state
    if (activeTab === 'chat') {
      // LD1: Render AgentChat component if chat tab is active
      return <AgentChat className="h-full" />;
    } else if (activeTab === 'settings') {
      // LD1: Render AgentSettings component if settings tab is active
      return <AgentSettings className="h-full" />;
    }
    return null;
  }, [activeTab]);

  // LD1: Return the complete page structure
  return (
    <PageContainer maxWidth="7xl">
      <Card variant="outlined" padding="md" className="h-[calc(100vh-100px)]">
        <div className="flex flex-col h-full">
          {/* LD1: Render page header with title and description */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold">Agent</h1>
            <p className="text-gray-500">
              Interact with your AI agent and configure its settings.
            </p>
          </div>

          {/* LD1: Render tab navigation for switching between chat and settings */}
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

          {/* LD1: Render the active tab content (AgentChat or AgentSettings) */}
          <div className="flex-grow">{renderTabContent()}</div>
        </div>
      </Card>
    </PageContainer>
  );
};

export default AgentPage;