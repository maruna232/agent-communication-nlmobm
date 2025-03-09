import { Request, Response, NextFunction } from 'express';
import { 
  AppError,
  isCustomError,
  getErrorStatusCode,
  formatErrorResponse,
  createNotFoundError
} from '../utils/error.utils';
import { HTTP_STATUS } from '../config/constants';
import { logger, formatError } from '../utils/logging.utils';
import { config } from '../config/config';

/**
 * Express middleware for handling errors and sending standardized error responses
 * 
 * @param error - The error object that was thrown
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
const errorMiddleware = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  // Log the error with appropriate context
  logger.error('Error caught by error middleware', {
    error: formatError(error),
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'] || 'unknown'
  });

  // Get appropriate status code
  const statusCode = getErrorStatusCode(error);
  
  // Format the error response
  const errorResponse = formatErrorResponse(error);
  
  // Send the error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Express middleware for handling 404 not found errors for undefined routes
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
const notFoundMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Create a standardized not found error
  const notFoundError = createNotFoundError(req.path);
  
  // Pass the error to the next middleware (error middleware)
  next(notFoundError);
};

/**
 * Higher-order function that wraps async route handlers to catch and forward async errors
 * 
 * @param fn - The async route handler function to wrap
 * @returns Wrapped function with error handling
 */
const asyncErrorWrapper = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export {
  errorMiddleware,
  notFoundMiddleware,
  asyncErrorWrapper
};