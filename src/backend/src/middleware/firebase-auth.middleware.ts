import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { IAuthRequest } from '../interfaces/auth.interface';
import { extractTokenFromHeader } from '../utils/jwt.utils';
import { createAuthError } from '../utils/error.utils';
import { AUTH_ERRORS } from '../config/error-messages';
import { HTTP_STATUS } from '../config/constants';
import { logger } from '../utils/logging.utils';

/**
 * Express middleware that authenticates requests using Firebase Authentication.
 * Validates the JWT token from the Authorization header, extracts user information,
 * and attaches it to the request object for downstream handlers.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const firebaseAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract JWT token from the Authorization header
    const token = extractTokenFromHeader(req);
    
    // If no token is found, throw an authentication error
    if (!token) {
      throw createAuthError(AUTH_ERRORS.UNAUTHORIZED, { message: 'Authentication token is missing' });
    }
    
    try {
      // Verify the token using the authentication service
      const decodedToken = await authService.verifyToken(token);
      
      // Extract the user ID from the token payload
      const { userId } = decodedToken;
      
      // Retrieve complete user information from Firebase
      const user = await authService.getUserById(userId);
      
      // Attach user object and token to the request for downstream handlers
      (req as IAuthRequest).user = user;
      (req as IAuthRequest).token = token;
      
      // Log successful authentication (debug level)
      logger.debug(`User authenticated: ${userId}`);
      
      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      // Handle specific authentication errors
      if (error.code === AUTH_ERRORS.TOKEN_EXPIRED) {
        throw createAuthError(AUTH_ERRORS.TOKEN_EXPIRED, { message: 'Authentication token has expired' });
      } else if (error.code === AUTH_ERRORS.TOKEN_INVALID) {
        throw createAuthError(AUTH_ERRORS.TOKEN_INVALID, { message: 'Authentication token is invalid' });
      } else {
        throw createAuthError(AUTH_ERRORS.UNAUTHORIZED, { message: 'Authentication failed', error: error.message });
      }
    }
  } catch (error) {
    // Log authentication error
    logger.error('Authentication error', { error: error.message });
    
    // Pass the error to the error handling middleware
    next(error);
  }
};

/**
 * Express middleware that authenticates requests if a token is present,
 * but allows unauthenticated requests to proceed without user information.
 * This is useful for routes that can handle both authenticated and unauthenticated users.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract JWT token from the Authorization header
    const token = extractTokenFromHeader(req);
    
    // If no token is found, allow the request to proceed without authentication
    if (!token) {
      return next();
    }
    
    try {
      // Verify the token using the authentication service
      const decodedToken = await authService.verifyToken(token);
      
      // Extract the user ID from the token payload
      const { userId } = decodedToken;
      
      // Retrieve complete user information from Firebase
      const user = await authService.getUserById(userId);
      
      // Attach user object and token to the request for downstream handlers
      (req as IAuthRequest).user = user;
      (req as IAuthRequest).token = token;
      
      // Log successful authentication (debug level)
      logger.debug(`User authenticated (optional): ${userId}`);
    } catch (error) {
      // Log the error but do not block the request
      logger.debug(`Optional authentication failed: ${error.message}`);
      
      // Do not attach user information to the request
      // Request will proceed as unauthenticated
    }
    
    // Always proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Log unexpected errors but allow the request to proceed
    logger.error('Unexpected error in optional authentication', { error: error.message });
    next();
  }
};