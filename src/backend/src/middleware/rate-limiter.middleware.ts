import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible'; // v2.4.1
import { config } from '../config/config';
import { RATE_LIMIT_ERRORS } from '../config/error-messages';
import { HTTP_STATUS } from '../config/constants';
import { createRateLimitError } from '../utils/error.utils';
import { logger } from '../utils/logging.utils';
import { redisService } from '../services/redis.service';

/**
 * Extracts a unique identifier for the client from request for rate limiting purposes
 * @param req Express request object
 * @returns Unique identifier based on user ID or IP address
 */
function getClientIdentifier(req: Request): string {
  // Try to use user ID if the user is authenticated
  const userId = (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address if user is not authenticated
  let ip = req.headers['x-forwarded-for'] as string;
  if (!ip) {
    ip = req.ip || 'unknown';
  } else if (ip.includes(',')) {
    // If x-forwarded-for contains multiple IPs, use the first one (client IP)
    ip = ip.split(',')[0].trim();
  }

  return `ip:${ip}`;
}

/**
 * Helper function to calculate appropriate retry-after time in seconds
 * @param msBeforeNext Milliseconds before next allowed request
 * @returns Seconds to wait before retrying
 */
function calculateRetryAfter(msBeforeNext: number): number {
  // Convert to seconds and round up
  return Math.max(1, Math.ceil(msBeforeNext / 1000));
}

/**
 * Singleton class that manages rate limiter instances for different purposes
 */
class RateLimiterManager {
  private limiters: Map<string, RateLimiterMemory | RateLimiterRedis>;
  private useRedis: boolean;

  constructor() {
    this.limiters = new Map();
    // Check if Redis is enabled in config and connected
    this.useRedis = config.redis.enabled && redisService.isRedisConnected();
    logger.info(`Initializing rate limiter manager with ${this.useRedis ? 'Redis' : 'Memory'} storage`);
  }

  /**
   * Gets or creates a rate limiter instance for a specific key
   * @param key Unique identifier for this rate limiter
   * @param options Configuration options for the rate limiter
   * @returns Rate limiter instance
   */
  getLimiter(key: string, options: any): RateLimiterMemory | RateLimiterRedis {
    if (this.limiters.has(key)) {
      return this.limiters.get(key);
    }

    let limiter;
    
    if (this.useRedis) {
      // In a production environment with multiple server instances,
      // we need to use Redis for distributed rate limiting
      try {
        // Assuming redisService has a publisher property that is the Redis client
        limiter = new RateLimiterRedis({
          storeClient: redisService['publisher'], // Accessing private property - needs refactoring in production
          keyPrefix: `ratelimit:${key}:`,
          ...options
        });
        logger.debug(`Created Redis-based rate limiter for ${key}`);
      } catch (error) {
        logger.warn(`Failed to create Redis rate limiter, falling back to memory-based: ${error.message}`);
        limiter = new RateLimiterMemory(options);
      }
    } else {
      limiter = new RateLimiterMemory(options);
      logger.debug(`Created memory-based rate limiter for ${key}`);
    }

    this.limiters.set(key, limiter);
    return limiter;
  }

  /**
   * Attempts to consume points from a rate limiter for a client
   * @param limiterKey Key identifying the rate limiter type
   * @param clientId Client identifier (user ID or IP)
   * @param points Number of points to consume (cost of the operation)
   * @param options Additional configuration options
   * @returns Result object with success status and time before next allowed request
   */
  async consumePoints(
    limiterKey: string,
    clientId: string,
    points: number = 1,
    options: any = {}
  ): Promise<{ success: boolean, msBeforeNext?: number }> {
    try {
      const limiter = this.getLimiter(limiterKey, options);
      await limiter.consume(clientId, points);
      return { success: true };
    } catch (error) {
      if (error.remainingPoints !== undefined) {
        // This is a rate limit error from rate-limiter-flexible
        logger.debug(`Rate limit exceeded for ${clientId} on ${limiterKey}`, {
          msBeforeNext: error.msBeforeNext,
          points,
          limiterKey
        });
        return { success: false, msBeforeNext: error.msBeforeNext };
      }
      
      // Unexpected error
      logger.error(`Error in rate limiter for ${clientId} on ${limiterKey}: ${error.message}`, {
        error,
        clientId,
        limiterKey
      });
      return { success: false, msBeforeNext: 60000 }; // Default to 1 minute if unknown error
    }
  }
}

// Create singleton instance
const rateLimiterManager = new RateLimiterManager();

/**
 * Factory function that creates rate limiter middleware with specified options
 * @param options Rate limiter configuration options
 * @param clientIdExtractor Optional custom function to extract client ID
 * @returns Express middleware function for rate limiting
 */
function createRateLimiterMiddleware(options: any, clientIdExtractor?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clientId = clientIdExtractor ? clientIdExtractor(req) : getClientIdentifier(req);
    const limiterKey = options.keyPrefix || 'default';
    const points = options.points || 1;
    const errorCode = options.errorCode || RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS;
    
    const result = await rateLimiterManager.consumePoints(limiterKey, clientId, points, options);
    
    if (result.success) {
      // Request is allowed, proceed to next middleware
      next();
    } else {
      // Rate limit exceeded, return error response
      const retryAfter = calculateRetryAfter(result.msBeforeNext);
      
      // Set appropriate response headers
      res.setHeader('Retry-After', retryAfter.toString());
      
      const error = createRateLimitError(errorCode, { seconds: retryAfter });
      
      // Log rate limit event
      const isAuthLimiter = errorCode === RATE_LIMIT_ERRORS.TOO_MANY_LOGIN_ATTEMPTS;
      if (isAuthLimiter) {
        logger.warn(`Rate limit exceeded for authentication attempts: ${clientId}`, {
          clientId,
          retryAfter,
          path: req.path
        });
      } else {
        logger.debug(`Rate limit exceeded: ${clientId} on ${req.path}`, {
          clientId,
          retryAfter,
          path: req.path
        });
      }
      
      next(error);
    }
  };
}

/**
 * Middleware for limiting general API request rates
 */
const apiRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const apiOptions = {
    keyPrefix: 'api',
    points: config.rateLimit.apiRequests,
    duration: 60, // 1 minute window
    errorCode: RATE_LIMIT_ERRORS.TOO_MANY_REQUESTS,
    blockDuration: 60  // 1 minute block when limit is reached
  };
  
  return createRateLimiterMiddleware(apiOptions)(req, res, next);
};

/**
 * Middleware for limiting authentication attempt rates to prevent brute force attacks
 */
const authRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const authOptions = {
    keyPrefix: 'auth',
    points: config.rateLimit.authAttempts,
    duration: 60, // 1 minute window
    errorCode: RATE_LIMIT_ERRORS.TOO_MANY_LOGIN_ATTEMPTS,
    blockDuration: 300 // 5 minute block when limit is reached
  };
  
  // Custom extractor that always uses IP address for auth endpoints
  const authClientIdExtractor = (req: Request): string => {
    let ip = req.headers['x-forwarded-for'] as string;
    if (!ip) {
      ip = req.ip || 'unknown';
    } else if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    return `ip:${ip}`;
  };
  
  return createRateLimiterMiddleware(authOptions, authClientIdExtractor)(req, res, next);
};

/**
 * Function for limiting WebSocket connection rates
 * @param clientId Unique identifier for the client (user ID or IP)
 * @returns Promise resolving to true if connection allowed, false if rate limited
 */
async function websocketConnectionRateLimiter(clientId: string): Promise<boolean> {
  const wsConnOptions = {
    keyPrefix: 'ws_conn',
    points: config.rateLimit.websocketConnections,
    duration: 60, // 1 minute window
    blockDuration: 60 // 1 minute block when limit is reached
  };
  
  const result = await rateLimiterManager.consumePoints('ws_conn', clientId, 1, wsConnOptions);
  
  if (!result.success) {
    logger.warn(`WebSocket connection rate limit exceeded for ${clientId}`, {
      clientId,
      msBeforeNext: result.msBeforeNext
    });
  }
  
  return result.success;
}

/**
 * Function for limiting WebSocket message rates
 * @param clientId Unique identifier for the client (user ID or IP)
 * @param messageType Type of message being sent
 * @returns Promise resolving to true if message allowed, false if rate limited
 */
async function websocketMessageRateLimiter(clientId: string, messageType: string): Promise<boolean> {
  // Different message types can have different costs
  let points = 1;
  switch (messageType) {
    case 'HEARTBEAT':
      points = 0.1; // Heartbeats are cheaper
      break;
    case 'HANDSHAKE':
      points = 2; // Handshakes are more expensive
      break;
    default:
      points = 1; // Default cost
  }
  
  const wsMessageOptions = {
    keyPrefix: 'ws_msg',
    points: config.rateLimit.websocketMessages,
    duration: 60, // 1 minute window
    blockDuration: 30 // 30 second block when limit is reached
  };
  
  const result = await rateLimiterManager.consumePoints('ws_msg', clientId, points, wsMessageOptions);
  
  if (!result.success) {
    logger.debug(`WebSocket message rate limit exceeded for ${clientId}`, {
      clientId,
      messageType,
      msBeforeNext: result.msBeforeNext
    });
  }
  
  return result.success;
}

export {
  apiRateLimiter,
  authRateLimiter,
  websocketConnectionRateLimiter,
  websocketMessageRateLimiter,
  rateLimiterManager
};