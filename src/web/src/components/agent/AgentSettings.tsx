import React, { useEffect } from 'react'; // React core functionality for component creation and state management
import { Card } from '../common/Card'; // Container component for sections of the settings form
import { FormField } from '../common/FormField'; // Input field component for form elements
import { Button } from '../common/Button'; // Button component for form actions
import { useAgent } from '../../hooks/useAgent'; // Hook for accessing and updating agent data
import { useCalendar } from '../../hooks/useCalendar'; // Hook for calendar integration functionality
import { useForm } from '../../hooks/useForm'; // Hook for form state management and validation
import {
  AgentConfiguration,
  CommunicationFormality,
  CommunicationVerbosity,
  CommunicationTone,
  MeetingType,
  LocationType,
} from '../../lib/types/agent.types'; // Type definition for agent configuration

interface AgentSettingsProps {
  className?: string;
}

/**
 * Main component for agent settings configuration
 * @returns Rendered agent settings form
 */
export const AgentSettings: React.FC<AgentSettingsProps> = ({ className }) => {
  // Get agent data and update function from useAgent hook
  const { agent, updateAgentConfiguration } = useAgent();

  // Get calendar data and functions from useCalendar hook
  const { calendars, connectCalendar, disconnectCalendar, selectCalendar, isCalendarConnected } = useCalendar();

  // Initialize form with current agent configuration
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
  } = useForm<AgentConfiguration>(
    agent?.configuration || {
      communicationStyle: { formality: CommunicationFormality.CASUAL, verbosity: CommunicationVerbosity.BRIEF, tone: CommunicationTone.FRIENDLY },
      schedulingPreferences: { preferredTimes: [], bufferDuration: 0, advanceNotice: 0, preferredMeetingTypes: [] },
      locationPreferences: { defaultLocation: '', favoriteLocations: [], locationTypes: [], travelRadius: 0 },
      privacySettings: { shareCalendarAvailability: false, shareLocationPreferences: false, shareMeetingPreferences: false, allowAutomaticScheduling: false },
      enableAgentCommunication: false,
      requireApproval: false,
      showConversationLogs: true,
    },
    undefined,
    {
      onSubmit: handleFormSubmit,
    }
  );

  /**
   * Handles the submission of the agent settings form
   * @param formValues 
   */
  async function handleFormSubmit(formValues: AgentConfiguration) {
    if (agent) {
      await updateAgentConfiguration(agent.agentId, formValues);
      alert('Agent settings updated successfully!');
    }
  }

  /**
   * Initiates the Google Calendar connection process
   */
  async function handleConnectCalendar() {
    await connectCalendar(GoogleCalendarScope.READ_WRITE);
  }

  /**
   * Disconnects the Google Calendar integration
   */
  async function handleDisconnectCalendar() {
    await disconnectCalendar();
  }

  /**
   * Handles selection/deselection of specific calendars
   * @param calendarId 
   * @param isSelected 
   */
  async function handleCalendarSelection(calendarId: string, isSelected: boolean) {
    await selectCalendar(calendarId, isSelected);
  }

  return (
    <Card title="Agent Settings" className={className}>
      <form onSubmit={handleSubmit}>
        <Card title="General Preferences">
          <FormField
            label="Enable Agent-to-Agent Communication"
            name="enableAgentCommunication"
            type="checkbox"
            value={values.enableAgentCommunication}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <FormField
            label="Require Approval for All Agent Actions"
            name="requireApproval"
            type="checkbox"
            value={values.requireApproval}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <FormField
            label="Show Agent Conversation Logs"
            name="showConversationLogs"
            type="checkbox"
            value={values.showConversationLogs}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </Card>

        <Card title="Communication Style">
          <FormField
            label="Formality"
            name="communicationStyle.formality"
            type="select"
            value={values.communicationStyle.formality}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value={CommunicationFormality.CASUAL}>Casual</option>
            <option value={CommunicationFormality.FORMAL}>Formal</option>
            <option value={CommunicationFormality.PROFESSIONAL}>Professional</option>
          </FormField>
          <FormField
            label="Verbosity"
            name="communicationStyle.verbosity"
            type="select"
            value={values.communicationStyle.verbosity}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value={CommunicationVerbosity.BRIEF}>Brief</option>
            <option value={CommunicationVerbosity.DETAILED}>Detailed</option>
            <option value={CommunicationVerbosity.BALANCED}>Balanced</option>
          </FormField>
          <FormField
            label="Tone"
            name="communicationStyle.tone"
            type="select"
            value={values.communicationStyle.tone}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value={CommunicationTone.FRIENDLY}>Friendly</option>
            <option value={CommunicationTone.PROFESSIONAL}>Professional</option>
            <option value={CommunicationTone.DIRECT}>Direct</option>
          </FormField>
        </Card>

        <Card title="Scheduling Preferences">
          {/* Implement scheduling preferences form fields here */}
        </Card>

        <Card title="Location Preferences">
          {/* Implement location preferences form fields here */}
        </Card>

        <Card title="Calendar Integration">
          {isCalendarConnected() ? (
            <>
              <p>Google Calendar Connected</p>
              <Button onClick={handleDisconnectCalendar}>Disconnect Calendar</Button>
              {calendars?.map((calendar) => (
                <div key={calendar.calendarId}>
                  <label>
                    <input
                      type="checkbox"
                      checked={calendar.isSelected}
                      onChange={(e) => handleCalendarSelection(calendar.calendarId, e.target.checked)}
                    />
                    {calendar.title}
                  </label>
                </div>
              ))}
            </>
          ) : (
            <Button onClick={handleConnectCalendar}>Connect to Google Calendar</Button>
          )}
        </Card>

        <Button type="submit">Save Changes</Button>
      </form>
    </Card>
  );
};