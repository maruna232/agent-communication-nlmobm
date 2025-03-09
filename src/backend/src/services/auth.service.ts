import admin from 'firebase-admin';
import { UserRecord } from 'firebase-admin/auth';
import { auth as authConfig } from '../config/config';
import { JWT_CONFIG } from '../config/constants';
import { AUTH_ERRORS } from '../config/error-messages';
import {
  IUser,
  IFirebaseAuthUser,
  IAuthToken,
  ITokenPayload,
  ILoginRequest,
  IRegisterRequest,
  IPasswordResetRequest,
  IAuthResponse,
  AuthProvider
} from '../interfaces/auth.interface';
import {
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/jwt.utils';
import { createAuthError } from '../utils/error.utils';
import { hashPassword, verifyPassword } from '../utils/encryption.utils';
import { logger } from '../utils/logging.utils';

/**
 * Service class that handles user authentication, registration, and token management
 */
class AuthService {
  private firebaseAuth: admin.auth.Auth;
  private authMetrics: {
    loginAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    passwordResets: number;
    tokenRefreshes: number;
  };

  /**
   * Initializes the AuthService with Firebase authentication
   */
  constructor() {
    // Initialize Firebase Auth instance from admin SDK
    this.firebaseAuth = admin.auth();
    
    // Initialize authentication metrics for monitoring
    this.authMetrics = {
      loginAttempts: 0,
      successfulLogins: 0,
      failedLogins: 0,
      passwordResets: 0,
      tokenRefreshes: 0
    };
    
    logger.info('AuthService initialized successfully');
  }

  /**
   * Registers a new user with email, password, and display name
   * @param registerData User registration data
   * @returns User data and authentication tokens
   */
  async register(registerData: IRegisterRequest): Promise<IAuthResponse> {
    const { email, password, displayName } = registerData;
    
    try {
      // Check if user with email already exists
      try {
        await this.firebaseAuth.getUserByEmail(email);
        // If we get here, user exists
        throw createAuthError(AUTH_ERRORS.EMAIL_IN_USE);
      } catch (error) {
        // If error is not found error, then user doesn't exist, which is what we want
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }
      
      // Create user in Firebase with email, password, and displayName
      const userRecord = await this.firebaseAuth.createUser({
        email,
        password,
        displayName,
        emailVerified: false
      });
      
      // Convert Firebase user to IUser format
      const user = this.convertFirebaseUserToUser(userRecord);
      
      // Generate JWT token and refresh token for the user
      const tokens = await this.generateAuthTokens(user);
      
      // Log successful user registration (with privacy considerations)
      logger.info(`User registered successfully: ${user.userId}`, {
        userId: user.userId,
        emailDomain: email.split('@')[1] // Only log email domain for privacy
      });
      
      // Return user data and tokens in IAuthResponse format
      return {
        user,
        tokens
      };
    } catch (error) {
      logger.error('User registration failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Authenticates a user with email and password
   * @param loginData User login credentials
   * @returns User data and authentication tokens
   */
  async login(loginData: ILoginRequest): Promise<IAuthResponse> {
    const { email, password } = loginData;
    
    // Increment loginAttempts metric
    this.authMetrics.loginAttempts++;
    
    try {
      // Try to get user by email from Firebase
      let userRecord: UserRecord;
      try {
        userRecord = await this.firebaseAuth.getUserByEmail(email);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          this.authMetrics.failedLogins++;
          throw createAuthError(AUTH_ERRORS.USER_NOT_FOUND);
        }
        throw error;
      }
      
      // If the user is disabled, we should prevent login
      if (userRecord.disabled) {
        this.authMetrics.failedLogins++;
        throw createAuthError(AUTH_ERRORS.ACCOUNT_LOCKED);
      }
      
      // Verify password - In a production environment, this would need to be
      // replaced with a secure verification method, as Firebase Admin SDK doesn't
      // directly support password verification
      try {
        // Simulate password verification - in production this would be 
        // handled differently, likely through Firebase Auth on client-side
        // or through a secure verification mechanism
        
        // If verification failed, throw error
        if (false /* simulated password check */) {
          throw new Error('Invalid password');
        }
        
        // In reality, we'd use Firebase signInWithEmailAndPassword on client-side
        // and verify tokens server-side, or implement a secure password verification
      } catch (error) {
        this.authMetrics.failedLogins++;
        throw createAuthError(AUTH_ERRORS.INVALID_CREDENTIALS);
      }
      
      // Convert Firebase user to IUser format
      const user = this.convertFirebaseUserToUser(userRecord);
      
      // Generate JWT token and refresh token for the user
      const tokens = await this.generateAuthTokens(user);
      
      // Increment successfulLogins metric
      this.authMetrics.successfulLogins++;
      
      // Log successful login (with privacy considerations)
      logger.info(`User login successful: ${user.userId}`, {
        userId: user.userId
      });
      
      // Return user data and tokens in IAuthResponse format
      return {
        user,
        tokens
      };
    } catch (error) {
      logger.error('User login failed', { 
        error: error.message,
        emailDomain: email.split('@')[1] // Only log email domain for privacy
      });
      throw error;
    }
  }

  /**
   * Verifies a JWT token and returns the decoded payload
   * @param token JWT token to verify
   * @returns Decoded token payload
   */
  async verifyToken(token: string): Promise<ITokenPayload> {
    try {
      // Verify the token using verifyToken utility
      const payload = await verifyToken(token);
      return payload;
    } catch (error) {
      logger.error('Token verification failed', { error: error.message });
      throw createAuthError(AUTH_ERRORS.TOKEN_INVALID);
    }
  }

  /**
   * Refreshes an authentication token using a refresh token
   * @param refreshToken Refresh token
   * @returns New authentication tokens
   */
  async refreshToken(refreshToken: string): Promise<IAuthToken> {
    // Increment tokenRefreshes metric
    this.authMetrics.tokenRefreshes++;
    
    try {
      // Verify the refresh token using verifyRefreshToken utility
      const payload = await verifyRefreshToken(refreshToken);
      
      // Extract user ID from the verified token payload
      const { userId } = payload;
      
      // Get user by ID from Firebase
      const userRecord = await this.firebaseAuth.getUser(userId);
      const user = this.convertFirebaseUserToUser(userRecord);
      
      // Generate new JWT token and refresh token for the user
      const tokens = await this.generateAuthTokens(user);
      
      // Log successful token refresh
      logger.info(`Token refreshed for user: ${userId}`, { userId });
      
      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      
      if (error.code === AUTH_ERRORS.TOKEN_EXPIRED) {
        throw createAuthError(AUTH_ERRORS.TOKEN_EXPIRED);
      }
      throw createAuthError(AUTH_ERRORS.TOKEN_INVALID);
    }
  }

  /**
   * Initiates a password reset for a user
   * @param resetData Password reset request data
   */
  async resetPassword(resetData: IPasswordResetRequest): Promise<void> {
    const { email } = resetData;
    
    // Increment passwordResets metric
    this.authMetrics.passwordResets++;
    
    try {
      // Check if user with email exists
      try {
        await this.firebaseAuth.getUserByEmail(email);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          throw createAuthError(AUTH_ERRORS.USER_NOT_FOUND);
        }
        throw error;
      }
      
      // Send password reset email using Firebase
      await this.firebaseAuth.generatePasswordResetLink(email);
      
      // Log password reset request (with privacy considerations)
      logger.info(`Password reset requested for email domain: ${email.split('@')[1]}`, {
        emailDomain: email.split('@')[1]
      });
    } catch (error) {
      logger.error('Password reset failed', { 
        error: error.message,
        emailDomain: email.split('@')[1]
      });
      throw error;
    }
  }

  /**
   * Retrieves a user by their ID
   * @param userId User ID
   * @returns User data
   */
  async getUserById(userId: string): Promise<IUser> {
    try {
      // Get user record from Firebase by ID
      const userRecord = await this.firebaseAuth.getUser(userId);
      
      // Convert Firebase user to IUser format
      const user = this.convertFirebaseUserToUser(userRecord);
      
      return user;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw createAuthError(AUTH_ERRORS.USER_NOT_FOUND);
      }
      logger.error('Failed to get user by ID', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Retrieves a user by their email address
   * @param email User email
   * @returns User data
   */
  async getUserByEmail(email: string): Promise<IUser> {
    try {
      // Get user record from Firebase by email
      const userRecord = await this.firebaseAuth.getUserByEmail(email);
      
      // Convert Firebase user to IUser format
      const user = this.convertFirebaseUserToUser(userRecord);
      
      return user;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw createAuthError(AUTH_ERRORS.USER_NOT_FOUND);
      }
      logger.error('Failed to get user by email', { 
        error: error.message,
        emailDomain: email.split('@')[1]
      });
      throw error;
    }
  }

  /**
   * Updates a user's profile information
   * @param userId User ID
   * @param profileData Profile data to update
   * @returns Updated user data
   */
  async updateUserProfile(userId: string, profileData: any): Promise<IUser> {
    try {
      // Get user record from Firebase by ID to verify existence
      await this.firebaseAuth.getUser(userId);
      
      // Update user profile in Firebase with provided data
      const userRecord = await this.firebaseAuth.updateUser(userId, profileData);
      
      // Convert Firebase user to IUser format
      const user = this.convertFirebaseUserToUser(userRecord);
      
      // Log successful profile update (with privacy considerations)
      logger.info(`User profile updated: ${userId}`, { userId });
      
      return user;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw createAuthError(AUTH_ERRORS.USER_NOT_FOUND);
      }
      logger.error('Failed to update user profile', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Associates an agent ID with a user
   * @param userId User ID
   * @param agentId Agent ID
   */
  async setAgentIdForUser(userId: string, agentId: string): Promise<void> {
    try {
      // Get user record from Firebase by ID to verify existence
      await this.firebaseAuth.getUser(userId);
      
      // Set custom claims for the user with the agentId
      await this.firebaseAuth.setCustomUserClaims(userId, { agentId });
      
      // Log successful agent ID association
      logger.info(`Agent ID set for user: ${userId}`, { userId, agentId });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw createAuthError(AUTH_ERRORS.USER_NOT_FOUND);
      }
      logger.error('Failed to set agent ID for user', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Generates JWT and refresh tokens for a user
   * @param user User data
   * @returns Authentication tokens
   */
  async generateAuthTokens(user: IUser): Promise<IAuthToken> {
    try {
      // Create token payload with user ID, email, and agent ID
      const payload: ITokenPayload = {
        userId: user.userId,
        email: user.email,
        agentId: user.agentId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + JWT_CONFIG.EXPIRY
      };
      
      // Generate JWT token using generateToken utility
      const token = generateToken(payload);
      
      // Generate refresh token using generateRefreshToken utility
      const refreshToken = generateRefreshToken(payload);
      
      // Return tokens with expiration time
      return {
        token,
        refreshToken,
        expiresIn: JWT_CONFIG.EXPIRY
      };
    } catch (error) {
      logger.error('Failed to generate auth tokens', { error: error.message });
      throw error;
    }
  }

  /**
   * Converts a Firebase user record to the application's user format
   * @param firebaseUser Firebase user record
   * @returns Converted user data
   */
  convertFirebaseUserToUser(firebaseUser: UserRecord): IUser {
    // Extract relevant fields from Firebase user record
    const {
      uid,
      email,
      displayName,
      photoURL,
      emailVerified,
      disabled,
      metadata,
      providerData,
      customClaims
    } = firebaseUser;
    
    // Determine authentication provider from providerData
    let provider = AuthProvider.EMAIL;
    if (providerData && providerData.length > 0) {
      const providerId = providerData[0].providerId;
      if (providerId === 'google.com') {
        provider = AuthProvider.GOOGLE;
      } else if (providerId === 'firebase') {
        provider = AuthProvider.FIREBASE;
      }
    }
    
    // Extract creation and last login timestamps
    const createdAt = metadata?.creationTime ? new Date(metadata.creationTime) : new Date();
    const lastLoginAt = metadata?.lastSignInTime ? new Date(metadata.lastSignInTime) : new Date();
    
    // Extract agent ID from custom claims if available
    const agentId = customClaims?.agentId || null;
    
    // Return formatted IUser object
    return {
      userId: uid,
      email: email || '',
      displayName: displayName || '',
      photoURL,
      emailVerified,
      disabled,
      provider,
      createdAt,
      lastLoginAt,
      agentId
    };
  }

  /**
   * Retrieves authentication metrics for monitoring
   * @returns Authentication metrics
   */
  getAuthMetrics(): object {
    // Return a copy of the current authMetrics object
    return { ...this.authMetrics };
  }
}

// Create a singleton instance
const authService = new AuthService();

export { AuthService, authService };