import React, { useState, useEffect, useCallback } from 'react'; // v18.0.0
import classNames from 'classnames'; // ^2.3.2

import {
  useCalendar,
  ICalendar,
  ICalendarSyncInfo,
} from '../../hooks/useCalendar';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import FormField from '../common/FormField';
import { GoogleCalendarScope } from '../../lib/types/calendar.types';
import { CALENDAR_SYNC_STATUS } from '../../lib/constants';

/**
 * Interface defining the props for the CalendarSyncSettings component.
 */
interface CalendarSyncSettingsProps {
  className?: string;
}

/**
 * Component for managing Google Calendar integration settings.
 * This component allows users to connect to, disconnect from, and manage
 * their Google Calendar synchronization preferences.
 * @param {CalendarSyncSettingsProps} props - The props for the component.
 * @returns {JSX.Element} The rendered component.
 */
export const CalendarSyncSettings: React.FC<CalendarSyncSettingsProps> = ({ className }) => {
  // LD1: Get calendar state and functions from useCalendar hook
  const {
    calendars,
    syncInfo,
    loading,
    error,
    connectCalendar,
    disconnectCalendar,
    selectCalendar,
    syncNow,
    isCalendarConnected,
    isSyncing,
  } = useCalendar();

  // LD1: Get user information from useAuth hook
  const { user } = useAuth();

  // LD1: Initialize local state for selected scope and sync options
  const [selectedScope, setSelectedScope] = useState<GoogleCalendarScope>(GoogleCalendarScope.READ_ONLY);
  const [syncAllCalendars, setSyncAllCalendars] = useState<boolean>(true);

  // LD1: Handle calendar connection with appropriate scope
  const handleConnectCalendar = useCallback(async () => {
    if (user) {
      await connectCalendar(selectedScope);
    }
  }, [connectCalendar, selectedScope, user]);

  // LD1: Handle calendar disconnection with confirmation
  const handleDisconnectCalendar = useCallback(async () => {
    if (user && window.confirm('Are you sure you want to disconnect your calendar?')) {
      await disconnectCalendar(user.userId);
    }
  }, [disconnectCalendar, user]);

  // LD1: Handle calendar selection/deselection
  const handleCalendarSelect = useCallback(async (calendarId: string, selected: boolean) => {
    if (user) {
      await selectCalendar(calendarId, selected);
    }
  }, [selectCalendar, user]);

  // LD1: Handle manual sync trigger
  const handleSyncNow = useCallback(async () => {
    if (user) {
      const calendarIds = calendars.filter(cal => cal.isSelected).map(cal => cal.calendarId);
      await syncNow(calendarIds, true); // force a full sync
    }
  }, [syncNow, calendars, user]);

  // LD1: Format last sync time for display
  const lastSyncTimeFormatted = formatLastSyncTime(syncInfo?.lastSyncTime);

  // LD1: Render connection status and controls
  return (
    <Card title="Calendar Integration" className={className}>
      {loading && <p>Loading calendar settings...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!isCalendarConnected() ? (
        <div>
          <p>Connect to Google Calendar to sync your events.</p>
          <FormField
            type="select"
            label="Permission Scope"
            name="calendarScope"
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value as GoogleCalendarScope)}
            options={[
              <option key={GoogleCalendarScope.READ_ONLY} value={GoogleCalendarScope.READ_ONLY}>
                Read Only (Recommended)
              </option>,
              <option key={GoogleCalendarScope.READ_WRITE} value={GoogleCalendarScope.READ_WRITE}>
                Read and Write
              </option>,
            ]}
          />
          <Button onClick={handleConnectCalendar}>Connect to Google Calendar</Button>
        </div>
      ) : (
        <div>
          <p>Connected to Google Calendar.</p>
          <Button variant="danger" onClick={handleDisconnectCalendar}>
            Disconnect Calendar
          </Button>

          {/* LD1: Render calendar selection list when connected */}
          <h3>Calendars to Sync</h3>
          {calendars.map((calendar) => (
            <div key={calendar.calendarId}>
              <label>
                <input
                  type="checkbox"
                  checked={calendar.isSelected}
                  onChange={(e) => handleCalendarSelect(calendar.calendarId, e.target.checked)}
                />
                {calendar.title}
              </label>
            </div>
          ))}

          {/* LD1: Render sync options and status when connected */}
          <h3>Sync Options</h3>
          <p>Last synced: {lastSyncTimeFormatted}</p>
          <p>Sync Status: {getSyncStatusText(syncInfo?.status, syncInfo?.lastSyncTime, syncInfo?.error)}</p>
          <Button onClick={handleSyncNow} disabled={isSyncing()}>
            {isSyncing() ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      )}
    </Card>
  );
};

/**
 * Formats the last sync time into a human-readable string.
 * @param {string | null} lastSyncTime - The last sync time in ISO format.
 * @returns {string} The formatted time string.
 */
const formatLastSyncTime = (lastSyncTime: string | null): string => {
  if (!lastSyncTime) {
    return 'Never';
  }

  const date = new Date(lastSyncTime);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
};

/**
 * Returns a human-readable text for the current sync status.
 * @param {string} status - The sync status.
 * @param {string | null} lastSyncTime - The last sync time in ISO format.
 * @param {string | null} error - The error message, if any.
 * @returns {string} The status text.
 */
const getSyncStatusText = (status: string | undefined, lastSyncTime: string | null, error: string | null): string => {
  if (status === CALENDAR_SYNC_STATUS.SYNCING) {
    return 'Syncing...';
  } else if (status === CALENDAR_SYNC_STATUS.SYNCED) {
    return `Last synced: ${formatLastSyncTime(lastSyncTime)}`;
  } else if (status === CALENDAR_SYNC_STATUS.ERROR) {
    return `Sync error: ${error}`;
  } else if (status === CALENDAR_SYNC_STATUS.NOT_CONNECTED) {
    return 'Not connected';
  } else {
    return 'Unknown status';
  }
};