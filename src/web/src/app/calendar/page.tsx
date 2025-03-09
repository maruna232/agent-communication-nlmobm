import React, { useState, useCallback, useEffect } from 'react'; // react v18.0.0
import { Metadata } from 'next'; // next v14.0.0

import { AppShell } from '../../components/layout/AppShell';
import { PageContainer } from '../../components/layout/PageContainer';
import { CalendarComponent } from '../../components/calendar/CalendarComponent';
import { CalendarSyncSettings } from '../../components/calendar/CalendarSyncSettings';
import { useCalendar } from '../../hooks/useCalendar';
import { useAuth } from '../../hooks/useAuth';

/**
 * @LD1
 * @S1
 * Exports metadata for the calendar page.
 * @returns {object} Page metadata object
 */
export const metadata: Metadata = {
  title: 'Calendar - AI Agent Network',
  description: 'View and manage your calendar events with AI Agent Network.',
};

/**
 * @LD1
 * @S1
 * Main component for the calendar page.
 * @returns {JSX.Element} Rendered calendar page
 */
const CalendarPage: React.FC = () => {
  // @LD1 Get authentication status using useAuth hook
  const { isAuthenticated } = useAuth();

  // @LD1 Get calendar connection status and connect function using useCalendar hook
  const { isCalendarConnected, connectCalendar } = useCalendar();

  // @LD1 Set up state for showing sync settings modal
  const [showSyncSettings, setShowSyncSettings] = useState(false);

  /**
   * @LD1
   * @S1
   * Handles the connection to Google Calendar.
   * @returns {Promise<void>} Promise that resolves when connection process completes
   */
  const handleConnectCalendar = useCallback(async () => {
    // @LD1 Call connectCalendar function from useCalendar hook
    await connectCalendar(null);

    // @LD1 Handle any errors during connection process
    // @LD1 Show success message when connected
    // @LD1 Open sync settings modal after successful connection
    toggleSyncSettings();
  }, [connectCalendar]);

  /**
   * @LD1
   * @S1
   * Toggles the visibility of the sync settings modal.
   * @returns {void} No return value
   */
  const toggleSyncSettings = useCallback(() => {
    // @LD1 Toggle the showSyncSettings state value
    setShowSyncSettings((prevShowSyncSettings) => !prevShowSyncSettings);
  }, []);

  // @LD1 Render the page with AppShell wrapper
  return (
    <AppShell authRequired>
      {/* @LD1 Include PageContainer for consistent layout */}
      <PageContainer>
        {/* @LD1 Render page header with title and action buttons */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Calendar</h1>
          {/* @LD1 Include connect calendar button if calendar is not connected */}
          {!isCalendarConnected() && (
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={handleConnectCalendar}
            >
              Connect Calendar
            </button>
          )}
        </div>

        {/* @LD1 Render CalendarComponent as the main content */}
        <CalendarComponent />

        {/* @LD1 Conditionally render CalendarSyncSettings modal when open */}
        {showSyncSettings && (
          <CalendarSyncSettings onClose={toggleSyncSettings} />
        )}
      </PageContainer>
    </AppShell>
  );
};

export default CalendarPage;