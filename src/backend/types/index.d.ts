import { Server, Socket, Namespace } from 'socket.io'; // socket.io 4.7+

// Extend Express namespace
declare namespace Express {
  interface Request {
    user?: IUser;
    token?: string;
    agentId?: string;
  }
}

// Constants

// WebSocket events
export const WEBSOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  PRESENCE: 'presence',
  TYPING: 'typing',
  ACK: 'ack'
} as const;

// Message types
export const MESSAGE_TYPES = {
  HANDSHAKE: 'HANDSHAKE',
  QUERY: 'QUERY',
  RESPONSE: 'RESPONSE',
  PROPOSAL: 'PROPOSAL',
  CONFIRMATION: 'CONFIRMATION',
  REJECTION: 'REJECTION',
  HEARTBEAT: 'HEARTBEAT'
} as const;

// Query types
export const QUERY_TYPES = {
  AVAILABILITY: 'AVAILABILITY',
  LOCATION_PREFERENCE: 'LOCATION_PREFERENCE',
  MEETING_TYPE: 'MEETING_TYPE',
  TIME_PREFERENCE: 'TIME_PREFERENCE'
} as const;

// Proposal status
export const PROPOSAL_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  MODIFIED: 'MODIFIED',
  EXPIRED: 'EXPIRED'
} as const;

// Rejection reasons
export const REJECTION_REASONS = {
  SCHEDULE_CONFLICT: 'SCHEDULE_CONFLICT',
  LOCATION_UNAVAILABLE: 'LOCATION_UNAVAILABLE',
  USER_DECLINED: 'USER_DECLINED',
  TIME_UNSUITABLE: 'TIME_UNSUITABLE',
  OTHER: 'OTHER'
} as const;

// Connection status
export const CONNECTION_STATUS = {
  PENDING: 'PENDING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  REJECTED: 'REJECTED'
} as const;

// Rate limits
export const RATE_LIMITS = {
  WEBSOCKET_MESSAGES: 10, // messages per second
  WEBSOCKET_CONNECTIONS: 100, // connections per IP
  API_REQUESTS: 100, // requests per minute
  AUTH_ATTEMPTS: 5 // login attempts per minute
} as const;

// Authentication constants
export const AUTH_CONSTANTS = {
  TOKEN_EXPIRY: 3600, // 1 hour in seconds
  REFRESH_TOKEN_EXPIRY: 2592000, // 30 days in seconds
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 300 // 5 minutes in seconds
} as const;

// Enums

export enum AgentStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BUSY = 'BUSY',
  AWAY = 'AWAY',
  DISABLED = 'DISABLED'
}

export enum CommunicationFormality {
  FORMAL = 'FORMAL',
  CASUAL = 'CASUAL',
  PROFESSIONAL = 'PROFESSIONAL'
}

export enum CommunicationVerbosity {
  BRIEF = 'BRIEF',
  DETAILED = 'DETAILED',
  BALANCED = 'BALANCED'
}

export enum CommunicationTone {
  FRIENDLY = 'FRIENDLY',
  PROFESSIONAL = 'PROFESSIONAL',
  DIRECT = 'DIRECT'
}

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

export enum MeetingType {
  COFFEE = 'COFFEE',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  VIDEO_CALL = 'VIDEO_CALL',
  PHONE_CALL = 'PHONE_CALL',
  IN_PERSON = 'IN_PERSON'
}

export enum LocationType {
  COFFEE_SHOP = 'COFFEE_SHOP',
  RESTAURANT = 'RESTAURANT',
  OFFICE = 'OFFICE',
  VIRTUAL = 'VIRTUAL',
  OTHER = 'OTHER'
}

export enum MessagePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  ERROR = 'ERROR'
}

export enum MessageDeliveryStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export enum AuthProvider {
  EMAIL_PASSWORD = 'EMAIL_PASSWORD',
  GOOGLE = 'GOOGLE'
}

export enum PreferencePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

// Interfaces

// Agent and User interfaces

export interface IAgent {
  agentId: string;
  userId: string;
  name: string;
  configuration: IAgentConfiguration;
  publicKey: string;
  status: AgentStatus;
  lastActive: Date;
  created: Date;
  updated: Date;
}

export interface IAgentConfiguration {
  communicationStyle: ICommunicationStyle;
  schedulingPreferences: ISchedulingPreferences;
  locationPreferences: ILocationPreferences;
  privacySettings: IPrivacySettings;
  enableAgentCommunication: boolean;
  requireApproval: boolean;
  showConversationLogs: boolean;
}

export interface ICommunicationStyle {
  formality: CommunicationFormality;
  verbosity: CommunicationVerbosity;
  tone: CommunicationTone;
}

export interface ISchedulingPreferences {
  preferredTimes: ITimePreference[];
  bufferDuration: number; // in minutes
  advanceNotice: number; // in hours
  preferredMeetingTypes: MeetingType[];
}

export interface ITimePreference {
  dayOfWeek: DayOfWeek;
  startTime: string; // ISO time format (HH:MM)
  endTime: string; // ISO time format (HH:MM)
  priority: PreferencePriority;
}

export interface ILocationPreferences {
  defaultLocation: string;
  favoriteLocations: string[];
  locationTypes: LocationType[];
  travelRadius: number; // in miles/kilometers
}

export interface IPrivacySettings {
  shareCalendarAvailability: boolean;
  shareLocationPreferences: boolean;
  shareMeetingPreferences: boolean;
  allowAutomaticScheduling: boolean;
}

export interface IUser {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  emailVerified: boolean;
  createdAt: Date;
  lastLogin: Date;
}

// Authentication interfaces

export interface IAuthToken {
  token: string;
  expiresAt: number; // Unix timestamp
  refreshToken: string;
}

export interface ITokenPayload {
  userId: string;
  email: string;
  agentId?: string;
  iat: number; // Issued at
  exp: number; // Expires at
}

// Message interfaces

export interface IMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  messageType: string;
  content: any;
  timestamp: number;
  metadata: IMessageMetadata;
}

export interface IMessageMetadata {
  priority: MessagePriority;
  expiresAt?: number; // Unix timestamp
  encrypted: boolean;
  requiresResponse: boolean;
}

export interface IHandshakeMessage {
  agentId: string;
  publicKey: string;
}

export interface IQueryMessage {
  requestId: string;
  queryType: string;
  parameters?: any;
}

export interface IResponseMessage {
  requestId: string;
  data?: any;
  error?: string;
}

export interface IProposalMessage {
  proposalId: string;
  details: IMeetingProposal;
}

export interface IMeetingProposal {
  title: string;
  description?: string;
  startTime: string; // ISO date-time
  endTime: string; // ISO date-time
  location: ILocation;
  meetingType: MeetingType;
  participants: string[]; // User IDs
  status: string; // From PROPOSAL_STATUS
  expiresAt: number; // Unix timestamp
}

export interface ILocation {
  name: string;
  address?: string;
  locationType: LocationType;
  coordinates?: ICoordinates;
}

export interface ICoordinates {
  latitude: number;
  longitude: number;
}

export interface IConfirmationMessage {
  proposalId: string;
  status: string; // From PROPOSAL_STATUS
  calendarEventId?: string;
}

export interface IRejectionMessage {
  proposalId: string;
  reason: string; // From REJECTION_REASONS
  details?: string;
}

export interface IHeartbeatMessage {
  timestamp: number; // Unix timestamp
}

// Connection interfaces

export interface IConnection {
  connectionId: string;
  initiatorAgentId: string;
  recipientAgentId: string;
  status: string; // From CONNECTION_STATUS
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
}

// WebSocket interfaces

export interface IWebSocketServer {
  io: Server;
  connections: Map<string, IWebSocketConnection>;
  initialize(): void;
  registerHandlers(): void;
  sendMessage(recipient: string, message: IMessage): Promise<boolean>;
  broadcastMessage(message: IMessage): void;
  getConnectionByAgentId(agentId: string): IWebSocketConnection | undefined;
  disconnectAgent(agentId: string): void;
}

export interface IWebSocketConnection {
  socket: Socket;
  agentId: string;
  userId: string;
  publicKey: string;
  connectedAt: Date;
  lastActivity: Date;
  status: ConnectionStatus;
  metadata: IConnectionMetadata;
}

export interface IConnectionMetadata {
  userAgent?: string;
  ip?: string;
  deviceId?: string;
  authMethod?: AuthProvider;
}

export interface IWebSocketEvent {
  eventType: string;
  payload: any;
  timestamp: number;
}

export interface IWebSocketMessage {
  message: IMessage;
  encrypted: boolean;
  signature?: string;
}