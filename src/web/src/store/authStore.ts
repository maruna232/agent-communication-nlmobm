import { create } from 'zustand'; // v4.4.0
import { persist, createJSONStorage } from 'zustand/middleware'; // v4.4.0

import {
  IUser,
  IAuthToken,
  ILoginCredentials,
  IRegistrationData,
  IAuthResponse,
  IPasswordResetRequest,
  IPasswordUpdateRequest,
  AuthState,
  IAuthState
} from '../lib/types/auth.types';
import { AUTH_STATES, STORAGE_KEYS } from '../lib/constants';
import { authService } from '../services/auth.service';

/**
 * Defines the structure of the authentication store slice
 */
interface AuthSlice {
  state: AuthState;
  user: IUser | null;
  token: IAuthToken | null;
  error: string | null;
  loading: boolean;
  setState: (state: AuthState) => void;
  setUser: (user: IUser | null) => void;
  setToken: (token: IAuthToken | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Defines the structure of the authentication actions slice
 */
interface AuthActionsSlice {
  initialize: () => Promise<void>;
  login: (credentials: ILoginCredentials) => Promise<IAuthResponse | void>;
  loginWithGoogle: () => Promise<IAuthResponse | void>;
  register: (data: IRegistrationData) => Promise<IAuthResponse | void>;
  logout: () => Promise<void>;
  resetPassword: (request: IPasswordResetRequest) => Promise<void>;
  updatePassword: (request: IPasswordUpdateRequest) => Promise<void>;
  refreshToken: () => Promise<IAuthToken | null | void>;
}

/**
 * Defines the complete authentication store
 */
type AuthStore = AuthSlice & AuthActionsSlice;

/**
 * Returns the initial authentication state
 * @returns Initial authentication state
 */
const getInitialState = (): IAuthState => ({
  state: AUTH_STATES.UNAUTHENTICATED as AuthState,
  user: null,
  token: null,
  error: null,
  loading: false,
});

/**
 * Creates a slice of the auth store related to authentication state and operations
 * @param set Zustand set function
 * @param get Zustand get function
 * @returns Authentication state slice with actions
 */
const createAuthSlice = (set: any, get: any): AuthSlice => ({
  ...getInitialState(),
  setState: (state: AuthState) => set({ state }),
  setUser: (user: IUser | null) => set({ user }),
  setToken: (token: IAuthToken | null) => set({ token }),
  setError: (error: string | null) => set({ error }),
  setLoading: (loading: boolean) => set({ loading }),
});

/**
 * Creates a slice of the auth store related to authentication actions
 * @param set Zustand set function
 * @param get Zustand get function
 * @returns Authentication actions slice
 */
const createAuthActionsSlice = (set: any, get: any): AuthActionsSlice => ({
  initialize: async () => {
    // No implementation needed here as authService.initialize is called elsewhere
  },
  login: async (credentials: ILoginCredentials) => {
    try {
      set({ loading: true, error: null });
      const authResponse = await authService.login(credentials);
      set({
        state: AUTH_STATES.AUTHENTICATED as AuthState,
        user: authResponse.user,
        token: authResponse.token,
        loading: false,
        error: null,
      });
      return authResponse;
    } catch (error: any) {
      set({
        state: AUTH_STATES.UNAUTHENTICATED as AuthState,
        user: null,
        token: null,
        error: error.message || 'Login failed',
        loading: false,
      });
    }
  },
  loginWithGoogle: async () => {
    try {
      set({ loading: true, error: null });
      const authResponse = await authService.loginWithGoogle();
      set({
        state: AUTH_STATES.AUTHENTICATED as AuthState,
        user: authResponse.user,
        token: authResponse.token,
        loading: false,
        error: null,
      });
      return authResponse;
    } catch (error: any) {
      set({
        state: AUTH_STATES.UNAUTHENTICATED as AuthState,
        user: null,
        token: null,
        error: error.message || 'Google login failed',
        loading: false,
      });
    }
  },
  register: async (data: IRegistrationData) => {
    try {
      set({ loading: true, error: null });
      const authResponse = await authService.register(data);
      set({
        state: AUTH_STATES.AUTHENTICATED as AuthState,
        user: authResponse.user,
        token: authResponse.token,
        loading: false,
        error: null,
      });
      return authResponse;
    } catch (error: any) {
      set({
        state: AUTH_STATES.UNAUTHENTICATED as AuthState,
        user: null,
        token: null,
        error: error.message || 'Registration failed',
        loading: false,
      });
    }
  },
  logout: async () => {
    try {
      set({ loading: true, error: null });
      await authService.logout();
      set({
        ...getInitialState(),
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Logout failed', loading: false });
    }
  },
  resetPassword: async (request: IPasswordResetRequest) => {
    try {
      set({ loading: true, error: null });
      await authService.resetPassword(request);
      set({ loading: false, error: null });
    } catch (error: any) {
      set({ error: error.message || 'Password reset failed', loading: false });
    }
  },
  updatePassword: async (request: IPasswordUpdateRequest) => {
    try {
      set({ loading: true, error: null });
      await authService.updatePassword(request);
      set({ loading: false, error: null });
    } catch (error: any) {
      set({ error: error.message || 'Password update failed', loading: false });
    }
  },
  refreshToken: async () => {
    try {
      const token = await authService.refreshToken();
      set({ token: token, error: null });
      return token;
    } catch (error: any) {
      set({ error: error.message || 'Token refresh failed' });
    }
  },
});

/**
 * Global state store for authentication management
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...createAuthSlice(set, get),
      ...createAuthActionsSlice(set, get),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);