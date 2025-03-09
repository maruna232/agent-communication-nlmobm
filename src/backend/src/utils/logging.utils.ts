import winston from 'winston';
import { Request, Response } from 'express';
import { logging, env } from '../config/config';
import { LOG_LEVELS } from '../config/constants';

/**
 * Creates a configured Winston logger instance based on application configuration
 * @returns Winston logger instance with appropriate transports and formatting
 */
const createLogger = (): winston.Logger => {
  // Determine log level from configuration or default to INFO
  const level = logging.level || LOG_LEVELS.INFO;
  
  // Define different log formats based on environment
  const formats = {
    development: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    ),
    production: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  };
  
  // Select format based on environment
  const format = env === 'production' ? formats.production : formats.development;
  
  // Configure transports (where logs will be output)
  const transports: winston.transport[] = [
    new winston.transports.Console()
  ];
  
  // Add file transport in production for persistent logs
  if (env === 'production' && logging.directory) {
    transports.push(
      new winston.transports.File({
        filename: `${logging.directory}/error.log`,
        level: LOG_LEVELS.ERROR
      }),
      new winston.transports.File({
        filename: `${logging.directory}/combined.log`
      })
    );
  }
  
  // Create and return the logger
  return winston.createLogger({
    level,
    format,
    transports,
    exitOnError: false
  });
};

// Create the main logger instance
const logger = createLogger();

/**
 * Removes sensitive information from data before logging
 * @param data Object to sanitize
 * @returns Sanitized data object with sensitive information removed or masked
 */
const sanitizeData = (data: any): any => {
  // Return early if data is null or undefined
  if (data == null) return data;
  
  // Create a deep copy to avoid modifying the original object
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Sensitive fields to remove or mask
  const sensitiveFields = [
    'password', 'token', 'accessToken', 'refreshToken', 'authorization',
    'secret', 'apiKey', 'private', 'credentials', 'jwt'
  ];
  
  // Function to recursively sanitize objects
  const sanitizeObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      // Check if the key is sensitive
      const keyLower = key.toLowerCase();
      if (sensitiveFields.some(field => keyLower.includes(field))) {
        obj[key] = '[REDACTED]';
      } 
      // Mask email addresses
      else if (typeof obj[key] === 'string' && /^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(obj[key])) {
        const email = obj[key];
        const [localPart, domain] = email.split('@');
        // Mask the local part but keep the domain
        obj[key] = `${localPart.substring(0, 3)}***@${domain}`;
      }
      // Recursively sanitize nested objects
      else if (obj[key] !== null && typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    });
  };
  
  sanitizeObject(sanitized);
  return sanitized;
};

/**
 * Logs HTTP request details with privacy considerations
 * @param req Express Request object
 */
const logRequest = (req: Request): void => {
  const requestId = req.headers['x-request-id'] || req.headers['request-id'] || 'unknown';
  
  // Collect relevant request information
  const requestInfo = {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'accept': req.headers['accept'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    },
    body: req.body
  };
  
  // Sanitize request data to remove sensitive information
  const sanitizedInfo = sanitizeData(requestInfo);
  
  logger.info(`Request ${requestId}: ${req.method} ${req.path}`, {
    request: sanitizedInfo,
    timestamp: new Date().toISOString()
  });
};

/**
 * Logs HTTP response details with timing information
 * @param req Express Request object
 * @param res Express Response object
 * @param responseTime Response time in milliseconds
 */
const logResponse = (req: Request, res: Response, responseTime: number): void => {
  const requestId = req.headers['x-request-id'] || req.headers['request-id'] || 'unknown';
  
  // Collect relevant response information
  const responseInfo = {
    requestId,
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    responseTime: `${responseTime}ms`,
    headers: {
      'content-type': res.getHeader('content-type'),
      'content-length': res.getHeader('content-length')
    }
  };
  
  // Determine log level based on status code
  const isError = res.statusCode >= 400;
  const logLevel = isError ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
  
  // Log the response information at the appropriate level
  logger[logLevel](`Response ${requestId}: ${res.statusCode} (${responseTime}ms)`, {
    response: responseInfo,
    timestamp: new Date().toISOString()
  });
};

/**
 * Creates a request-specific logger with request context
 * @param req Express Request object
 * @returns Context-aware logger object
 */
const getRequestLogger = (req: Request) => {
  const requestId = req.headers['x-request-id'] || req.headers['request-id'] || 'unknown';
  const userId = (req as any).user?.id || 'anonymous';
  
  // Create context for this request
  const requestContext = {
    requestId,
    userId,
    path: req.path,
    method: req.method
  };
  
  // Create child logger with the request context
  const childLogger = logger.child(requestContext);
  
  // Return an object with logging methods that include the context
  return {
    error: (message: string, meta?: any) => childLogger.error(message, sanitizeData(meta)),
    warn: (message: string, meta?: any) => childLogger.warn(message, sanitizeData(meta)),
    info: (message: string, meta?: any) => childLogger.info(message, sanitizeData(meta)),
    debug: (message: string, meta?: any) => childLogger.debug(message, sanitizeData(meta))
  };
};

/**
 * Formats error objects for consistent logging
 * @param error Error object
 * @returns Formatted error object for logging
 */
const formatError = (error: Error): any => {
  // Extract error message, name, and stack trace
  const formattedError = {
    message: error.message,
    name: error.name,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
  };
  
  // Check if the error is a custom AppError and include additional properties
  if (error && (error as any).statusCode) {
    // This appears to be a custom AppError with additional properties
    Object.assign(formattedError, {
      statusCode: (error as any).statusCode,
      errorCode: (error as any).errorCode,
      details: (error as any).details
    });
  }
  
  return formattedError;
};

export {
  logger,
  logRequest,
  logResponse,
  getRequestLogger,
  formatError
};