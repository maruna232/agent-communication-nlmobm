/**
 * Agent Type Definitions
 * 
 * This file contains TypeScript interfaces and types for agent-related data structures.
 * These types represent agent configuration, communication, and personalization features
 * that enable AI assistants to negotiate scheduling on behalf of users while maintaining privacy.
 */

import {
  AGENT_STATUS,
  MESSAGE_TYPES,
  MEETING_TYPES,
  LOCATION_TYPES,
  MESSAGE_PRIORITY,
  CONVERSATION_STATUS,
  APPROVAL_TYPES,
  APPROVAL_STATUS,
  PROPOSAL_STATUS
} from '../constants';

/**
 * Represents the core agent entity with identification and configuration
 */
export interface Agent {
  agentId: string;
  userId: string;
  name: string;
  configuration: AgentConfiguration;
  publicKey: string;  // Public key for secure communication
  status: AgentStatus;
  lastActive: Date;
  created: Date;
  updated: Date;
}

/**
 * Represents possible agent status values
 */
export type AgentStatus = typeof AGENT_STATUS[keyof typeof AGENT_STATUS];

/**
 * Defines configuration options for an agent's behavior and preferences
 */
export interface AgentConfiguration {
  communicationStyle: CommunicationStyle;
  schedulingPreferences: SchedulingPreferences;
  locationPreferences: LocationPreferences;
  privacySettings: PrivacySettings;
  enableAgentCommunication: boolean;
  requireApproval: boolean;
  showConversationLogs: boolean;
}

/**
 * Defines communication style preferences for agent interactions
 */
export interface CommunicationStyle {
  formality: CommunicationFormality;
  verbosity: CommunicationVerbosity;
  tone: CommunicationTone;
}

/**
 * Represents formality levels for agent communication
 */
export enum CommunicationFormality {
  FORMAL = 'FORMAL',
  CASUAL = 'CASUAL',
  PROFESSIONAL = 'PROFESSIONAL'
}

/**
 * Represents verbosity levels for agent communication
 */
export enum CommunicationVerbosity {
  BRIEF = 'BRIEF',
  DETAILED = 'DETAILED',
  BALANCED = 'BALANCED'
}

/**
 * Represents tone options for agent communication
 */
export enum CommunicationTone {
  FRIENDLY = 'FRIENDLY',
  PROFESSIONAL = 'PROFESSIONAL',
  DIRECT = 'DIRECT'
}

/**
 * Defines scheduling preferences for meeting negotiations
 */
export interface SchedulingPreferences {
  preferredTimes: TimePreference[];
  bufferDuration: number;  // Minutes of buffer time before/after meetings
  advanceNotice: number;   // Minutes of advance notice required
  preferredMeetingTypes: MeetingType[];
}

/**
 * Defines time preferences for specific days of the week
 */
export interface TimePreference {
  dayOfWeek: DayOfWeek;
  startTime: string;  // Format: "HH:MM" in 24-hour time
  endTime: string;    // Format: "HH:MM" in 24-hour time
  priority: PreferencePriority;
}

/**
 * Represents days of the week for scheduling preferences
 */
export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

/**
 * Represents types of meetings that can be scheduled
 */
export type MeetingType = typeof MEETING_TYPES[keyof typeof MEETING_TYPES];

/**
 * Represents priority levels for preferences
 */
export enum PreferencePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * Defines location preferences for meeting arrangements
 */
export interface LocationPreferences {
  defaultLocation: string;  // Default location name or address
  favoriteLocations: string[];  // List of favorite location names
  locationTypes: LocationType[];  // Preferred types of locations
  travelRadius: number;  // Maximum travel distance in miles/kilometers
}

/**
 * Represents types of locations for meetings
 */
export type LocationType = typeof LOCATION_TYPES[keyof typeof LOCATION_TYPES];

/**
 * Defines location information for meeting proposals
 */
export interface Location {
  name: string;
  address: string;
  locationType: LocationType;
  coordinates: Coordinates;
}

/**
 * Defines geographic coordinates for locations
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Defines privacy settings for controlling what information is shared
 */
export interface PrivacySettings {
  shareCalendarAvailability: boolean;
  shareLocationPreferences: boolean;
  shareMeetingPreferences: boolean;
  allowAutomaticScheduling: boolean;
}

/**
 * Defines the structure of messages exchanged between agents
 */
export interface AgentMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  messageType: string;  // Use MESSAGE_TYPES constant values
  content: any;  // Varies based on messageType
  timestamp: number;  // Unix timestamp
  metadata: MessageMetadata;
}

/**
 * Defines metadata for messages including priority and expiration
 */
export interface MessageMetadata {
  priority: MessagePriority;
  expiresAt: number;  // Unix timestamp when message expires
  encrypted: boolean;  // Whether the content is encrypted
  requiresResponse: boolean;  // Whether a response is expected
}

/**
 * Represents priority levels for messages
 */
export type MessagePriority = typeof MESSAGE_PRIORITY[keyof typeof MESSAGE_PRIORITY];

/**
 * Defines the content structure for handshake messages
 */
export interface HandshakeMessage {
  agentId: string;
  publicKey: string;  // Public key for encryption
}

/**
 * Defines the content structure for query messages
 */
export interface QueryMessage {
  requestId: string;
  queryType: string;  // Type of query, e.g., "availability", "preferences"
  parameters: any;  // Query-specific parameters
}

/**
 * Defines the content structure for response messages
 */
export interface ResponseMessage {
  requestId: string;  // Corresponds to QueryMessage.requestId
  data: any;  // Response data
  error: string;  // Error message if applicable
}

/**
 * Defines the content structure for proposal messages
 */
export interface ProposalMessage {
  proposalId: string;
  details: MeetingProposal;
}

/**
 * Defines the details structure for a meeting proposal
 */
export interface MeetingProposal {
  title: string;
  description: string;
  startTime: string;  // ISO 8601 format
  endTime: string;  // ISO 8601 format
  location: Location;
  meetingType: MeetingType;
  participants: string[];  // User IDs
  status: string;  // Use PROPOSAL_STATUS constant values
  expiresAt: number;  // Unix timestamp
}

/**
 * Defines the content structure for confirmation messages
 */
export interface ConfirmationMessage {
  proposalId: string;
  status: string;  // Use PROPOSAL_STATUS.ACCEPTED
  calendarEventId: string;  // ID of created calendar event
}

/**
 * Defines the content structure for rejection messages
 */
export interface RejectionMessage {
  proposalId: string;
  reason: string;  // Reason for rejection
  details: string;  // Additional details
}

/**
 * Defines the content structure for heartbeat messages
 */
export interface HeartbeatMessage {
  timestamp: number;  // Unix timestamp
}

/**
 * Defines the structure of conversations between agents
 */
export interface AgentConversation {
  conversationId: string;
  initiatorAgentId: string;
  recipientAgentId: string;
  messages: AgentMessage[];
  status: ConversationStatus;
  created: Date;
  updated: Date;
  metadata: ConversationMetadata;
}

/**
 * Represents possible status values for conversations
 */
export type ConversationStatus = typeof CONVERSATION_STATUS[keyof typeof CONVERSATION_STATUS];

/**
 * Defines metadata for conversations including purpose and context
 */
export interface ConversationMetadata {
  purpose: string;  // Purpose of the conversation
  context: any;  // Additional context
  expiresAt: number;  // Unix timestamp when conversation expires
}

/**
 * Defines the structure of commands issued to agents
 */
export interface AgentCommand {
  commandId: string;
  command: string;  // Natural language command
  parameters: Record<string, any>;  // Command-specific parameters
  status: CommandStatus;
  created: Date;
  updated: Date;
}

/**
 * Represents possible status values for commands
 */
export enum CommandStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Defines the structure of approval requests that require user decision
 */
export interface AgentApprovalRequest {
  requestId: string;
  agentId: string;
  userId: string;
  type: ApprovalType;
  data: any;  // Approval-specific data
  status: ApprovalStatus;
  conversationId: string;  // Related conversation if applicable
  created: Date;
  updated: Date;
  expiresAt: Date;  // When the request expires
}

/**
 * Represents types of approvals that can be requested
 */
export type ApprovalType = typeof APPROVAL_TYPES[keyof typeof APPROVAL_TYPES];

/**
 * Represents possible status values for approval requests
 */
export type ApprovalStatus = typeof APPROVAL_STATUS[keyof typeof APPROVAL_STATUS];

/**
 * Defines the structure of agent-related errors
 */
export interface AgentError {
  code: string;
  message: string;
  details: any;
  timestamp: number;  // Unix timestamp
}

/**
 * Defines the state structure for agent-related data in the application
 */
export interface AgentState {
  currentAgent: Agent | null;
  conversations: AgentConversation[];
  approvalRequests: AgentApprovalRequest[];
  loading: boolean;
  error: AgentError | null;
}

/**
 * Defines the actions available for interacting with agents
 */
export interface AgentActions {
  createAgent: (userId: string, config?: Partial<AgentConfiguration>) => Promise<Agent>;
  updateAgentConfiguration: (agentId: string, config: Partial<AgentConfiguration>) => Promise<Agent>;
  updateAgentStatus: (agentId: string, status: AgentStatus) => Promise<Agent>;
  processCommand: (agentId: string, command: string) => Promise<{ response: string, action?: any }>;
  startConversation: (initiatorAgentId: string, recipientAgentId: string, context: any) => Promise<AgentConversation>;
  getConversations: (agentId: string) => Promise<AgentConversation[]>;
  sendMessage: (conversationId: string, senderId: string, messageType: string, content: any) => Promise<AgentMessage>;
  getApprovalRequests: (userId: string) => Promise<AgentApprovalRequest[]>;
  updateApprovalRequest: (requestId: string, status: ApprovalStatus, modifiedData?: any) => Promise<AgentApprovalRequest>;
  connectWebSocket: (agentId: string, authToken: string) => Promise<boolean>;
  disconnectWebSocket: (agentId: string) => Promise<void>;
}

/**
 * Defines the agent context structure for React context
 */
export interface AgentContext {
  state: AgentState;
  actions: AgentActions;
}

/**
 * Defines the request structure for creating a new agent
 */
export interface CreateAgentRequest {
  userId: string;
  name: string;
  configuration: AgentConfiguration;
}

/**
 * Defines the request structure for updating an existing agent
 */
export interface UpdateAgentRequest {
  agentId: string;
  name: string;
  configuration: Partial<AgentConfiguration>;
  status: AgentStatus;
}