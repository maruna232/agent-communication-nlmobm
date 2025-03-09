/**
 * Firebase mock for testing authentication functionality
 * 
 * This file provides mock implementations of Firebase Authentication services to enable
 * unit testing without requiring actual Firebase connections, supporting the privacy-first
 * approach of the AI Agent Network.
 * 
 * @version 1.0.0
 */

import { jest } from 'jest';
import { v4 as uuidv4 } from 'uuid';
import { 
  IUser, 
  IFirebaseUser, 
  IAuthToken, 
  IAuthError 
} from '../lib/types/auth.types';

// Mock Firebase configuration
const mockFirebaseConfig = {
  apiKey: 'mock-api-key',
  authDomain: 'mock-auth-domain',
  projectId: 'mock-project-id',
  storageBucket: 'mock-storage-bucket',
  messagingSenderId: 'mock-messaging-sender-id',
  appId: 'mock-app-id'
};

// Default mock Firebase user
const mockFirebaseUser: IFirebaseUser = {
  uid: 'mock-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  photoURL: null,
  metadata: {
    creationTime: '2023-01-01T00:00:00Z',
    lastSignInTime: '2023-01-02T00:00:00Z'
  },
  providerData: [{ providerId: 'password' }],
  getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
  refreshToken: 'mock-refresh-token'
};

// Default mock Google user
const mockGoogleUser: IFirebaseUser = {
  uid: 'mock-google-user-id',
  email: 'google-user@example.com',
  displayName: 'Google User',
  emailVerified: true,
  photoURL: null,
  metadata: {
    creationTime: '2023-01-01T00:00:00Z',
    lastSignInTime: '2023-01-02T00:00:00Z'
  },
  providerData: [{ providerId: 'google.com' }],
  getIdToken: jest.fn().mockResolvedValue('mock-google-id-token'),
  refreshToken: 'mock-google-refresh-token'
};

// Default mock user credential for password auth
const mockUserCredential = {
  user: mockFirebaseUser,
  credential: null,
  operationType: 'signIn',
  additionalUserInfo: {
    isNewUser: false,
    providerId: 'password',
    profile: {}
  }
};

// Default mock user credential for Google auth
const mockGoogleCredential = {
  user: mockGoogleUser,
  credential: { accessToken: 'mock-google-access-token' },
  operationType: 'signIn',
  additionalUserInfo: {
    isNewUser: false,
    providerId: 'google.com',
    profile: {}
  }
};

// Common authentication errors
const mockAuthErrors = {
  EMAIL_ALREADY_EXISTS: {
    code: 'auth/email-already-in-use',
    message: 'The email address is already in use by another account.',
    status: 400
  },
  INVALID_CREDENTIALS: {
    code: 'auth/invalid-credential',
    message: 'The supplied auth credential is incorrect, malformed or has expired.',
    status: 401
  },
  USER_NOT_FOUND: {
    code: 'auth/user-not-found',
    message: 'There is no user record corresponding to this identifier.',
    status: 404
  },
  WEAK_PASSWORD: {
    code: 'auth/weak-password',
    message: 'The password must be at least 6 characters.',
    status: 400
  },
  TOO_MANY_ATTEMPTS: {
    code: 'auth/too-many-requests',
    message: 'Access to this account has been temporarily disabled due to many failed login attempts.',
    status: 429
  }
};

/**
 * Creates a mock Firebase user object with specified properties
 * @param userProps - Partial user properties to override defaults
 * @returns A mock Firebase user object
 */
export function createMockUser(userProps: Partial<IFirebaseUser> = {}): IFirebaseUser {
  const uid = userProps.uid || uuidv4();
  const user: IFirebaseUser = {
    uid,
    email: 'test@example.com',
    displayName: 'Test User',
    emailVerified: true,
    photoURL: null,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString()
    },
    providerData: [{ providerId: 'password' }],
    ...userProps
  };
  
  // Add getIdToken and refreshToken as they're used in the mocks
  // but may not be directly part of the interface
  (user as any).getIdToken = jest.fn().mockResolvedValue(`mock-token-${uid}`);
  (user as any).refreshToken = `mock-refresh-token-${uid}`;
  
  return user;
}

/**
 * Creates a mock user credential object for authentication responses
 * @param user - The Firebase user object
 * @param providerId - The authentication provider ID
 * @returns A mock user credential object
 */
export function createMockUserCredential(user: IFirebaseUser, providerId = 'password') {
  return {
    user,
    credential: providerId !== 'password' ? { accessToken: `mock-${providerId}-token` } : null,
    operationType: 'signIn',
    additionalUserInfo: {
      isNewUser: false,
      providerId,
      profile: {}
    }
  };
}

/**
 * Creates a mock Firebase authentication error
 * @param errorType - The type of error to create
 * @returns A mock Firebase auth error
 */
export function createMockAuthError(errorType: string): Error {
  const errorDetails = mockAuthErrors[errorType] || {
    code: 'auth/unknown-error',
    message: 'An unknown error occurred.',
    status: 500
  };
  
  const error = new Error(errorDetails.message);
  (error as any).code = errorDetails.code;
  (error as any).status = errorDetails.status;
  
  return error;
}

/**
 * Mock implementation of Firebase Auth for testing
 */
class MockFirebaseAuth {
  currentUser: IFirebaseUser | null;
  onAuthStateChanged: jest.Mock;
  signInWithEmailAndPassword: jest.Mock;
  signInWithPopup: jest.Mock;
  createUserWithEmailAndPassword: jest.Mock;
  sendPasswordResetEmail: jest.Mock;
  updatePassword: jest.Mock;
  signOut: jest.Mock;
  
  constructor() {
    this.currentUser = mockFirebaseUser;
    
    // Initialize mocks for auth methods
    this.onAuthStateChanged = jest.fn((callback) => {
      callback(this.currentUser);
      return () => {}; // Unsubscribe function
    });
    
    this.signInWithEmailAndPassword = jest.fn().mockResolvedValue(mockUserCredential);
    this.signInWithPopup = jest.fn().mockResolvedValue(mockGoogleCredential);
    this.createUserWithEmailAndPassword = jest.fn().mockResolvedValue(mockUserCredential);
    this.sendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);
    this.updatePassword = jest.fn().mockResolvedValue(undefined);
    this.signOut = jest.fn().mockResolvedValue(undefined);
  }
  
  /**
   * Sets the current user for the mock auth instance
   * @param user - The user to set as current
   */
  setCurrentUser(user: IFirebaseUser | null): void {
    this.currentUser = user;
  }
  
  /**
   * Simulates an authentication state change event
   * @param user - The new user state
   */
  simulateAuthStateChange(user: IFirebaseUser | null): void {
    this.currentUser = user;
    // Simulate onAuthStateChanged callback
    const callbacks = this.onAuthStateChanged.mock.calls;
    for (let i = 0; i < callbacks.length; i++) {
      const callback = callbacks[i][0];
      if (typeof callback === 'function') {
        callback(user);
      }
    }
  }
}

/**
 * Mock implementation of Google Auth Provider for testing
 */
class MockGoogleAuthProvider {
  constructor() {
    // Empty implementation
  }
}

/**
 * Mock implementation of Firebase App for testing
 */
class MockFirebaseApp {
  name: string;
  options: typeof mockFirebaseConfig;
  
  constructor() {
    this.name = '[DEFAULT]';
    this.options = mockFirebaseConfig;
  }
}

// Create singleton instance of mock auth
const mockAuth = new MockFirebaseAuth();

/**
 * Configures the behavior of mock Firebase auth methods
 * @param config - Configuration object for mock behavior
 */
export function setMockAuthBehavior(config: {
  signInWithEmailAndPassword?: 'success' | 'error' | Error;
  signInWithPopup?: 'success' | 'error' | Error;
  createUserWithEmailAndPassword?: 'success' | 'error' | Error;
  sendPasswordResetEmail?: 'success' | 'error' | Error;
  updatePassword?: 'success' | 'error' | Error;
  signOut?: 'success' | 'error' | Error;
}): void {
  // Configure signInWithEmailAndPassword
  if (config.signInWithEmailAndPassword === 'success') {
    mockAuth.signInWithEmailAndPassword.mockResolvedValue(mockUserCredential);
  } else if (config.signInWithEmailAndPassword === 'error') {
    mockAuth.signInWithEmailAndPassword.mockRejectedValue(createMockAuthError('INVALID_CREDENTIALS'));
  } else if (config.signInWithEmailAndPassword instanceof Error) {
    mockAuth.signInWithEmailAndPassword.mockRejectedValue(config.signInWithEmailAndPassword);
  }
  
  // Configure signInWithPopup
  if (config.signInWithPopup === 'success') {
    mockAuth.signInWithPopup.mockResolvedValue(mockGoogleCredential);
  } else if (config.signInWithPopup === 'error') {
    mockAuth.signInWithPopup.mockRejectedValue(createMockAuthError('INVALID_CREDENTIALS'));
  } else if (config.signInWithPopup instanceof Error) {
    mockAuth.signInWithPopup.mockRejectedValue(config.signInWithPopup);
  }
  
  // Configure createUserWithEmailAndPassword
  if (config.createUserWithEmailAndPassword === 'success') {
    mockAuth.createUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
  } else if (config.createUserWithEmailAndPassword === 'error') {
    mockAuth.createUserWithEmailAndPassword.mockRejectedValue(createMockAuthError('EMAIL_ALREADY_EXISTS'));
  } else if (config.createUserWithEmailAndPassword instanceof Error) {
    mockAuth.createUserWithEmailAndPassword.mockRejectedValue(config.createUserWithEmailAndPassword);
  }
  
  // Configure sendPasswordResetEmail
  if (config.sendPasswordResetEmail === 'success') {
    mockAuth.sendPasswordResetEmail.mockResolvedValue(undefined);
  } else if (config.sendPasswordResetEmail === 'error') {
    mockAuth.sendPasswordResetEmail.mockRejectedValue(createMockAuthError('USER_NOT_FOUND'));
  } else if (config.sendPasswordResetEmail instanceof Error) {
    mockAuth.sendPasswordResetEmail.mockRejectedValue(config.sendPasswordResetEmail);
  }
  
  // Configure updatePassword
  if (config.updatePassword === 'success') {
    mockAuth.updatePassword.mockResolvedValue(undefined);
  } else if (config.updatePassword === 'error') {
    mockAuth.updatePassword.mockRejectedValue(createMockAuthError('WEAK_PASSWORD'));
  } else if (config.updatePassword instanceof Error) {
    mockAuth.updatePassword.mockRejectedValue(config.updatePassword);
  }
  
  // Configure signOut
  if (config.signOut === 'success') {
    mockAuth.signOut.mockResolvedValue(undefined);
  } else if (config.signOut === 'error') {
    mockAuth.signOut.mockRejectedValue(new Error('Failed to sign out'));
  } else if (config.signOut instanceof Error) {
    mockAuth.signOut.mockRejectedValue(config.signOut);
  }
}

/**
 * Resets all mock Firebase auth methods to their default behavior
 */
export function resetMockAuthBehavior(): void {
  mockAuth.signInWithEmailAndPassword.mockResolvedValue(mockUserCredential);
  mockAuth.signInWithPopup.mockResolvedValue(mockGoogleCredential);
  mockAuth.createUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
  mockAuth.sendPasswordResetEmail.mockResolvedValue(undefined);
  mockAuth.updatePassword.mockResolvedValue(undefined);
  mockAuth.signOut.mockResolvedValue(undefined);
  mockAuth.onAuthStateChanged.mockImplementation((callback) => {
    callback(mockAuth.currentUser);
    return () => {}; // Unsubscribe function
  });
}

// Mock Firebase exports
export const initializeApp = jest.fn().mockReturnValue(new MockFirebaseApp());
export const getAuth = jest.fn().mockReturnValue(mockAuth);
export const signInWithEmailAndPassword = mockAuth.signInWithEmailAndPassword;
export const signInWithPopup = mockAuth.signInWithPopup;
export const createUserWithEmailAndPassword = mockAuth.createUserWithEmailAndPassword;
export const sendPasswordResetEmail = mockAuth.sendPasswordResetEmail;
export const updatePassword = mockAuth.updatePassword;
export const signOut = mockAuth.signOut;
export const onAuthStateChanged = mockAuth.onAuthStateChanged;
export const GoogleAuthProvider = MockGoogleAuthProvider;

// Export the mock auth instance and utilities for direct testing access
export { mockAuth, mockFirebaseUser, mockGoogleUser };