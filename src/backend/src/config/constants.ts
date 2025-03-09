/**
 * Constants used throughout the application.
 * These values define the behavior of various components in the system.
 */

/**
 * HTTP status codes used for API responses
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * WebSocket event types for socket.io implementation
 */
export const WEBSOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  PRESENCE: 'presence',
  TYPING: 'typing',
  ACK: 'ack'
};

/**
 * Message types for agent-to-agent communication protocol
 */
export const MESSAGE_TYPES = {
  HANDSHAKE: 'HANDSHAKE',
  QUERY: 'QUERY',
  RESPONSE: 'RESPONSE',
  PROPOSAL: 'PROPOSAL',
  CONFIRMATION: 'CONFIRMATION',
  REJECTION: 'REJECTION',
  HEARTBEAT: 'HEARTBEAT'
};

/**
 * Rate limits for different types of requests
 * Values represent requests per minute per user/connection
 */
export const RATE_LIMITS = {
  WEBSOCKET_MESSAGES: 60,    // 1 message per second on average
  WEBSOCKET_CONNECTIONS: 5,  // Max 5 concurrent connections per user
  API_REQUESTS: 120,         // 2 requests per second on average
  AUTH_ATTEMPTS: 5           // 5 authentication attempts per minute
};

/**
 * Timeout values for various operations in milliseconds
 */
export const TIMEOUT_VALUES = {
  SOCKET_CONNECTION: 30000,      // 30 seconds for initial connection
  SOCKET_RESPONSE: 10000,        // 10 seconds for message response
  PROPOSAL_EXPIRY: 86400000,     // 24 hours for proposal expiry
  HEARTBEAT_INTERVAL: 30000      // 30 seconds between heartbeats
};

/**
 * Redis channel names for pub/sub communication between server instances
 */
export const REDIS_CHANNELS = {
  AGENT_MESSAGES: 'agent-messages',
  PRESENCE_UPDATES: 'presence-updates',
  SERVER_EVENTS: 'server-events'
};

/**
 * Logging levels for the application
 */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * Default configuration values for the application
 */
export const DEFAULT_CONFIG = {
  PORT: 3001,
  CORS_ORIGIN: '*',  // Should be restricted in production
  LOG_LEVEL: 'info'
};

/**
 * Encryption constants for secure communication
 */
export const ENCRYPTION = {
  ALGORITHM: 'AES-256-GCM',
  KEY_LENGTH: 256,
  ITERATIONS: 100000
};

/**
 * JWT configuration for authentication
 */
export const JWT_CONFIG = {
  ALGORITHM: 'RS256',
  EXPIRY: 3600,               // 1 hour in seconds
  REFRESH_EXPIRY: 1209600     // 14 days in seconds
};