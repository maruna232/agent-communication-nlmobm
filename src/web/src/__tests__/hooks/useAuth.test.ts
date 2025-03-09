import { renderHook, act } from '@testing-library/react-hooks'; // version: ^8.0.1, ^14.0.0
import { jest } from 'jest'; // version: ^29.0.0
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import {
  IUser,
  IAuthToken,
  ILoginCredentials,
  IRegistrationData,
  IPasswordResetRequest,
  IPasswordUpdateRequest,
  AuthState,
} from '../../lib/types/auth.types';
import { mockAuth, resetMockAuthBehavior } from '../../__mocks__/firebase.mock';

// Define mock data for testing
const mockAuthResponse = {
  user: {
    userId: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
  } as IUser,
  token: {
    token: 'mock-token-string',
    refreshToken: 'mock-refresh-token',
    expiresAt: Date.now() + 3600000,
  } as IAuthToken,
};

const mockLoginCredentials: ILoginCredentials = {
  email: 'test@example.com',
  password: 'password123',
};

const mockRegistrationData: IRegistrationData = {
  email: 'test@example.com',
  password: 'password123',
  displayName: 'Test User',
};

const mockPasswordResetRequest: IPasswordResetRequest = {
  email: 'test@example.com',
};

const mockPasswordUpdateRequest: IPasswordUpdateRequest = {
  currentPassword: 'password123',
  newPassword: 'newPassword123',
};

describe('useAuth hook', () => {
  // Mock useAuthStore functions
  const mockSetState = jest.fn();
  const mockSetUser = jest.fn();
  const mockSetToken = jest.fn();
  const mockSetError = jest.fn();
  const mockSetLoading = jest.fn();
  const mockInitialize = jest.fn();
  const mockLogin = jest.fn();
  const mockLoginWithGoogle = jest.fn();
  const mockRegister = jest.fn();
  const mockLogout = jest.fn();
  const mockResetPassword = jest.fn();
  const mockUpdatePassword = jest.fn();
  const mockRefreshToken = jest.fn();

  beforeEach(() => {
    // Mock useAuthStore implementation
    (useAuthStore as jest.Mock) = jest.fn().mockReturnValue({
      state: 'UNAUTHENTICATED',
      user: null,
      token: null,
      error: null,
      loading: false,
      setState: mockSetState,
      setUser: mockSetUser,
      setToken: mockSetToken,
      setError: mockSetError,
      setLoading: mockSetLoading,
      initialize: mockInitialize,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      register: mockRegister,
      logout: mockLogout,
      resetPassword: mockResetPassword,
      updatePassword: mockUpdatePassword,
      refreshToken: mockRefreshToken,
    });

    resetMockAuthBehavior();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize authentication service on mount', () => {
    // Render the useAuth hook
    renderHook(() => useAuth());

    // Verify that initialize function was called
    expect(mockInitialize).toHaveBeenCalled();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('should provide access to authentication state', () => {
    // Mock useAuthStore to return specific state values
    (useAuthStore as jest.Mock).mockReturnValue({
      state: 'AUTHENTICATED',
      user: mockAuthResponse.user,
      token: mockAuthResponse.token,
      error: 'Test Error',
      loading: false,
      setState: mockSetState,
      setUser: mockSetUser,
      setToken: mockSetToken,
      setError: mockSetError,
      setLoading: mockSetLoading,
      initialize: mockInitialize,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      register: mockRegister,
      logout: mockLogout,
      resetPassword: mockResetPassword,
      updatePassword: mockUpdatePassword,
      refreshToken: mockRefreshToken,
    });

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Verify that the hook returns the correct state values
    expect(result.current.state).toBe('AUTHENTICATED');
    expect(result.current.user).toEqual(mockAuthResponse.user);
    expect(result.current.token).toEqual(mockAuthResponse.token);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Test Error');
  });

  it('should call login function with credentials', async () => {
    // Mock useAuthStore login function to return a successful response
    mockLogin.mockResolvedValue(mockAuthResponse);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the login function with test credentials
    let response;
    await act(async () => {
      response = await result.current.login(mockLoginCredentials);
    });

    // Verify that the store login function was called with the correct credentials
    expect(mockLogin).toHaveBeenCalledWith(mockLoginCredentials);
    expect(mockLogin).toHaveBeenCalledTimes(1);

    // Verify that the function returns the expected response
    expect(response).toEqual(mockAuthResponse);
  });

  it('should call loginWithGoogle function', async () => {
    // Mock useAuthStore loginWithGoogle function to return a successful response
    mockLoginWithGoogle.mockResolvedValue(mockAuthResponse);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the loginWithGoogle function
    let response;
    await act(async () => {
      response = await result.current.loginWithGoogle();
    });

    // Verify that the store loginWithGoogle function was called
    expect(mockLoginWithGoogle).toHaveBeenCalled();
    expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1);

    // Verify that the function returns the expected response
    expect(response).toEqual(mockAuthResponse);
  });

  it('should call register function with registration data', async () => {
    // Mock useAuthStore register function to return a successful response
    mockRegister.mockResolvedValue(mockAuthResponse);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the register function with test registration data
    let response;
    await act(async () => {
      response = await result.current.register(mockRegistrationData);
    });

    // Verify that the store register function was called with the correct data
    expect(mockRegister).toHaveBeenCalledWith(mockRegistrationData);
    expect(mockRegister).toHaveBeenCalledTimes(1);

    // Verify that the function returns the expected response
    expect(response).toEqual(mockAuthResponse);
  });

  it('should call logout function', async () => {
    // Mock useAuthStore logout function
    mockLogout.mockResolvedValue(undefined);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the logout function
    await act(async () => {
      await result.current.logout();
    });

    // Verify that the store logout function was called
    expect(mockLogout).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('should call resetPassword function with email', async () => {
    // Mock useAuthStore resetPassword function
    mockResetPassword.mockResolvedValue(undefined);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the resetPassword function with test email
    await act(async () => {
      await result.current.resetPassword(mockPasswordResetRequest);
    });

    // Verify that the store resetPassword function was called with the correct email
    expect(mockResetPassword).toHaveBeenCalledWith(mockPasswordResetRequest);
    expect(mockResetPassword).toHaveBeenCalledTimes(1);
  });

  it('should call updatePassword function with password data', async () => {
    // Mock useAuthStore updatePassword function
    mockUpdatePassword.mockResolvedValue(undefined);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the updatePassword function with test password data
    await act(async () => {
      await result.current.updatePassword(mockPasswordUpdateRequest);
    });

    // Verify that the store updatePassword function was called with the correct data
    expect(mockUpdatePassword).toHaveBeenCalledWith(mockPasswordUpdateRequest);
    expect(mockUpdatePassword).toHaveBeenCalledTimes(1);
  });

  it('should call refreshToken function', async () => {
    // Mock useAuthStore refreshToken function to return a new token
    const newToken = { token: 'new-mock-token', refreshToken: 'new-mock-refresh-token', expiresAt: Date.now() + 3600000 } as IAuthToken;
    mockRefreshToken.mockResolvedValue(newToken);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the refreshToken function
    let token;
    await act(async () => {
      token = await result.current.refreshToken();
    });

    // Verify that the store refreshToken function was called
    expect(mockRefreshToken).toHaveBeenCalled();
    expect(mockRefreshToken).toHaveBeenCalledTimes(1);

    // Verify that the function returns the expected token
    expect(token).toEqual(newToken);
  });

  it('should return true when user is authenticated', async () => {
    // Mock useAuthStore to return AUTHENTICATED state with a user
    (useAuthStore as jest.Mock).mockReturnValue({
      state: 'AUTHENTICATED',
      user: mockAuthResponse.user,
      token: mockAuthResponse.token,
      error: null,
      loading: false,
      setState: mockSetState,
      setUser: mockSetUser,
      setToken: mockSetToken,
      setError: mockSetError,
      setLoading: mockSetLoading,
      initialize: mockInitialize,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      register: mockRegister,
      logout: mockLogout,
      resetPassword: mockResetPassword,
      updatePassword: mockUpdatePassword,
      refreshToken: mockRefreshToken,
      isAuthenticated: jest.fn().mockReturnValue(true),
    });

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the isAuthenticated function
    const isAuthenticated = result.current.isAuthenticated();

    // Verify that the function returns true
    expect(isAuthenticated).toBe(true);
  });

  it('should return false when user is not authenticated', async () => {
    // Mock useAuthStore to return UNAUTHENTICATED state with no user
    (useAuthStore as jest.Mock).mockReturnValue({
      state: 'UNAUTHENTICATED',
      user: null,
      token: null,
      error: null,
      loading: false,
      setState: mockSetState,
      setUser: mockSetUser,
      setToken: mockSetToken,
      setError: mockSetError,
      setLoading: mockSetLoading,
      initialize: mockInitialize,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
      register: mockRegister,
      logout: mockLogout,
      resetPassword: mockResetPassword,
      updatePassword: mockUpdatePassword,
      refreshToken: mockRefreshToken,
      isAuthenticated: jest.fn().mockReturnValue(false),
    });

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the isAuthenticated function
    const isAuthenticated = result.current.isAuthenticated();

    // Verify that the function returns false
    expect(isAuthenticated).toBe(false);
  });

  it('should handle errors from authentication functions', async () => {
    // Mock useAuthStore login function to throw an error
    const testError = new Error('Test authentication error');
    mockLogin.mockRejectedValue(testError);

    // Render the useAuth hook
    const { result } = renderHook(() => useAuth());

    // Call the login function and catch the error
    let caughtError;
    try {
      await act(async () => {
        await result.current.login(mockLoginCredentials);
      });
    } catch (error) {
      caughtError = error;
    }

    // Verify that the error is properly caught and handled
    expect(caughtError).toEqual(testError);
  });
});