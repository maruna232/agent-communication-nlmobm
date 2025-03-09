import React from 'react'; // React library for component testing // react v18.0+
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'; // Testing library for rendering React components // ^14.0.0
import { AgentChat } from '../../../components/agent/AgentChat'; // Import the AgentChat component for testing
import { useAgent } from '../../../hooks/useAgent'; // Import the agent hook for mocking
import { AgentMessage, AgentConversation, AgentApprovalRequest, ApprovalStatus } from '../../../lib/types/agent.types'; // Import agent message type for test data
import { APPROVAL_TYPES } from '../../../lib/constants'; // Import approval type constants for test data
import { generateAgentResponse } from '../../../__mocks__/openai.mock'; // Import mock function for agent responses
import { jest } from '@jest/globals'; // Testing framework for mocking and assertions // ^29.0.0

// Mock agent data
const mockAgent = {
  agentId: 'test-agent-id',
  userId: 'test-user-id',
  name: 'Test Agent',
  configuration: {
    communicationStyle: { formality: 'CASUAL', verbosity: 'BALANCED', tone: 'FRIENDLY' },
    schedulingPreferences: { preferredTimes: [], bufferDuration: 30, advanceNotice: 24, preferredMeetingTypes: ['COFFEE', 'VIDEO_CALL'] },
    locationPreferences: { defaultLocation: 'Downtown', favoriteLocations: ['Blue Bottle Coffee'], locationTypes: ['COFFEE_SHOP', 'RESTAURANT'], travelRadius: 5 },
    privacySettings: { shareCalendarAvailability: true, shareLocationPreferences: true, shareMeetingPreferences: true, allowAutomaticScheduling: false },
    enableAgentCommunication: true,
    requireApproval: true,
    showConversationLogs: true
  },
  status: 'ONLINE',
  created: new Date('2023-01-01'),
  updated: new Date('2023-01-02')
};

// Mock conversation data
const mockConversation = {
  conversationId: 'test-conversation-id',
  initiatorAgentId: 'test-agent-id',
  recipientAgentId: 'other-agent-id',
  messages: [
    { messageId: 'msg-1', conversationId: 'test-conversation-id', senderId: 'test-agent-id', recipientId: 'other-agent-id', messageType: 'QUERY', content: { requestId: 'req-1', queryType: 'AVAILABILITY', parameters: { date: '2023-06-01' } }, timestamp: 1622548800000 },
    { messageId: 'msg-2', conversationId: 'test-conversation-id', senderId: 'other-agent-id', recipientId: 'test-agent-id', messageType: 'RESPONSE', content: { requestId: 'req-1', data: { availableTimes: ['14:00', '15:00', '16:00'] } }, timestamp: 1622548860000 }
  ],
  status: 'ACTIVE',
  created: new Date('2023-06-01'),
  updated: new Date('2023-06-01')
};

// Mock approval request data
const mockApprovalRequest = {
  requestId: 'approval-1',
  agentId: 'test-agent-id',
  userId: 'test-user-id',
  type: 'MEETING_PROPOSAL',
  data: {
    title: 'Coffee Meeting',
    description: 'Discuss project ideas',
    startTime: '2023-06-01T15:00:00Z',
    endTime: '2023-06-01T16:00:00Z',
    location: { name: 'Blue Bottle Coffee', address: '123 Main St', locationType: 'COFFEE_SHOP' },
    meetingType: 'COFFEE',
    participants: ['test-user-id', 'other-user-id'],
    status: 'PENDING'
  },
  status: 'PENDING',
  conversationId: 'test-conversation-id',
  created: new Date('2023-06-01'),
  updated: new Date('2023-06-01'),
  expiresAt: new Date('2023-06-02')
};

// Mock process command response
const mockProcessCommandResponse = {
  response: "I'll help you schedule a meeting with Maria. Let me check your availability and contact Maria's agent.",
  action: { type: 'START_CONVERSATION', recipientAgentId: 'maria-agent-id', context: { purpose: 'SCHEDULING', meetingType: 'COFFEE' } }
};

// Mock the useAgent hook
jest.mock('../../../hooks/useAgent', () => ({
  useAgent: jest.fn()
}));

describe('AgentChat Component', () => { // Group tests for the AgentChat component
  let mockUseAgent: jest.Mock;
  let mockProcessCommand: jest.Mock;
  let mockRespondToApproval: jest.Mock;

  beforeEach(() => { // Set up mocks before each test
    mockUseAgent = useAgent as jest.Mock;
    mockProcessCommand = jest.fn().mockResolvedValue(mockProcessCommandResponse);
    mockRespondToApproval = jest.fn().mockResolvedValue({});

    mockUseAgent.mockReturnValue({ // Mock useAgent hook to return controlled values
      agent: mockAgent,
      loading: false,
      error: null,
      conversations: [],
      currentConversation: null,
      approvalRequests: [],
      processCommand: mockProcessCommand,
      respondToApproval: mockRespondToApproval
    });
  });

  afterEach(() => { // Clean up mocks after each test
    jest.clearAllMocks(); // Clear all mocks
  });

  it('should render chat interface with message input', () => { // Test component rendering in initial state
    render(<AgentChat />); // Render the AgentChat component
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument(); // Verify that message input field is rendered
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument(); // Verify that send button is rendered
  });

  it('should show loading state when agent is loading', () => { // Test component rendering in loading state
    mockUseAgent.mockReturnValue({ // Mock useAgent to return loading state
      agent: null,
      loading: true,
      error: null,
      conversations: [],
      currentConversation: null,
      approvalRequests: [],
      processCommand: jest.fn(),
      respondToApproval: jest.fn()
    });
    render(<AgentChat />); // Render the AgentChat component
    expect(screen.getByRole('status')).toBeInTheDocument(); // Verify that loading indicator is displayed
    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled(); // Verify that message input is disabled during loading
  });

  it('should display error message when there is an error', () => { // Test component rendering with error
    mockUseAgent.mockReturnValue({ // Mock useAgent to return error state
      agent: null,
      loading: false,
      error: new Error('Test error'),
      conversations: [],
      currentConversation: null,
      approvalRequests: [],
      processCommand: jest.fn(),
      respondToApproval: jest.fn()
    });
    render(<AgentChat />); // Render the AgentChat component
    expect(screen.getByText('Test error')).toBeInTheDocument(); // Verify that error message is displayed
  });

  it('should send message and display response when user submits a message', async () => { // Test sending a message
    render(<AgentChat />); // Render the AgentChat component
    const inputElement = screen.getByPlaceholderText('Type your message...'); // Get the input element
    const sendButton = screen.getByRole('button', { name: 'Send' }); // Get the send button
    fireEvent.change(inputElement, { target: { value: 'Hello' } }); // Type a message in the input field
    fireEvent.click(sendButton); // Click the send button
    expect(mockProcessCommand).toHaveBeenCalledWith('Hello'); // Verify that processCommand was called with the correct message
    await waitFor(() => { // Wait for the messages to be displayed
      expect(screen.getByText('Hello')).toBeInTheDocument(); // Verify that user message is displayed in the chat
      expect(screen.getByText(mockProcessCommandResponse.response)).toBeInTheDocument(); // Verify that agent response is displayed in the chat
    });
    expect(inputElement).toHaveValue(''); // Verify that input field is cleared after sending
  });

  it('should send message when user presses Enter', async () => { // Test sending a message with Enter key
    render(<AgentChat />); // Render the AgentChat component
    const inputElement = screen.getByPlaceholderText('Type your message...'); // Get the input element
    fireEvent.change(inputElement, { target: { value: 'Hello' } }); // Type a message in the input field
    fireEvent.keyDown(inputElement, { key: 'Enter' }); // Press Enter key in the input field
    expect(mockProcessCommand).toHaveBeenCalledWith('Hello'); // Verify that processCommand was called with the correct message
    await waitFor(() => { // Wait for the messages to be displayed
      expect(screen.getByText('Hello')).toBeInTheDocument(); // Verify that user message is displayed in the chat
      expect(screen.getByText(mockProcessCommandResponse.response)).toBeInTheDocument(); // Verify that agent response is displayed in the chat
    });
  });

  it('should not send empty messages', () => { // Test empty message validation
    render(<AgentChat />); // Render the AgentChat component
    const sendButton = screen.getByRole('button', { name: 'Send' }); // Get the send button
    fireEvent.click(sendButton); // Click the send button
    expect(mockProcessCommand).not.toHaveBeenCalled(); // Verify that processCommand was not called
  });

  it('should display agent-to-agent conversation when active', () => { // Test agent-to-agent conversation display
    mockUseAgent.mockReturnValue({ // Mock useAgent to return current conversation
      agent: mockAgent,
      loading: false,
      error: null,
      conversations: [],
      currentConversation: mockConversation,
      approvalRequests: [],
      processCommand: jest.fn(),
      respondToApproval: jest.fn()
    });
    render(<AgentChat />); // Render the AgentChat component
    expect(screen.getByText('Agent-to-Agent Communication')).toBeInTheDocument(); // Verify that AgentToAgentConversation component is rendered
  });

  it('should display approval modal when there is a pending approval request', async () => { // Test approval request display
    mockUseAgent.mockReturnValue({ // Mock useAgent to return approval requests
      agent: mockAgent,
      loading: false,
      error: null,
      conversations: [],
      currentConversation: null,
      approvalRequests: [mockApprovalRequest],
      processCommand: jest.fn(),
      respondToApproval: jest.fn()
    });
    render(<AgentChat />); // Render the AgentChat component
    expect(screen.getByText('Approval Request')).toBeInTheDocument(); // Verify that ApprovalModal component is rendered
    expect(screen.getByText('Coffee Meeting')).toBeInTheDocument(); // Verify that approval request details are displayed
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument(); // Verify that approval action buttons are rendered
  });

  it('should handle approval action when user approves a request', async () => { // Test approval action - approve
    mockUseAgent.mockReturnValue({ // Mock useAgent to return approval requests
      agent: mockAgent,
      loading: false,
      error: null,
      conversations: [],
      currentConversation: null,
      approvalRequests: [mockApprovalRequest],
      processCommand: jest.fn(),
      respondToApproval: mockRespondToApproval
    });
    render(<AgentChat />); // Render the AgentChat component
    const approveButton = screen.getByRole('button', { name: 'Approve' }); // Get the approve button
    fireEvent.click(approveButton); // Click the approve button
    expect(mockRespondToApproval).toHaveBeenCalledWith(mockApprovalRequest.requestId, ApprovalStatus.APPROVED); // Verify that respondToApproval was called with correct parameters
  });

  it('should handle rejection action when user rejects a request', async () => { // Test approval action - reject
    mockUseAgent.mockReturnValue({ // Mock useAgent to return approval requests
      agent: mockAgent,
      loading: false,
      error: null,
      conversations: [],
      currentConversation: null,
      approvalRequests: [mockApprovalRequest],
      processCommand: jest.fn(),
      respondToApproval: mockRespondToApproval
    });
    render(<AgentChat />); // Render the AgentChat component
    const rejectButton = screen.getByRole('button', { name: 'Reject' }); // Get the decline button
    fireEvent.click(rejectButton); // Click the decline button
    expect(mockRespondToApproval).toHaveBeenCalledWith(mockApprovalRequest.requestId, ApprovalStatus.REJECTED); // Verify that respondToApproval was called with correct parameters
  });

  it('should handle modification action when user modifies a request', async () => { // Test approval action - modify
    mockUseAgent.mockReturnValue({ // Mock useAgent to return approval requests
      agent: mockAgent,
      loading: false,
      error: null,
      conversations: [],
      currentConversation: null,
      approvalRequests: [mockApprovalRequest],
      processCommand: jest.fn(),
      respondToApproval: mockRespondToApproval
    });
    render(<AgentChat />); // Render the AgentChat component
    const modifyButton = screen.getByRole('button', { name: 'Modify' }); // Get the modify button
    fireEvent.click(modifyButton); // Click the modify button
    expect(mockRespondToApproval).toHaveBeenCalledWith(mockApprovalRequest.requestId, ApprovalStatus.MODIFIED, {}); // Verify that respondToApproval was called with correct parameters
  });

  it('should handle errors when processing messages', async () => { // Test error handling during message processing
    mockUseAgent.mockReturnValue({ // Mock useAgent to return error state
      agent: mockAgent,
      loading: false,
      error: null,
      conversations: [],
      currentConversation: null,
      approvalRequests: [],
      processCommand: jest.fn().mockRejectedValue(new Error('Test error')),
      respondToApproval: jest.fn()
    });
    render(<AgentChat />); // Render the AgentChat component
    const inputElement = screen.getByPlaceholderText('Type your message...'); // Get the input element
    const sendButton = screen.getByRole('button', { name: 'Send' }); // Get the send button
    fireEvent.change(inputElement, { target: { value: 'Hello' } }); // Type a message in the input field
    fireEvent.click(sendButton); // Click the send button
    await waitFor(() => { // Wait for the error message to be displayed
      expect(screen.getByText('Test error')).toBeInTheDocument(); // Verify that error message is displayed in the chat
    });
  });
});