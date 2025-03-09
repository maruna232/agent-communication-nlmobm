import dotenv from 'dotenv';
import { 
  DEFAULT_CONFIG,
  ENCRYPTION,
  JWT_CONFIG,
  RATE_LIMITS,
  TIMEOUT_VALUES,
  LOG_LEVELS
} from './constants';

/**
 * Loads environment variables from .env file based on NODE_ENV
 */
function loadEnv(): void {
  const environment = process.env.NODE_ENV || 'development';
  const envFile = environment === 'test' ? '.env.test' : `.env.${environment}`;
  
  dotenv.config({ path: envFile });
  console.log(`Environment: ${environment}`);
}

/**
 * Retrieves an environment variable with fallback to default value
 * @param key The environment variable key
 * @param defaultValue The default value if environment variable is not set
 * @returns The environment variable value or default value
 */
function getEnvVariable(key: string, defaultValue: any): any {
  return process.env[key] !== undefined ? process.env[key] : defaultValue;
}

// Load environment variables
loadEnv();

/**
 * Server configuration interface
 */
export interface ServerConfig {
  port: number;
  host: string;
  corsOrigin: string | string[];
  environment: string;
}

/**
 * WebSocket configuration interface
 */
export interface WebSocketConfig {
  path: string;
  maxConnections: number;
  pingInterval: number;
  pingTimeout: number;
  upgradeTimeout: number;
}

/**
 * Redis configuration interface for scaling WebSocket servers
 */
export interface RedisConfig {
  enabled: boolean;
  host: string;
  port: number;
  password: string;
  db: number;
  keyPrefix: string;
}

/**
 * Authentication configuration interface
 */
export interface AuthConfig {
  jwtSecret: string;
  jwtAlgorithm: string;
  jwtExpiresIn: number;
  refreshTokenExpiresIn: number;
  firebaseProjectId: string;
}

/**
 * Encryption configuration interface
 */
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  iterations: number;
  serverKeyPath: string;
}

/**
 * Rate limiting configuration interface
 */
export interface RateLimitConfig {
  websocketMessages: number;
  websocketConnections: number;
  apiRequests: number;
  authAttempts: number;
}

/**
 * Logging configuration interface
 */
export interface LoggingConfig {
  level: string;
  format: string;
  directory: string;
}

/**
 * Complete application configuration interface
 */
export interface AppConfig {
  server: ServerConfig;
  websocket: WebSocketConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  encryption: EncryptionConfig;
  rateLimit: RateLimitConfig;
  logging: LoggingConfig;
}

/**
 * Application configuration object
 */
export const config: AppConfig = {
  server: {
    port: parseInt(getEnvVariable('PORT', DEFAULT_CONFIG.PORT), 10),
    host: getEnvVariable('HOST', 'localhost'),
    corsOrigin: getEnvVariable('CORS_ORIGIN', DEFAULT_CONFIG.CORS_ORIGIN).includes(',')
      ? getEnvVariable('CORS_ORIGIN', DEFAULT_CONFIG.CORS_ORIGIN)
          .split(',')
          .map((origin: string) => origin.trim())
      : getEnvVariable('CORS_ORIGIN', DEFAULT_CONFIG.CORS_ORIGIN),
    environment: getEnvVariable('NODE_ENV', 'development')
  },
  websocket: {
    path: getEnvVariable('WEBSOCKET_PATH', '/socket.io'),
    maxConnections: parseInt(getEnvVariable('MAX_CONNECTIONS', '1000'), 10),
    pingInterval: parseInt(getEnvVariable('PING_INTERVAL', TIMEOUT_VALUES.HEARTBEAT_INTERVAL), 10),
    pingTimeout: parseInt(getEnvVariable('PING_TIMEOUT', TIMEOUT_VALUES.SOCKET_RESPONSE), 10),
    upgradeTimeout: parseInt(getEnvVariable('UPGRADE_TIMEOUT', TIMEOUT_VALUES.SOCKET_CONNECTION), 10)
  },
  redis: {
    enabled: getEnvVariable('REDIS_ENABLED', 'false') === 'true',
    host: getEnvVariable('REDIS_HOST', 'localhost'),
    port: parseInt(getEnvVariable('REDIS_PORT', '6379'), 10),
    password: getEnvVariable('REDIS_PASSWORD', ''),
    db: parseInt(getEnvVariable('REDIS_DB', '0'), 10),
    keyPrefix: getEnvVariable('REDIS_KEY_PREFIX', 'aiagent:')
  },
  auth: {
    jwtSecret: getEnvVariable('JWT_SECRET', 'replace-this-with-a-secure-secret-in-production'),
    jwtAlgorithm: getEnvVariable('JWT_ALGORITHM', JWT_CONFIG.ALGORITHM),
    jwtExpiresIn: parseInt(getEnvVariable('JWT_EXPIRES_IN', JWT_CONFIG.EXPIRY.toString()), 10),
    refreshTokenExpiresIn: parseInt(getEnvVariable('REFRESH_TOKEN_EXPIRES_IN', JWT_CONFIG.REFRESH_EXPIRY.toString()), 10),
    firebaseProjectId: getEnvVariable('FIREBASE_PROJECT_ID', 'ai-agent-network')
  },
  encryption: {
    algorithm: getEnvVariable('ENCRYPTION_ALGORITHM', ENCRYPTION.ALGORITHM),
    keyLength: parseInt(getEnvVariable('ENCRYPTION_KEY_LENGTH', ENCRYPTION.KEY_LENGTH.toString()), 10),
    iterations: parseInt(getEnvVariable('ENCRYPTION_ITERATIONS', ENCRYPTION.ITERATIONS.toString()), 10),
    serverKeyPath: getEnvVariable('SERVER_KEY_PATH', './keys/server.key')
  },
  rateLimit: {
    websocketMessages: parseInt(getEnvVariable('RATE_LIMIT_WS_MESSAGES', RATE_LIMITS.WEBSOCKET_MESSAGES.toString()), 10),
    websocketConnections: parseInt(getEnvVariable('RATE_LIMIT_WS_CONNECTIONS', RATE_LIMITS.WEBSOCKET_CONNECTIONS.toString()), 10),
    apiRequests: parseInt(getEnvVariable('RATE_LIMIT_API', RATE_LIMITS.API_REQUESTS.toString()), 10),
    authAttempts: parseInt(getEnvVariable('RATE_LIMIT_AUTH', RATE_LIMITS.AUTH_ATTEMPTS.toString()), 10)
  },
  logging: {
    level: getEnvVariable('LOG_LEVEL', DEFAULT_CONFIG.LOG_LEVEL),
    format: getEnvVariable('LOG_FORMAT', 'json'),
    directory: getEnvVariable('LOG_DIRECTORY', './logs')
  }
};

export default config;