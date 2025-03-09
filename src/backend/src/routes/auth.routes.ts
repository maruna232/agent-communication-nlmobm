import { Router } from 'express';
import {
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
} from '../controllers/auth.controller';
import { firebaseAuthMiddleware } from '../middleware/firebase-auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  loginSchema,
  registerSchema,
  passwordResetSchema,
  verifyTokenSchema,
  refreshTokenSchema
} from '../validators/auth.validator';
import { logger } from '../utils/logging.utils';

/**
 * Creates and configures the Express router for authentication endpoints
 * @returns Configured Express router with authentication routes
 */
function createAuthRouter(): Router {
  // Create a new Express router instance
  const router = Router();
  
  // Log the initialization of the auth router
  logger.info('Initializing auth routes');

  // Public routes (no authentication required)
  
  // User registration route
  router.post('/register', validate(registerSchema), register);
  
  // User login route
  router.post('/login', validate(loginSchema), login);
  
  // Verify token route
  router.post('/verify-token', validate(verifyTokenSchema), verifyToken);
  
  // Refresh token route
  router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);
  
  // Password reset route
  router.post('/reset-password', validate(passwordResetSchema), resetPassword);
  
  // Protected routes (authentication required)
  
  // Get current user information
  router.get('/me', firebaseAuthMiddleware, getCurrentUser);
  
  // Update user profile
  router.put('/profile', firebaseAuthMiddleware, updateUserProfile);
  
  // Set agent ID for user
  router.post('/agent-id', firebaseAuthMiddleware, setAgentId);
  
  // User logout
  router.post('/logout', firebaseAuthMiddleware, logout);
  
  // Get authentication metrics (admin only)
  router.get('/metrics', firebaseAuthMiddleware, getAuthMetrics);
  
  // Log successful route registration
  logger.info('Auth routes registered successfully');
  
  return router;
}

// Create the router instance
const router = createAuthRouter();

// Export the router
export { router };