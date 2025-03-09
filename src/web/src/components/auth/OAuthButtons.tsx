import React from 'react';
import { FcGoogle } from 'react-icons/fc'; // ^4.0.0
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { AuthState } from '../../lib/types/auth.types';

/**
 * Props interface for the OAuthButtons component
 */
export interface OAuthButtonsProps {
  /** Callback fired when authentication is successful */
  onSuccess?: () => void;
  /** Additional CSS classes to add to the component */
  className?: string;
}

/**
 * A component that renders OAuth authentication buttons for the AI Agent Network.
 * Currently supports Google sign-in with a clean, accessible interface that follows
 * the application's design guidelines.
 * 
 * This component implements the "Continue with Google" button as specified in the
 * login/registration screen wireframes and supports the privacy-focused platform
 * by using secure authentication with minimal data collection.
 */
export const OAuthButtons: React.FC<OAuthButtonsProps> = ({ 
  onSuccess,
  className = '' 
}) => {
  const { loginWithGoogle, state } = useAuth();
  const isAuthenticating = state.state === AuthState.AUTHENTICATING;

  /**
   * Handles the Google login process
   * Calls the onSuccess callback if provided and authentication succeeds
   */
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      onSuccess?.();
    } catch (error) {
      // Error handling is managed by the useAuth hook
      console.error('Google login failed:', error);
    }
  };

  return (
    <Button
      variant="outline"
      fullWidth
      onClick={handleGoogleLogin}
      isLoading={isAuthenticating}
      leftIcon={!isAuthenticating && <FcGoogle size={20} />}
      className={className}
      data-testid="google-auth-button"
      aria-label="Continue with Google"
    >
      Continue with Google
    </Button>
  );
};