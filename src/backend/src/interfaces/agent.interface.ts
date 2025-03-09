import { AgentStatus } from '../config/constants';

/**
 * Interface representing an AI agent within the system.
 * An agent acts on behalf of a user and can communicate with other agents.
 */
export interface IAgent {
  /** Unique identifier for the agent */
  agentId: string;
  
  /** ID of the user this agent represents */
  userId: string;
  
  /** Display name of the agent */
  name: string;
  
  /** Configuration for agent behavior and preferences */
  configuration: IAgentConfiguration;
  
  /** Public key used for secure agent-to-agent communication */
  publicKey: string;
  
  /** Current status of the agent */
  status: AgentStatus;
  
  /** Timestamp of last activity */
  lastActive: Date;
  
  /** Timestamp of when the agent was created */
  created: Date;
  
  /** Timestamp of last update to the agent */
  updated: Date;
}

/**
 * Interface defining the configuration options for an agent's behavior.
 * These settings control how the agent communicates, schedules, and manages privacy.
 */
export interface IAgentConfiguration {
  /** Communication style preferences for agent interactions */
  communicationStyle: ICommunicationStyle;
  
  /** Preferences for scheduling meetings and events */
  schedulingPreferences: ISchedulingPreferences;
  
  /** Preferences for meeting locations */
  locationPreferences: ILocationPreferences;
  
  /** Privacy settings for controlling what information is shared */
  privacySettings: IPrivacySettings;
  
  /** Flag to enable/disable agent-to-agent communication */
  enableAgentCommunication: boolean;
  
  /** Flag to require user approval for agent actions */
  requireApproval: boolean;
  
  /** Flag to show conversation logs between agents */
  showConversationLogs: boolean;
}

/**
 * Interface defining the communication style for an agent.
 * These settings affect the tone, formality, and verbosity of agent messages.
 */
export interface ICommunicationStyle {
  /** Formality level of communication */
  formality: CommunicationFormality;
  
  /** Verbosity level of communication */
  verbosity: CommunicationVerbosity;
  
  /** Tone of communication */
  tone: CommunicationTone;
}

/**
 * Interface defining scheduling preferences for an agent.
 * These preferences guide the agent in negotiating meeting times.
 */
export interface ISchedulingPreferences {
  /** Preferred times for meetings by day of week */
  preferredTimes: ITimePreference[];
  
  /** Buffer duration in minutes before/after meetings */
  bufferDuration: number;
  
  /** Advance notice required in minutes */
  advanceNotice: number;
  
  /** Types of meetings the user prefers */
  preferredMeetingTypes: MeetingType[];
}

/**
 * Interface defining a time preference for a specific day of the week.
 */
export interface ITimePreference {
  /** Day of the week */
  dayOfWeek: DayOfWeek;
  
  /** Start time in 24-hour format (HH:MM) */
  startTime: string;
  
  /** End time in 24-hour format (HH:MM) */
  endTime: string;
  
  /** Priority of this time preference */
  priority: PreferencePriority;
}

/**
 * Interface defining location preferences for an agent.
 * These preferences guide the agent in suggesting meeting locations.
 */
export interface ILocationPreferences {
  /** Default location for meetings */
  defaultLocation: string;
  
  /** List of favorite locations */
  favoriteLocations: string[];
  
  /** Preferred types of locations */
  locationTypes: LocationType[];
  
  /** Maximum travel radius in kilometers */
  travelRadius: number;
}

/**
 * Interface defining a location for meetings.
 */
export interface ILocation {
  /** Name of the location */
  name: string;
  
  /** Address of the location */
  address: string;
  
  /** Type of location */
  locationType: LocationType;
  
  /** Geographic coordinates */
  coordinates: ICoordinates;
}

/**
 * Interface defining geographic coordinates.
 */
export interface ICoordinates {
  /** Latitude in decimal degrees */
  latitude: number;
  
  /** Longitude in decimal degrees */
  longitude: number;
}

/**
 * Interface defining privacy settings for an agent.
 * These settings control what information the agent shares with other agents.
 */
export interface IPrivacySettings {
  /** Flag to share calendar availability */
  shareCalendarAvailability: boolean;
  
  /** Flag to share location preferences */
  shareLocationPreferences: boolean;
  
  /** Flag to share meeting type preferences */
  shareMeetingPreferences: boolean;
  
  /** Flag to allow automatic scheduling without approval */
  allowAutomaticScheduling: boolean;
}

/**
 * Interface for the request to create a new agent.
 */
export interface IAgentCreationRequest {
  /** ID of the user this agent represents */
  userId: string;
  
  /** Display name of the agent */
  name: string;
  
  /** Configuration for agent behavior and preferences */
  configuration: IAgentConfiguration;
  
  /** Public key used for secure agent-to-agent communication */
  publicKey: string;
}

/**
 * Interface for the request to update an existing agent.
 */
export interface IAgentUpdateRequest {
  /** New display name for the agent (optional) */
  name?: string;
  
  /** Updated configuration settings (partial update supported) */
  configuration?: Partial<IAgentConfiguration>;
  
  /** New public key (optional) */
  publicKey?: string;
}

/**
 * Interface for agent operation responses.
 */
export interface IAgentResponse {
  /** The agent data */
  agent: IAgent;
  
  /** Message describing the operation result */
  message: string;
}

/**
 * Interface for agent search parameters.
 */
export interface IAgentSearchParams {
  /** Filter by user ID */
  userId?: string;
  
  /** Filter by agent name (partial match) */
  name?: string;
  
  /** Filter by agent status */
  status?: AgentStatus;
  
  /** Maximum number of results to return */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
}

/**
 * Enumeration of formality levels for agent communication.
 */
export enum CommunicationFormality {
  FORMAL = 'FORMAL',
  CASUAL = 'CASUAL',
  PROFESSIONAL = 'PROFESSIONAL'
}

/**
 * Enumeration of verbosity levels for agent communication.
 */
export enum CommunicationVerbosity {
  BRIEF = 'BRIEF',
  DETAILED = 'DETAILED',
  BALANCED = 'BALANCED'
}

/**
 * Enumeration of tone options for agent communication.
 */
export enum CommunicationTone {
  FRIENDLY = 'FRIENDLY',
  PROFESSIONAL = 'PROFESSIONAL',
  DIRECT = 'DIRECT'
}

/**
 * Enumeration of days of the week.
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
 * Enumeration of meeting types.
 */
export enum MeetingType {
  COFFEE = 'COFFEE',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  VIDEO_CALL = 'VIDEO_CALL',
  PHONE_CALL = 'PHONE_CALL',
  IN_PERSON = 'IN_PERSON'
}

/**
 * Enumeration of location types.
 */
export enum LocationType {
  COFFEE_SHOP = 'COFFEE_SHOP',
  RESTAURANT = 'RESTAURANT',
  OFFICE = 'OFFICE',
  VIRTUAL = 'VIRTUAL',
  OTHER = 'OTHER'
}

/**
 * Enumeration of preference priority levels.
 */
export enum PreferencePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * Enumeration of message priority levels.
 */
export enum MessagePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}