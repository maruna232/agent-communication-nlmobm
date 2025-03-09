import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid'; // v4.9.0
import onFinished from 'on-finished'; // v2.4.1

import { logger, logRequest, logResponse, getRequestLogger } from '../utils/logging.utils';
import { config } from '../config/config';
import { HTTP_STATUS } from '../config/constants';

/**
 * Middleware that assigns a unique request ID to each incoming request
 * for tracking and correlation purposes
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate a unique ID for this request
  const requestId = uuidv4();
  
  // Attach the ID to the request object for use throughout the request lifecycle
  (req as any).id = requestId;
  
  // Add the request ID as a response header for client-side tracking
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

/**
 * Middleware that logs HTTP requests and responses with timing information
 * Captures detailed information while respecting privacy concerns
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip if logging is disabled in configuration
  if (!config.logging || config.logging.level === 'none') {
    return next();
  }

  // Record start time for performance tracking
  const startTime = process.hrtime();
  
  // Create a request-specific logger and attach to request object
  const requestLogger = getRequestLogger(req);
  (req as any).logger = requestLogger;
  
  // Log the incoming request
  logRequest(req);
  
  // Use onFinished to detect when the response is complete
  onFinished(res, (err, res) => {
    // Calculate response time in milliseconds
    const hrtime = process.hrtime(startTime);
    const responseTimeMs = Math.round((hrtime[0] * 1000) + (hrtime[1] / 1000000));
    
    // Log the response with timing information
    logResponse(req, res, responseTimeMs);
    
    // For error responses, log additional details
    if (res.statusCode >= 400) {
      logger.error(`Request failed: ${req.method} ${req.path} - ${res.statusCode}`, {
        requestId: (req as any).id || 'unknown',
        responseTime: responseTimeMs,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
};

/**
 * Helper function to determine if logging should be skipped for certain paths
 * Common exclusions include health checks, static assets, and metrics endpoints
 */
const skipLoggingForPath = (path: string): boolean => {
  // Define paths that should be excluded from logging
  const excludedPaths = [
    '/health',
    '/healthz',
    '/livez',
    '/readyz',
    '/metrics',
    '/favicon.ico',
    '/robots.txt',
    '/public/',
    '/static/'
  ];
  
  // Check if the path starts with any of the excluded paths
  return excludedPaths.some(excludedPath => 
    path === excludedPath || 
    (excludedPath.endsWith('/') && path.startsWith(excludedPath))
  );
};

/**
 * Combined middleware that applies request ID and logging middleware
 * Also handles path exclusions for reduced noise in logs
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip logging for certain paths to reduce noise
  if (skipLoggingForPath(req.path)) {
    return next();
  }
  
  // Apply request ID middleware
  requestIdMiddleware(req, res, () => {
    // Then apply request logger middleware
    requestLoggerMiddleware(req, res, next);
  });
};

export default loggingMiddleware;