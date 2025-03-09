import React, { useState, useEffect } from 'react'; // React core functionality for component creation and state management
import { useRouter } from 'next/navigation'; // Next.js hook for navigation
import { PageContainer } from '../../components/layout/PageContainer'; // Container component for consistent page layout
import { AgentSettings } from '../../components/agent/AgentSettings'; // Component for managing agent preferences and behavior
import { CalendarSyncSettings } from '../../components/calendar/CalendarSyncSettings'; // Component for managing Google Calendar integration
import { Card } from '../../components/common/Card'; // Container component for settings sections
import { Button } from '../../components/common/Button'; // Button component for actions
import { useAuth } from '../../hooks/useAuth'; // Hook for authentication-related functionality
import { useAgent } from '../../hooks/useAgent'; // Hook for agent-related functionality
import { useStorage } from '../../services/storage.service'; // Service for managing local storage operations

/**
 * Main component for the settings page that organizes different settings sections
 * @returns Rendered settings page
 */
const SettingsPage: React.FC = () => {
  // LD1: Get user and signOut function from useAuth hook
  const { user, signOut } = useAuth();

  // LD1: Get agent and agent data functions from useAgent hook
  const { agent, exportAgentData, deleteAllAgentData } = useAgent();

  // LD1: Get storage functions from useStorage hook
  const { exportAllData, deleteAllData, getStorageUsage } = useStorage();

  // LD1: Get router for navigation
  const router = useRouter();

  // LD1: Initialize state for storage usage information
  const [storageUsage, setStorageUsage] = useState<{ size: string; percentage: number } | null>(null);

  // LD1: Fetch storage usage information on component mount
  useEffect(() => {
    fetchStorageUsage();
  }, []);

  /**
   * Handles the export of all user data
   */
  const handleExportData = async () => {
    try {
      // LD1: Call exportAllData function from storage service
      const data = await exportAllData();

      // LD1: Generate a JSON file with all user data
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: 'application/json' });
      const href = await URL.createObjectURL(blob);

      // LD1: Create a download link for the file
      const link = document.createElement('a');
      link.href = href;
      link.download = 'ai_agent_network_data.json';
      document.body.appendChild(link);

      // LD1: Trigger the download
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  /**
   * Handles the deletion of all user data with confirmation
   */
  const handleDeleteData = async () => {
    // LD1: Show confirmation dialog to user
    const confirmed = window.confirm('Are you sure you want to delete all your data? This action cannot be undone.');

    if (confirmed) {
      try {
        // LD1: If confirmed, call deleteAllData function from storage service
        await deleteAllData();

        // LD1: Call deleteAllAgentData function from agent service
        if (agent) {
          await deleteAllAgentData(agent.agentId);
        }

        // LD1: Show success notification when deletion is complete
        alert('All data has been deleted.');

        // LD1: Redirect to login page after successful deletion
        router.push('/login');
      } catch (error) {
        console.error('Failed to delete data:', error);
        alert('Failed to delete data. Please try again.');
      }
    }
  };

  /**
   * Handles user sign out process
   */
  const handleSignOut = async () => {
    try {
      // LD1: Call signOut function from useAuth hook
      await signOut();

      // LD1: Redirect to login page after successful sign out
      router.push('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
      alert('Sign out failed. Please try again.');
    }
  };

  /**
   * Fetches and formats storage usage information
   */
  const fetchStorageUsage = async () => {
    try {
      // LD1: Call getStorageUsage function from storage service
      const usage = await getStorageUsage();

      // LD1: Format storage size in human-readable format (KB, MB)
      const sizeInMB = (usage.totalSize / (1024 * 1024)).toFixed(2);

      // LD1: Calculate usage percentage
      const percentage = Math.min((usage.totalSize / (5 * 1024 * 1024)) * 100, 100); // Assuming 5MB limit

      // LD1: Update storage usage state
      setStorageUsage({ size: `${sizeInMB} MB`, percentage });
    } catch (error) {
      console.error('Failed to fetch storage usage:', error);
      alert('Failed to fetch storage usage. Please try again.');
    }
  };

  return (
    <PageContainer>
      {/* LD1: Render page title and description */}
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <p className="text-gray-600 mb-6">Manage your AI Agent Network settings.</p>

      {/* LD1: Render AgentSettings component for agent configuration */}
      {user && <AgentSettings className="mb-6" />}

      {/* LD1: Render CalendarSyncSettings component for calendar integration */}
      {user && <CalendarSyncSettings className="mb-6" />}

      {/* LD1: Render Account Settings section with user information */}
      <Card title="Account Settings" className="mb-6">
        {user && (
          <div>
            <p>User ID: {user.userId}</p>
            <p>Email: {user.email}</p>
            <p>Display Name: {user.displayName}</p>
            <Button variant="danger" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        )}
      </Card>

      {/* LD1: Render Privacy & Data section with export/delete options */}
      <Card title="Privacy & Data" className="mb-6">
        <p>Manage your data and privacy settings.</p>
        <Button onClick={handleExportData} className="mb-2">
          Export Data
        </Button>
        <Button variant="danger" onClick={handleDeleteData}>
          Delete All Data
        </Button>
      </Card>

      {/* LD1: Render Storage Usage information */}
      {storageUsage && (
        <Card title="Storage Usage" className="mb-6">
          <p>Total Storage Used: {storageUsage.size}</p>
          <progress value={storageUsage.percentage} max="100" />
          <p className="text-sm text-gray-500">
            You have used {storageUsage.percentage.toFixed(2)}% of your 5MB storage limit.
          </p>
        </Card>
      )}
    </PageContainer>
  );
};

export default SettingsPage;