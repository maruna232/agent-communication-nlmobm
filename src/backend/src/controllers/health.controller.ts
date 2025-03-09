import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redis.service';
import { websocketService } from '../services/websocket.service';
import { authService } from '../services/auth.service';
import { config } from '../config/config';
import { logger } from '../utils/logging.utils';

/**
 * Provides a basic health check endpoint that returns server status and version
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function getBasicHealth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.debug('Basic health check requested');

  try {
    // Calculate server uptime
    const uptimeSeconds = process.uptime();
    const uptime = {
      seconds: Math.floor(uptimeSeconds % 60),
      minutes: Math.floor((uptimeSeconds / 60) % 60),
      hours: Math.floor((uptimeSeconds / (60 * 60)) % 24),
      days: Math.floor(uptimeSeconds / (60 * 60 * 24)),
    };

    // Create health response
    const health = {
      status: 'ok',
      version: process.env.npm_package_version || '1.0.0', // Fallback if not available
      environment: config.server.environment,
      uptime: uptime,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error(`Error in basic health check: ${error.message}`, { error });
    next(error);
  }
}

/**
 * Provides a detailed health check with status of all system components
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function getDetailedHealth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.debug('Detailed health check requested');

  try {
    // Get basic health first
    const uptimeSeconds = process.uptime();
    const uptime = {
      seconds: Math.floor(uptimeSeconds % 60),
      minutes: Math.floor((uptimeSeconds / 60) % 60),
      hours: Math.floor((uptimeSeconds / (60 * 60)) % 24),
      days: Math.floor(uptimeSeconds / (60 * 60 * 24)),
    };

    // Get Redis status
    const redisStatus = {
      enabled: config.redis.enabled,
      connected: redisService.isRedisConnected()
    };

    // Get WebSocket statistics
    const websocketStats = websocketService.getStats();

    // Get Auth metrics
    const authMetrics = authService.getAuthMetrics();

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memory = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
    };

    // Create detailed health response
    const health = {
      status: 'ok',
      version: process.env.npm_package_version || '1.0.0', // Fallback if not available
      environment: config.server.environment,
      uptime: uptime,
      redis: redisStatus,
      websocket: websocketStats,
      auth: authMetrics,
      system: {
        memory,
        // Note: CPU usage requires more complex calculation with multiple samples over time
        platform: process.platform,
        nodeVersion: process.version,
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error(`Error in detailed health check: ${error.message}`, { error });
    next(error);
  }
}

/**
 * Checks and reports the health of the Redis connection
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function getRedisHealth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.debug('Redis health check requested');

  try {
    // Check if Redis is enabled in configuration
    if (!config.redis.enabled) {
      res.status(200).json({
        status: 'disabled',
        message: 'Redis is disabled in configuration',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if Redis is connected
    const isConnected = redisService.isRedisConnected();
    
    // If Redis is enabled but not connected, return service unavailable
    if (!isConnected) {
      res.status(503).json({
        status: 'error',
        message: 'Redis is enabled but not connected',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Redis is connected and healthy
    res.status(200).json({
      status: 'ok',
      message: 'Redis is connected and operational',
      config: {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
        keyPrefix: config.redis.keyPrefix
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error in Redis health check: ${error.message}`, { error });
    next(error);
  }
}

/**
 * Checks and reports the health of the WebSocket server
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function getWebSocketHealth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.debug('WebSocket health check requested');

  try {
    // Get WebSocket statistics
    const stats = websocketService.getStats();
    
    // Calculate server uptime in human-readable format
    const uptimeSeconds = stats.uptime;
    const uptime = {
      seconds: Math.floor(uptimeSeconds % 60),
      minutes: Math.floor((uptimeSeconds / 60) % 60),
      hours: Math.floor((uptimeSeconds / (60 * 60)) % 24),
      days: Math.floor(uptimeSeconds / (60 * 60 * 24)),
    };

    // Format the response
    const health = {
      status: 'ok',
      connections: {
        active: stats.activeConnections,
        total: stats.totalConnections
      },
      messages: {
        sent: stats.messagesSent,
        received: stats.messagesReceived,
        delivered: stats.messagesDelivered,
        failed: stats.messagesFailed
      },
      uptime: uptime,
      startTime: stats.startTime,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error(`Error in WebSocket health check: ${error.message}`, { error });
    next(error);
  }
}

/**
 * Checks and reports the health of the authentication service
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function getAuthHealth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.debug('Authentication health check requested');

  try {
    // Get authentication metrics
    const metrics = authService.getAuthMetrics();

    // Format the response
    const health = {
      status: 'ok',
      metrics: metrics,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error(`Error in Authentication health check: ${error.message}`, { error });
    next(error);
  }
}