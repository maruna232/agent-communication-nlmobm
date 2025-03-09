import React, { useCallback } from 'react'; // React v18.0+
import { useRouter } from 'next/navigation'; // Next.js v14.0+

// Internal imports
import { AppShell } from '../../components/layout/AppShell'; // Main layout wrapper
import { ActivityFeed } from '../../components/dashboard/ActivityFeed'; // Component to display recent activities
import { QuickActions } from '../../components/dashboard/QuickActions'; // Component to display quick action buttons
import { UpcomingEvents } from '../../components/dashboard/UpcomingEvents'; // Component to display upcoming calendar events
import { useAuth } from '../../hooks/useAuth'; // Hook to access authentication state

/**
 * Main dashboard page component that serves as the home page for authenticated users
 * @returns Rendered dashboard page
 */
const Dashboard: React.FC = () => {
  // LD1: Get authentication status using useAuth hook
  const { isAuthenticated } = useAuth();

  // LD1: Get router for navigation using useRouter
  const router = useRouter();

  // LD1: Check if user is authenticated
  if (!isAuthenticated()) {
    // LD1: Redirect to login page if not authenticated
    router.push('/login');
    return null;
  }

  // LD1: Define handlers for quick action buttons
  const handleTalkToAgentClick = useCallback(() => {
    // LD1: Handle talk to agent action by navigating to agent chat page
    router.push('/chat');
  }, [router]);

  const handleViewScheduleClick = useCallback(() => {
    // LD1: Handle view schedule action by navigating to calendar page
    router.push('/calendar');
  }, [router]);

  const handleConnectAgentClick = useCallback(() => {
    // LD1: Handle connect agent action by navigating to connect page
    router.push('/connect');
  }, [router]);

  const handleViewApprovalsClick = useCallback(() => {
    // LD1: Handle view approvals action by navigating to approvals page
    router.push('/approvals');
  }, [router]);

  // LD1: Render the dashboard layout with AppShell component
  return (
    <AppShell authRequired>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* LD1: Include ActivityFeed component with recent activities */}
        <ActivityFeed className="md:col-span-2 lg:col-span-2" />

        {/* LD1: Include QuickActions component with action buttons */}
        <QuickActions
          className="md:col-span-1 lg:col-span-1"
          onTalkToAgentClick={handleTalkToAgentClick}
          onViewScheduleClick={handleViewScheduleClick}
          onConnectAgentClick={handleConnectAgentClick}
          onViewApprovalsClick={handleViewApprovalsClick}
        />

        {/* LD1: Include UpcomingEvents component with calendar events */}
        <UpcomingEvents className="md:col-span-1 lg:col-span-1" />
      </div>
    </AppShell>
  );
};

// LD1: Export the Dashboard component as the default export for the page
export default Dashboard;