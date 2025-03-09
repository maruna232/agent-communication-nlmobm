import { Request } from 'express';
import { UserRecord } from 'firebase-admin/auth';
import { JWT_CONFIG } from '../config/constants';

/**
 * Authentication provider types supported by the system
 */
export enum AuthProvider {
  EMAIL = 'email',
  GOOGLE = 'google',
  FIREBASE = 'firebase'
}

/**
 * Authentication error code types for consistent error handling
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'invalid_credentials',
  USER_NOT_FOUND = 'user_not_found',
  EMAIL_ALREADY_EXISTS = 'email_already_exists',
  INVALID_TOKEN = 'invalid_token',
  TOKEN_EXPIRED = 'token_expired',
  TOO_MANY_ATTEMPTS = 'too_many_attempts'
}

/**
 * Core user data structure with authentication and profile information
 * Privacy-focused design minimizes stored data
 */
export interface IUser {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  emailVerified: boolean;
  disabled: boolean;
  provider: AuthProvider;
  createdAt: Date;
  lastLoginAt: Date;
  agentId: string | null; // Link to user's agent if created
}

/**
 * Firebase user structure for authentication integration
 * Maps to the Firebase UserRecord structure
 */
export interface IFirebaseAuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  disabled: boolean;
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
  providerData: Array<{ providerId: string }>;
  customClaims: Record<string, any> | null;
}

/**
 * Authentication token structure with refresh token and expiration
 * Used for secure session management
 */
export interface IAuthToken {
  token: string; // JWT access token
  refreshToken: string; // For obtaining a new access token
  expiresIn: number; // Token expiration time in seconds
}

/**
 * JWT token payload structure for authentication
 * Contains minimal user information for identity verification
 */
export interface ITokenPayload {
  userId: string;
  email: string;
  agentId: string | null;
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
}

/**
 * Login request structure for authentication
 */
export interface ILoginRequest {
  email: string;
  password: string;
}

/**
 * Registration request structure for new user accounts
 */
export interface IRegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

/**
 * Password reset request structure
 */
export interface IPasswordResetRequest {
  email: string;
}

/**
 * Token verification request structure
 */
export interface IVerifyTokenRequest {
  token: string;
}

/**
 * Token refresh request structure
 */
export interface IRefreshTokenRequest {
  refreshToken: string;
}

/**
 * Authentication response structure with user data and tokens
 */
export interface IAuthResponse {
  user: IUser;
  tokens: IAuthToken;
}

/**
 * Extends Express Request interface to include authenticated user data
 */
export interface IAuthRequest extends Request {
  user: IUser;
  token: string;
}

/**
 * Authentication error structure for consistent error handling
 */
export interface IAuthError {
  code: string;
  message: string;
  status: number;
}

/**
 * Authentication metrics for monitoring and security
 * Used for detecting potential security issues and measuring system performance
 */
export interface IAuthMetrics {
  loginAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  passwordResets: number;
  tokenRefreshes: number;
}