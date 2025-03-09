import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LoginForm } from '../../../components/auth/LoginForm';
import { useAuth } from '../../../hooks/useAuth';
import { AuthState, ILoginCredentials } from '../../../lib/types/auth.types';

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth');

// Mock credentials for testing
const mockLoginCredentials: ILoginCredentials = {
  email: 'test@example.com',
  password: 'password123'
};

// Mock login function that returns a successful response
const mockLoginFunction = jest.fn().mockResolvedValue({
  user: { userId: 'test-user-id', email: 'test@example.com' },
  token: { token: 'mock-token' }
});

// Mock onSuccess callback
const mockOnSuccess = jest.fn();

describe('LoginForm Component', () => {
  beforeEach(() => {
    // Set up mocks before each test
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLoginFunction,
      loginWithGoogle: jest.fn(),
      state: {
        state: AuthState.UNAUTHENTICATED,
        error: null
      }
    });
    
    // Reset mocks
    mockLoginFunction.mockClear();
    mockOnSuccess.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render login form with all required fields', () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    // Check that email field is rendered
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    
    // Check that password field is rendered
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    
    // Check that submit button is rendered
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    
    // Check that Google login button is rendered
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    
    // Check that forgot password link is rendered
    expect(screen.getByText(/forgot password\?/i)).toBeInTheDocument();
  });

  test('should validate email format', async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    // Enter invalid email
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    
    // Wait for validation message
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
    
    // Enter valid email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.blur(emailInput);
    
    // Wait for validation message to disappear
    await waitFor(() => {
      expect(screen.queryByText(/invalid email format/i)).not.toBeInTheDocument();
    });
  });

  test('should validate password is not empty', async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    // Leave password empty
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: '' } });
    fireEvent.blur(passwordInput);
    
    // Wait for validation message
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
    
    // Enter password
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.blur(passwordInput);
    
    // Wait for validation message to disappear
    await waitFor(() => {
      expect(screen.queryByText(/password is required/i)).not.toBeInTheDocument();
    });
  });

  test('should call login function with correct credentials when form is submitted', async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: mockLoginCredentials.email } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: mockLoginCredentials.password } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Verify login function was called with correct credentials
    await waitFor(() => {
      expect(mockLoginFunction).toHaveBeenCalledWith(mockLoginCredentials);
    });
    
    // Verify onSuccess callback was called
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  test('should not submit form with invalid data', async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    // Fill in form with invalid email
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: mockLoginCredentials.password } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Verify login function was not called
    await waitFor(() => {
      expect(mockLoginFunction).not.toHaveBeenCalled();
    });
    
    // Verify validation error is shown
    expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
  });

  test('should show loading state when authenticating', () => {
    // Mock authenticating state
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLoginFunction,
      state: {
        state: AuthState.AUTHENTICATING,
        error: null
      }
    });
    
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    // Check that submit button shows loading state
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-busy', 'true');
    
    // Check that form inputs are disabled
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();
  });

  test('should display authentication error when login fails', () => {
    // Mock error state
    const errorMessage = 'Invalid email or password';
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLoginFunction,
      state: {
        state: AuthState.UNAUTHENTICATED,
        error: errorMessage
      }
    });
    
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    // Check that error message is displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('should have working forgot password link', () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    // Check that forgot password link has correct href
    const forgotPasswordLink = screen.getByText(/forgot password\?/i);
    expect(forgotPasswordLink.getAttribute('href')).toBe('#forgot-password');
  });

  test('should render Google login button that triggers loginWithGoogle', async () => {
    // Mock loginWithGoogle function
    const mockLoginWithGoogle = jest.fn().mockResolvedValue({
      user: { userId: 'test-user-id', email: 'test@example.com' },
      token: { token: 'mock-token' }
    });
    
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLoginFunction,
      loginWithGoogle: mockLoginWithGoogle,
      state: {
        state: AuthState.UNAUTHENTICATED,
        error: null
      }
    });
    
    render(<LoginForm onSuccess={mockOnSuccess} />);
    
    // Click Google login button
    fireEvent.click(screen.getByText(/continue with google/i));
    
    // Verify loginWithGoogle function was called
    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalled();
    });
    
    // Verify onSuccess would be called after successful login
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});