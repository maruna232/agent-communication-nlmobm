import React, { useState, useCallback } from 'react'; // React core library for UI components
import { useRouter } from 'next/navigation'; // Next.js hook for navigation

import { AppShell } from '../../components/layout/AppShell'; // Main application shell component for consistent layout
import { PageContainer } from '../../components/layout/PageContainer'; // Container component for consistent page content layout
import { ConnectForm } from '../../components/connect/ConnectForm'; // Form component for searching users to connect with
import { ConnectionList } from '../../components/connect/ConnectionList'; // Component for displaying and managing existing connections
import { PendingRequests } from '../../components/connect/PendingRequests'; // Component for displaying and responding to pending connection requests
import { InviteFriends } from '../../components/connect/InviteFriends'; // Component for inviting new users to the platform
import { Card } from '../../components/common/Card'; // Reusable card component for consistent content containers
import { useAuth } from '../../hooks/useAuth'; // Authentication hook to check if user is authenticated
import { useConnectionStore } from '../../store/connectionStore'; // Global state store for connection management

/**
 * Main component for the Connect page that allows users to manage agent connections
 */
const ConnectPage: React.FC = () => {
  // LD1: Check if user is authenticated using useAuth hook
  const { isAuthenticated } = useAuth();

  // LD1: Initialize state for search results using useState
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // LD1: Initialize state for selected connection using useState
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  // LD1: Initialize state for showing connection details modal using useState
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);

  // LD1: Get router from useRouter hook for navigation
  const router = useRouter();

  // LD1: Define handleSearchResults function to update search results state
  const handleSearchResults = useCallback((results: any[]) => {
    setSearchResults(results);
    setSelectedConnection(null); // Reset selected connection when new search is performed
    setShowConnectionDetails(false); // Hide connection details modal when new search is performed
  }, []);

  // LD1: Define handleMessageClick function to navigate to agent conversation
  const handleMessageClick = useCallback((connectionId: string) => {
    // LD2: Navigate to the agent conversation page with the connection ID
    // LD2: Use router.push to navigate to /agent/conversation/[connectionId]
    router.push(`/agent/conversation/${connectionId}`);
  }, [router]);

  // LD1: Render the page with AppShell component with authRequired prop
  return (
    <AppShell authRequired>
      {/* LD1: Render PageContainer for consistent layout */}
      <PageContainer>
        {/* LD1: Render page heading 'Connect with Other Agents' */}
        <h1 className="text-2xl font-semibold mb-4">Connect with Other Agents</h1>

        {/* LD1: Render ConnectForm component for searching users */}
        <ConnectForm onSearchResults={handleSearchResults} className="mb-6" />

        {/* LD1: Render search results section if search has been performed */}
        {searchResults.length > 0 && (
          <Card className="mb-6">
            <h2 className="text-lg font-medium mb-2">Search Results</h2>
            <ul>
              {searchResults.map((result) => (
                <li key={result.agentId} className="py-2 border-b border-gray-200 last:border-b-0">
                  {result.name} ({result.userId})
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* LD1: Render ConnectionList component to display existing connections */}
        <ConnectionList className="mb-6" onMessageClick={handleMessageClick} />

        {/* LD1: Render PendingRequests component to display pending connection requests */}
        <PendingRequests className="mb-6" />

        {/* LD1: Render InviteFriends component to invite new users to the platform */}
        <InviteFriends />
      </PageContainer>
    </AppShell>
  );
};

export default ConnectPage;