/**
 * constants/index.ts
 * 
 * This file defines constants used throughout the AI Agent Network application.
 * These constants support the privacy-focused, local-first architecture of the application.
 */

/**
 * Agent status values
 * Used to indicate the current status of an agent
 */
export const AGENT_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  AWAY: 'away',
  DISABLED: 'disabled'
} as const;

/**
 * Message types for agent-to-agent communication protocol
 * These define the types of messages that can be exchanged between agents
 */
export const MESSAGE_TYPES = {
  HANDSHAKE: 'handshake',    // Initial connection establishment
  QUERY: 'query',            // Request for information
  RESPONSE: 'response',      // Reply to a query
  PROPOSAL: 'proposal',      // Suggest meeting details
  CONFIRMATION: 'confirmation', // Accept a proposal
  REJECTION: 'rejection',    // Decline a proposal
  HEARTBEAT: 'heartbeat'     // Connection maintenance
} as const;

/**
 * WebSocket event types for socket.io communication
 * These define the events used in the WebSocket communication protocol
 */
export const WEBSOCKET_EVENTS = {
  CONNECT: 'connect',        // Establish agent connection
  DISCONNECT: 'disconnect',  // Graceful connection closure
  MESSAGE: 'message',        // Agent-to-agent communication
  PRESENCE: 'presence',      // Agent availability updates
  TYPING: 'typing',          // Real-time typing indicators
  ACK: 'ack'                 // Message delivery confirmation
} as const;

/**
 * Message priority levels
 * Used to indicate the urgency of messages between agents
 */
export const MESSAGE_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

/**
 * Types of meetings that can be scheduled
 * Used to classify different meeting types for scheduling
 */
export const MEETING_TYPES = {
  COFFEE: 'coffee',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  VIDEO_CALL: 'video_call',
  PHONE_CALL: 'phone_call',
  IN_PERSON: 'in_person'
} as const;

/**
 * Types of locations for meetings
 * Used to classify different location types for meetings
 */
export const LOCATION_TYPES = {
  COFFEE_SHOP: 'coffee_shop',
  RESTAURANT: 'restaurant',
  OFFICE: 'office',
  VIRTUAL: 'virtual',
  OTHER: 'other'
} as const;

/**
 * Status values for agent conversations
 * Used to track the state of conversations between agents
 */
export const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

/**
 * Types of approvals that require user decision
 * Used to classify different approval requests
 */
export const APPROVAL_TYPES = {
  MEETING_PROPOSAL: 'meeting_proposal',
  CALENDAR_EVENT: 'calendar_event',
  CONNECTION_REQUEST: 'connection_request',
  INFORMATION_SHARING: 'information_sharing'
} as const;

/**
 * Status values for approval requests
 * Used to track the state of approval requests
 */
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MODIFIED: 'modified',
  EXPIRED: 'expired'
} as const;

/**
 * Status values for meeting proposals
 * Used to track the state of meeting proposals
 */
export const PROPOSAL_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  MODIFIED: 'modified',
  EXPIRED: 'expired'
} as const;

/**
 * Authentication states for the application
 * Used to track the current authentication state
 */
export const AUTH_STATES = {
  UNAUTHENTICATED: 'unauthenticated',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated'
} as const;

/**
 * Supported authentication providers
 * Used to identify authentication methods
 */
export const AUTH_PROVIDERS = {
  EMAIL_PASSWORD: 'email_password',
  GOOGLE: 'google'
} as const;

/**
 * Status values for calendar synchronization
 * Used to track the state of calendar synchronization
 */
export const CALENDAR_SYNC_STATUS = {
  SYNCING: 'syncing',
  SYNCED: 'synced',
  ERROR: 'error',
  NOT_CONNECTED: 'not_connected'
} as const;

/**
 * Status values for calendar events
 * Used to track the state of calendar events
 */
export const CALENDAR_EVENT_STATUS = {
  CONFIRMED: 'confirmed',
  TENTATIVE: 'tentative',
  CANCELLED: 'cancelled'
} as const;

/**
 * Error type categories for consistent error handling
 * Used to classify different types of errors
 */
export const ERROR_TYPES = {
  AGENT: 'agent_error',
  NETWORK: 'network_error',
  AUTHENTICATION: 'authentication_error',
  CALENDAR: 'calendar_error',
  STORAGE: 'storage_error',
  WEBSOCKET: 'websocket_error'
} as const;

/**
 * API endpoint URLs for external services
 * Contains the base URLs for various API endpoints
 */
export const API_ENDPOINTS = {
  WEBSOCKET: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://api.aiagentnework.example/ws',
  CALENDAR: 'https://www.googleapis.com/calendar/v3',
  AGENT: process.env.NEXT_PUBLIC_AGENT_API_URL || '/api/agent',
  AUTH: process.env.NEXT_PUBLIC_AUTH_API_URL || '/api/auth'
} as const;

/**
 * Default configuration values for system components
 * Contains default settings for various aspects of the application
 */
export const DEFAULT_CONFIG = {
  WEBSOCKET_RECONNECT_ATTEMPTS: 5,
  WEBSOCKET_RECONNECT_DELAY: 2000, // 2 seconds
  WEBSOCKET_TIMEOUT: 10000, // 10 seconds
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  MESSAGE_RETRY_ATTEMPTS: 3,
  CALENDAR_SYNC_INTERVAL: 900000, // 15 minutes
  TOKEN_REFRESH_THRESHOLD: 300000 // 5 minutes before expiry
} as const;

/**
 * Storage keys for local data persistence
 * Used as keys for storing data in IndexedDB/localStorage
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PROFILE: 'user_profile',
  AGENT_CONFIG: 'agent_config',
  CALENDAR_DATA: 'calendar_data',
  CALENDAR_CREDENTIALS: 'calendar_credentials',
  CONVERSATION_HISTORY: 'conversation_history',
  ENCRYPTION_KEYS: 'encryption_keys'
} as const;

/**
 * Current version of the local storage schema
 * Used for migrations when the schema changes
 */
export const LOCAL_STORAGE_VERSION = '1.0.0';

/**
 * Maximum retry attempts for various operations
 * Sets limits on how many times operations will be retried
 */
export const MAX_RETRY_ATTEMPTS = {
  API: 3,
  WEBSOCKET: 5,
  CALENDAR: 3
} as const;

/**
 * Timeout durations for various operations in milliseconds
 * Sets how long to wait before timing out different operations
 */
export const TIMEOUT_DURATIONS = {
  API_REQUEST: 10000, // 10 seconds
  WEBSOCKET_CONNECTION: 10000, // 10 seconds
  CALENDAR_OPERATION: 30000, // 30 seconds
  APPROVAL_REQUEST: 86400000 // 24 hours
} as const;