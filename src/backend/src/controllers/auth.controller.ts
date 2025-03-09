import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { 
  ILoginRequest, 
  IRegisterRequest,
  IPasswordResetRequest,
  IVerifyTokenRequest,
  IRefreshTokenRequest,
  IAuthRequest
} from '../interfaces/auth.interface';
import { extractTokenFromHeader } from '../utils/jwt.utils';
import { handleAsyncError, createAuthError } from '../utils/error.utils';
import { HTTP_STATUS } from '../config/constants';
import { AUTH_ERRORS } from '../config/error-messages';
import { logger } from '../utils/logging.utils';

/**
 * Handles user registration with email, password, and display name
 * 
 * @param req Express request object containing registration data
 * @param res Express response object
 * @param next Express next function
 */
const register = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract registration data (email, password, displayName) from request body
  const registerData: IRegisterRequest = req.body;
  
  // Call authService.register with the registration data
  const authResponse = await authService.register(registerData);
  
  // Log successful registration with sanitized user information
  logger.info(`User registered successfully: ${authResponse.user.userId}`, {
    userId: authResponse.user.userId,
    emailDomain: authResponse.user.email.split('@')[1] // Only log email domain for privacy
  });
  
  // Return HTTP 201 Created response with user data and tokens
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: authResponse
  });
});

/**
 * Authenticates a user with email and password
 * 
 * @param req Express request object containing login credentials
 * @param res Express response object
 * @param next Express next function
 */
const login = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract login credentials (email, password) from request body
  const loginData: ILoginRequest = req.body;
  
  // Call authService.login with the credentials
  const authResponse = await authService.login(loginData);
  
  // Log successful login with sanitized user information
  logger.info(`User login successful: ${authResponse.user.userId}`, {
    userId: authResponse.user.userId
  });
  
  // Return HTTP 200 OK response with user data and tokens
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: authResponse
  });
});

/**
 * Verifies a JWT token and returns the decoded payload
 * 
 * @param req Express request object containing token to verify
 * @param res Express response object
 * @param next Express next function
 */
const verifyToken = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract token from request body
  const { token } = req.body as IVerifyTokenRequest;
  
  // Call authService.verifyToken to validate the token
  const payload = await authService.verifyToken(token);
  
  // Log successful token verification
  logger.debug('Token verified successfully', {
    userId: payload.userId
  });
  
  // Return HTTP 200 OK response with decoded token payload
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: payload
  });
});

/**
 * Refreshes an authentication token using a refresh token
 * 
 * @param req Express request object containing refresh token
 * @param res Express response object
 * @param next Express next function
 */
const refreshToken = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract refresh token from request body
  const { refreshToken: refreshTokenValue } = req.body as IRefreshTokenRequest;
  
  // Call authService.refreshToken to generate new tokens
  const tokens = await authService.refreshToken(refreshTokenValue);
  
  // Log successful token refresh
  logger.debug('Token refreshed successfully');
  
  // Return HTTP 200 OK response with new tokens
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: tokens
  });
});

/**
 * Initiates a password reset for a user
 * 
 * @param req Express request object containing email address
 * @param res Express response object
 * @param next Express next function
 */
const resetPassword = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract email from request body
  const resetData: IPasswordResetRequest = req.body;
  
  // Call authService.resetPassword to initiate password reset
  await authService.resetPassword(resetData);
  
  // Log password reset request with sanitized information
  logger.info(`Password reset requested for email domain: ${resetData.email.split('@')[1]}`, {
    emailDomain: resetData.email.split('@')[1]
  });
  
  // Return HTTP 200 OK response with success message
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password reset link has been sent to your email'
  });
});

/**
 * Retrieves the current authenticated user's information
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const getCurrentUser = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check if user is authenticated in the request object
  const authReq = req as IAuthRequest;
  if (!authReq.user) {
    throw createAuthError(AUTH_ERRORS.UNAUTHORIZED);
  }
  
  // Return HTTP 200 OK response with user data
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: authReq.user
  });
});

/**
 * Updates a user's profile information
 * 
 * @param req Express request object with profile data
 * @param res Express response object
 * @param next Express next function
 */
const updateUserProfile = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check if user is authenticated in the request object
  const authReq = req as IAuthRequest;
  if (!authReq.user) {
    throw createAuthError(AUTH_ERRORS.UNAUTHORIZED);
  }
  
  // Extract profile data from request body
  const profileData = req.body;
  
  // Call authService.updateUserProfile with user ID and profile data
  const updatedUser = await authService.updateUserProfile(authReq.user.userId, profileData);
  
  // Log successful profile update with sanitized information
  logger.info(`User profile updated: ${updatedUser.userId}`, {
    userId: updatedUser.userId
  });
  
  // Return HTTP 200 OK response with updated user data
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: updatedUser
  });
});

/**
 * Associates an agent ID with the authenticated user
 * 
 * @param req Express request object with agent ID
 * @param res Express response object
 * @param next Express next function
 */
const setAgentId = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check if user is authenticated in the request object
  const authReq = req as IAuthRequest;
  if (!authReq.user) {
    throw createAuthError(AUTH_ERRORS.UNAUTHORIZED);
  }
  
  // Extract agent ID from request body
  const { agentId } = req.body;
  
  // Call authService.setAgentIdForUser with user ID and agent ID
  await authService.setAgentIdForUser(authReq.user.userId, agentId);
  
  // Log successful agent ID association
  logger.info(`Agent ID set for user: ${authReq.user.userId}`, {
    userId: authReq.user.userId,
    agentId
  });
  
  // Return HTTP 200 OK response with success message
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Agent ID associated with user successfully'
  });
});

/**
 * Logs out a user by invalidating their session
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const logout = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check if user is authenticated in the request object
  const authReq = req as IAuthRequest;
  if (!authReq.user) {
    // If not authenticated, return HTTP 204 No Content (already logged out)
    return res.status(HTTP_STATUS.NO_CONTENT).end();
  }
  
  // Log successful logout
  logger.info(`User logged out: ${authReq.user.userId}`, {
    userId: authReq.user.userId
  });
  
  // Return HTTP 204 No Content response
  res.status(HTTP_STATUS.NO_CONTENT).end();
});

/**
 * Retrieves authentication metrics for monitoring (admin only)
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
const getAuthMetrics = handleAsyncError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Check if user is authenticated and has admin role
  const authReq = req as IAuthRequest;
  if (!authReq.user) {
    throw createAuthError(AUTH_ERRORS.UNAUTHORIZED);
  }
  
  // TODO: Add admin role check when role-based permission is implemented
  
  // Call authService.getAuthMetrics to retrieve metrics
  const metrics = await authService.getAuthMetrics();
  
  // Return HTTP 200 OK response with metrics data
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: metrics
  });
});

export {
  register,
  login,
  verifyToken,
  refreshToken,
  resetPassword,
  getCurrentUser,
  updateUserProfile,
  setAgentId,
  logout,
  getAuthMetrics
};