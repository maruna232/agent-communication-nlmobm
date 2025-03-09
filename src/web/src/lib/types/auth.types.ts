/**
 * auth.types.ts
 * 
 * This file defines TypeScript interfaces and types for authentication-related
 * data structures used in the frontend of the AI Agent Network.
 * 
 * These types support the privacy-focused platform by defining structures that
 * maintain user privacy with minimal data collection while enabling secure
 * authentication and token management.
 */

import { User } from 'firebase/auth'; // Firebase auth user type (v10.0.0+)
import { AUTH_PROVIDERS, AUTH_STATES } from '../constants';

/**
 * Core user data structure with authentication and profile information
 */
export interface IUser {
  userId: string;                // Unique user identifier
  email: string;                 // User's email address
  displayName: string;           // User's display name
  photoURL: string | null;       // Optional profile photo URL
  emailVerified: boolean;        // Whether email has been verified
  createdAt: Date;               // Account creation timestamp
  lastLoginAt: Date;             // Last login timestamp
  agentId: string | null;        // Associated agent identifier (if created)
}

/**
 * Firebase user structure for authentication integration
 */
export interface IFirebaseUser {
  uid: string;                   // Firebase unique user ID
  email: string | null;          // User's email address
  displayName: string | null;    // User's display name
  photoURL: string | null;       // User's profile photo URL
  emailVerified: boolean;        // Whether email has been verified
  metadata: {                    // User metadata from Firebase
    creationTime: string;        // Account creation time
    lastSignInTime: string;      // Last sign-in time
  };
  providerData: Array<{         // Authentication providers data
    providerId: string;         // Provider ID (e.g., 'password', 'google.com')
  }>;
}

/**
 * Authentication token structure with refresh capability
 */
export interface IAuthToken {
  token: string;                 // JWT authentication token
  expiresAt: number;             // Token expiration timestamp (ms since epoch)
  refreshToken: string;          // Token for refreshing authentication
}

/**
 * Login request structure for authentication
 */
export interface ILoginCredentials {
  email: string;                 // User's email address
  password: string;              // User's password
}

/**
 * Registration request structure for new user accounts
 */
export interface IRegistrationData {
  email: string;                 // User's email address
  password: string;              // User's password
  displayName: string;           // User's display name
}

/**
 * Password reset request structure
 */
export interface IPasswordResetRequest {
  email: string;                 // User's email address
}

/**
 * Password update request structure
 */
export interface IPasswordUpdateRequest {
  currentPassword: string;       // User's current password
  newPassword: string;           // User's new password
}

/**
 * Token refresh request structure
 */
export interface IRefreshTokenRequest {
  refreshToken: string;          // Refresh token
}

/**
 * Authentication response structure with user data and tokens
 */
export interface IAuthResponse {
  user: IUser;                   // User data
  token: IAuthToken;             // Authentication token data
}

/**
 * Authentication states for the application
 */
export enum AuthState {
  UNAUTHENTICATED = AUTH_STATES.UNAUTHENTICATED,
  AUTHENTICATING = AUTH_STATES.AUTHENTICATING,
  AUTHENTICATED = AUTH_STATES.AUTHENTICATED
}

/**
 * Supported authentication providers
 */
export enum AuthProvider {
  EMAIL_PASSWORD = AUTH_PROVIDERS.EMAIL_PASSWORD,
  GOOGLE = AUTH_PROVIDERS.GOOGLE
}

/**
 * Authentication state structure for the application
 */
export interface IAuthState {
  state: AuthState;              // Current authentication state
  user: IUser | null;            // Authenticated user or null
  token: IAuthToken | null;      // Authentication token or null
  error: string | null;          // Authentication error message if any
  loading: boolean;              // Whether authentication is in progress
}

/**
 * Authentication error structure for consistent error handling
 */
export interface IAuthError {
  code: string;                  // Error code
  message: string;               // Human-readable error message
  status: number;                // HTTP status code if applicable
}

/**
 * Authentication error code types for consistent error handling
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'auth/invalid-credentials',
  USER_NOT_FOUND = 'auth/user-not-found',
  EMAIL_ALREADY_EXISTS = 'auth/email-already-exists',
  INVALID_TOKEN = 'auth/invalid-token',
  TOKEN_EXPIRED = 'auth/token-expired',
  TOO_MANY_ATTEMPTS = 'auth/too-many-attempts'
}

/**
 * Authentication actions available in the application
 */
export interface IAuthActions {
  login: (credentials: ILoginCredentials) => Promise<IAuthResponse>;
  loginWithGoogle: () => Promise<IAuthResponse>;
  register: (data: IRegistrationData) => Promise<IAuthResponse>;
  logout: () => Promise<void>;
  resetPassword: (request: IPasswordResetRequest) => Promise<void>;
  updatePassword: (request: IPasswordUpdateRequest) => Promise<void>;
  refreshToken: () => Promise<IAuthToken>;
  getCurrentUser: () => Promise<IUser | null>;
  isAuthenticated: () => Promise<boolean>;
}

/**
 * Authentication context structure for React context
 */
export interface IAuthContext {
  state: IAuthState;             // Current authentication state
  actions: IAuthActions;         // Authentication actions
}

/**
 * JWT token payload structure for authentication
 */
export interface ITokenPayload {
  userId: string;                // User ID
  email: string;                 // User email
  agentId: string | null;        // Associated agent ID if any
  iat: number;                   // Issued at timestamp
  exp: number;                   // Expiration timestamp
}