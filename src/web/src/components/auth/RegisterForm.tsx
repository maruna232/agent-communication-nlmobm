import React from 'react';
import { Button } from '../common/Button';
import { FormField } from '../common/FormField';
import { OAuthButtons } from './OAuthButtons';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from '../../hooks/useForm';
import { validateEmail, validatePassword, validatePasswordMatch } from '../../lib/utils/validation';
import { IRegistrationData, AuthState } from '../../lib/types/auth.types';

export interface RegisterFormProps {
  /** Callback function called when registration is successful */
  onSuccess?: () => void;
  /** Additional CSS classes to apply to the form */
  className?: string;
}

/**
 * Creates a validation schema for the registration form
 * @returns Validation schema with validation functions for each field
 */
function createValidationSchema() {
  return {
    email: (value: string) => 
      !value ? 'Email is required' : 
      !validateEmail(value) ? 'Please enter a valid email address' : null,
    
    password: (value: string) => {
      if (!value) return 'Password is required';
      const validation = validatePassword(value);
      return validation.isValid ? null : validation.error;
    },
    
    confirmPassword: (value: string, values: any) => 
      !value ? 'Please confirm your password' : 
      !validatePasswordMatch(values.password, value) ? 'Passwords do not match' : null,
    
    displayName: (value: string) => 
      !value ? 'Display name is required' : 
      value.length < 2 ? 'Display name must be at least 2 characters long' : null
  };
}

/**
 * A form component for user registration with validation and error handling
 * 
 * This component provides a comprehensive registration form that collects
 * email, password, and display name from users. It includes field validation,
 * password strength requirements, and OAuth options in accordance with the
 * application's privacy-first approach.
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onSuccess, 
  className = '' 
}) => {
  // Get authentication state and register function from auth hook
  const { register, state, error: authError } = useAuth();
  
  // Initialize form with validation schema
  const { 
    values, 
    errors, 
    touched, 
    handleChange, 
    handleBlur, 
    handleSubmit,
    isSubmitting
  } = useForm<IRegistrationData>(
    { email: '', password: '', confirmPassword: '', displayName: '' },
    createValidationSchema()
  );
  
  // Check if registration is in progress
  const isRegistering = state.state === AuthState.AUTHENTICATING;
  
  // Handle registration form submission
  const handleRegistration = async () => {
    try {
      await register({
        email: values.email,
        password: values.password,
        displayName: values.displayName
      });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Error will be handled by useAuth hook
      console.error('Registration error:', error);
    }
  };
  
  return (
    <form 
      className={`space-y-4 ${className}`} 
      onSubmit={handleSubmit(handleRegistration)}
      aria-label="Registration form"
      data-testid="register-form"
    >
      <div className="mb-4 text-center">
        <h2 className="text-xl font-semibold text-gray-800">Create your account</h2>
        <p className="text-gray-600 text-sm mt-1">Enter your details to register</p>
      </div>
      
      <FormField
        name="email"
        label="Email Address"
        type="email"
        value={values.email}
        error={errors.email}
        touched={touched.email}
        onChange={handleChange}
        onBlur={handleBlur}
        required
        fullWidth
        autoComplete="email"
        testId="register-email-input"
      />
      
      <FormField
        name="password"
        label="Password"
        type="password"
        value={values.password}
        error={errors.password}
        touched={touched.password}
        onChange={handleChange}
        onBlur={handleBlur}
        required
        fullWidth
        helperText="Must be at least 10 characters with uppercase, lowercase, numbers, and symbols"
        autoComplete="new-password"
        testId="register-password-input"
      />
      
      <FormField
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        touched={touched.confirmPassword}
        onChange={handleChange}
        onBlur={handleBlur}
        required
        fullWidth
        autoComplete="new-password"
        testId="register-confirm-password-input"
      />
      
      <FormField
        name="displayName"
        label="Display Name"
        type="text"
        value={values.displayName}
        error={errors.displayName}
        touched={touched.displayName}
        onChange={handleChange}
        onBlur={handleBlur}
        required
        fullWidth
        autoComplete="name"
        testId="register-display-name-input"
      />
      
      {authError && (
        <div 
          className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm" 
          role="alert"
          data-testid="register-error-message"
        >
          {authError}
        </div>
      )}
      
      <Button
        type="submit"
        variant="primary"
        fullWidth
        isLoading={isRegistering || isSubmitting}
        disabled={isRegistering || isSubmitting}
        testId="register-submit-button"
      >
        Create Account
      </Button>
      
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>
        
        <div className="mt-4">
          <OAuthButtons 
            onSuccess={onSuccess} 
          />
        </div>
      </div>
    </form>
  );
};