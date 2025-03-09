import { initializeApp, FirebaseApp, getApps, FirebaseOptions } from 'firebase/app'; // ^10.0.0
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  UserCredential
} from 'firebase/auth'; // ^10.0.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import {
  IUser,
  IFirebaseUser,
  IAuthToken,
  ILoginCredentials,
  IRegistrationData,
  IAuthResponse,
  IPasswordResetRequest,
  IPasswordUpdateRequest,
  IAuthError,
  ITokenPayload
} from '../lib/types/auth.types';
import { AUTH_PROVIDERS, STORAGE_KEYS, DEFAULT_CONFIG } from '../lib/constants';
import { StorageService } from './storage.service';
import { encryptWithPassword, decryptWithPassword } from '../lib/utils/encryption';

// Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

/**
 * Maps a Firebase user object to the application's user interface
 * @param firebaseUser The Firebase user to map
 * @returns Mapped user object conforming to the application's user interface
 */
function mapFirebaseUserToUser(firebaseUser: IFirebaseUser): IUser {
  return {
    userId: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    emailVerified: firebaseUser.emailVerified,
    createdAt: new Date(firebaseUser.metadata?.creationTime || Date.now()),
    lastLoginAt: new Date(firebaseUser.metadata?.lastSignInTime || Date.now())
  };
}

/**
 * Creates a standardized authentication error object
 * @param code Error code
 * @param message Error message
 * @param status HTTP status code
 * @returns Standardized authentication error object
 */
function createAuthError(code: string, message: string, status: number): IAuthError {
  return {
    code,
    message,
    status
  };
}

/**
 * Handles Firebase authentication errors and converts them to standardized auth errors
 * @param error The error from Firebase
 * @returns Standardized authentication error object
 */
function handleFirebaseError(error: Error): IAuthError {
  // Get the Firebase error code if available
  const firebaseError = error as any;
  const firebaseCode = firebaseError.code || 'auth/unknown-error';
  let message = error.message || 'An unknown authentication error occurred';
  let status = 500;

  // Map Firebase error codes to appropriate HTTP status codes and messages
  if (firebaseCode === 'auth/invalid-email' || 
      firebaseCode === 'auth/user-not-found' || 
      firebaseCode === 'auth/wrong-password' ||
      firebaseCode === 'auth/invalid-credential') {
    status = 401; // Unauthorized
    message = 'Invalid email or password';
  } else if (firebaseCode === 'auth/email-already-in-use') {
    status = 409; // Conflict
    message = 'Email address is already in use';
  } else if (firebaseCode === 'auth/weak-password') {
    status = 400; // Bad Request
    message = 'Password is too weak. It must be at least 6 characters long.';
  } else if (firebaseCode === 'auth/user-disabled') {
    status = 403; // Forbidden
    message = 'User account has been disabled';
  } else if (firebaseCode === 'auth/requires-recent-login') {
    status = 401; // Unauthorized
    message = 'This operation requires recent authentication. Please log in again.';
  } else if (firebaseCode === 'auth/too-many-requests') {
    status = 429; // Too Many Requests
    message = 'Too many unsuccessful attempts. Please try again later.';
  } else if (firebaseCode === 'auth/network-request-failed') {
    status = 503; // Service Unavailable
    message = 'Network error. Please check your connection and try again.';
  } else if (firebaseCode === 'auth/popup-closed-by-user') {
    status = 400; // Bad Request
    message = 'Authentication popup was closed before completing the sign in.';
  }

  return createAuthError(firebaseCode, message, status);
}

/**
 * Generates an authentication token object from Firebase user credentials
 * @param userCredential User credentials from Firebase auth
 * @returns Promise resolving to authentication token object
 */
async function generateAuthToken(userCredential: UserCredential): Promise<IAuthToken> {
  // Get the Firebase user
  const user = userCredential.user;
  
  // Get the ID token
  const idToken = await user.getIdToken();
  
  // Set token expiration (1 hour from now)
  const expiresAt = Date.now() + 3600 * 1000;
  
  return {
    token: idToken,
    refreshToken: user.refreshToken,
    expiresAt
  };
}

/**
 * Service that provides authentication functionality using Firebase Authentication
 */
class AuthService {
  private auth: Auth | null;
  private storageService: StorageService | null;
  private initialized: boolean;
  private encryptionKey: string | null;

  /**
   * Creates a new AuthService instance
   */
  constructor() {
    this.auth = null;
    this.storageService = null;
    this.initialized = false;
    this.encryptionKey = null;
  }

  /**
   * Initializes the authentication service
   * @param storageService Storage service for token persistence
   * @param encryptionKey Key for encrypting sensitive data
   * @returns Promise resolving to true if initialization was successful
   */
  async initialize(storageService: StorageService, encryptionKey: string): Promise<boolean> {
    try {
      // Store provided services
      this.storageService = storageService;
      this.encryptionKey = encryptionKey;

      // Initialize Firebase if not already initialized
      if (!getApps().length) {
        initializeApp(firebaseConfig);
      }

      // Get Firebase Auth instance
      this.auth = getAuth();

      // Set up auth state change listener
      this.auth.onAuthStateChanged((user) => {
        // Could implement additional state management here if needed
        console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
      });

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      throw handleFirebaseError(error as Error);
    }
  }

  /**
   * Authenticates a user with email and password
   * @param credentials Login credentials (email and password)
   * @returns Promise resolving to authentication response with user and token
   */
  async login(credentials: ILoginCredentials): Promise<IAuthResponse> {
    if (!this.initialized || !this.auth) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      const { email, password } = credentials;
      
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      
      // Map Firebase user to application user
      const user = mapFirebaseUserToUser(userCredential.user as unknown as IFirebaseUser);
      
      // Generate authentication token
      const token = await generateAuthToken(userCredential);
      
      // Store token securely
      await this.storeToken(token);
      
      return { user, token };
    } catch (error) {
      console.error('Login failed:', error);
      throw handleFirebaseError(error as Error);
    }
  }

  /**
   * Authenticates a user with Google OAuth
   * @returns Promise resolving to authentication response with user and token
   */
  async loginWithGoogle(): Promise<IAuthResponse> {
    if (!this.initialized || !this.auth) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      // Create Google auth provider
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Sign in with popup
      const userCredential = await signInWithPopup(this.auth, provider);
      
      // Map Firebase user to application user
      const user = mapFirebaseUserToUser(userCredential.user as unknown as IFirebaseUser);
      
      // Generate authentication token
      const token = await generateAuthToken(userCredential);
      
      // Store token securely
      await this.storeToken(token);
      
      return { user, token };
    } catch (error) {
      console.error('Google login failed:', error);
      throw handleFirebaseError(error as Error);
    }
  }

  /**
   * Registers a new user with email, password, and display name
   * @param data Registration data
   * @returns Promise resolving to authentication response with user and token
   */
  async register(data: IRegistrationData): Promise<IAuthResponse> {
    if (!this.initialized || !this.auth) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      const { email, password, displayName } = data;
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      
      // Update user profile with display name
      await userCredential.user.updateProfile({ displayName });
      
      // Map Firebase user to application user (with updated profile)
      const firebaseUser = {
        ...userCredential.user as unknown as IFirebaseUser,
        displayName
      };
      
      const user = mapFirebaseUserToUser(firebaseUser);
      
      // Generate authentication token
      const token = await generateAuthToken(userCredential);
      
      // Store token securely
      await this.storeToken(token);
      
      return { user, token };
    } catch (error) {
      console.error('Registration failed:', error);
      throw handleFirebaseError(error as Error);
    }
  }

  /**
   * Signs out the current user
   * @returns Promise that resolves when logout is complete
   */
  async logout(): Promise<void> {
    if (!this.initialized || !this.auth) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      // Sign out from Firebase
      await signOut(this.auth);
      
      // Remove token from local storage
      await this.removeToken();
    } catch (error) {
      console.error('Logout failed:', error);
      throw handleFirebaseError(error as Error);
    }
  }

  /**
   * Sends a password reset email to the specified email address
   * @param request Password reset request
   * @returns Promise that resolves when the reset email is sent
   */
  async resetPassword(request: IPasswordResetRequest): Promise<void> {
    if (!this.initialized || !this.auth) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      const { email } = request;
      
      // Send password reset email
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw handleFirebaseError(error as Error);
    }
  }

  /**
   * Updates the current user's password
   * @param request Password update request
   * @returns Promise that resolves when the password is updated
   */
  async updatePassword(request: IPasswordUpdateRequest): Promise<void> {
    if (!this.initialized || !this.auth) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      const { currentPassword, newPassword } = request;
      
      // Get current user
      const user = this.auth.currentUser;
      
      if (!user || !user.email) {
        throw createAuthError(
          'auth/user-not-found',
          'No authenticated user found',
          401
        );
      }
      
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
    } catch (error) {
      console.error('Password update failed:', error);
      throw handleFirebaseError(error as Error);
    }
  }

  /**
   * Refreshes the authentication token
   * @returns Promise resolving to the new authentication token
   */
  async refreshToken(): Promise<IAuthToken> {
    if (!this.initialized || !this.auth) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      // Get current user
      const user = this.auth.currentUser;
      
      if (!user) {
        throw createAuthError(
          'auth/user-not-found',
          'No authenticated user found',
          401
        );
      }
      
      // Get current token from storage
      const token = await this.getToken();
      
      if (!token || !token.refreshToken) {
        throw createAuthError(
          'auth/invalid-token',
          'No valid refresh token found',
          401
        );
      }
      
      // Force token refresh
      await user.getIdToken(true);
      
      // Generate new token
      const newToken: IAuthToken = {
        token: await user.getIdToken(),
        refreshToken: user.refreshToken,
        expiresAt: Date.now() + 3600 * 1000 // 1 hour
      };
      
      // Store the new token
      await this.storeToken(newToken);
      
      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw handleFirebaseError(error as Error);
    }
  }

  /**
   * Gets the current authenticated user
   * @returns Promise resolving to the current user or null if not authenticated
   */
  async getCurrentUser(): Promise<IUser | null> {
    if (!this.initialized || !this.auth) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      // Get current user
      const user = this.auth.currentUser;
      
      if (!user) {
        return null;
      }
      
      // Map Firebase user to application user
      return mapFirebaseUserToUser(user as unknown as IFirebaseUser);
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw handleFirebaseError(error as Error);
    }
  }

  /**
   * Checks if a user is currently authenticated
   * @returns Promise resolving to true if a user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    if (!this.initialized || !this.auth) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      // Get token from storage
      const token = await this.getToken();
      
      // Check if token exists and is not expired
      if (token && !this.isTokenExpired(token)) {
        return true;
      }
      
      // If no valid token, check if there's a current user
      return !!this.auth.currentUser;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  }

  /**
   * Gets the current authentication token
   * @returns Promise resolving to the current token or null if not available
   */
  async getToken(): Promise<IAuthToken | null> {
    if (!this.initialized || !this.storageService) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      // Get encrypted token from storage
      const encryptedToken = await this.storageService.getItem(STORAGE_KEYS.AUTH_TOKEN);
      
      if (!encryptedToken) {
        return null;
      }
      
      // Decrypt token if encryption key is available
      let token: IAuthToken;
      
      if (this.encryptionKey) {
        const decryptedToken = decryptWithPassword(encryptedToken as string, this.encryptionKey);
        token = JSON.parse(decryptedToken);
      } else {
        token = JSON.parse(encryptedToken as string);
      }
      
      // Check if token is expired or close to expiry
      if (this.isTokenExpired(token)) {
        // Try to refresh the token
        try {
          return await this.refreshToken();
        } catch (error) {
          // If refresh fails, remove the expired token
          await this.removeToken();
          return null;
        }
      }
      
      return token;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  /**
   * Stores an authentication token securely in local storage
   * @param token Authentication token to store
   * @returns Promise that resolves when the token is stored
   */
  private async storeToken(token: IAuthToken): Promise<void> {
    if (!this.initialized || !this.storageService) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      // Ensure encryption key is available for secure storage
      if (!this.encryptionKey) {
        console.warn('Storing token without encryption');
      }
      
      // Convert token to string
      const tokenStr = JSON.stringify(token);
      
      // Encrypt token if encryption key is available
      let dataToStore: string;
      
      if (this.encryptionKey) {
        dataToStore = encryptWithPassword(tokenStr, this.encryptionKey);
      } else {
        dataToStore = tokenStr;
      }
      
      // Store in local storage
      await this.storageService.setItem(STORAGE_KEYS.AUTH_TOKEN, dataToStore);
    } catch (error) {
      console.error('Failed to store token:', error);
      throw createAuthError(
        'auth/token-storage-failed',
        'Failed to store authentication token',
        500
      );
    }
  }

  /**
   * Removes the authentication token from local storage
   * @returns Promise that resolves when the token is removed
   */
  private async removeToken(): Promise<void> {
    if (!this.initialized || !this.storageService) {
      throw createAuthError(
        'auth/not-initialized',
        'Authentication service not initialized',
        500
      );
    }

    try {
      // Remove token from storage
      await this.storageService.delete(STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('Failed to remove token:', error);
      throw createAuthError(
        'auth/token-removal-failed',
        'Failed to remove authentication token',
        500
      );
    }
  }

  /**
   * Checks if an authentication token is expired or close to expiry
   * @param token Authentication token to check
   * @returns True if the token is expired or close to expiry
   */
  isTokenExpired(token: IAuthToken): boolean {
    const currentTime = Date.now();
    const expirationTime = token.expiresAt;
    
    // Calculate time until expiration
    const timeUntilExpiration = expirationTime - currentTime;
    
    // Check if token is already expired
    if (timeUntilExpiration <= 0) {
      return true;
    }
    
    // Check if token is close to expiry (within refresh threshold)
    return timeUntilExpiration < DEFAULT_CONFIG.TOKEN_REFRESH_THRESHOLD;
  }
}

// Create a singleton instance
const authService = new AuthService();

export { AuthService, authService };