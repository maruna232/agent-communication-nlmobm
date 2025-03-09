import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from '../../hooks/useForm';
import { Button } from '../common/Button';
import { FormField } from '../common/FormField';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { OAuthButtons } from './OAuthButtons';
import { 
  ILoginCredentials, 
  AuthState 
} from '../../lib/types/auth.types';
import { 
  validateEmail, 
  validateLoginCredentials 
} from '../../lib/utils/validation';

export interface LoginFormProps {
  onSuccess: () => void;
  className?: string;
}

export const LoginForm = ({
  onSuccess,
  className = ''
}: LoginFormProps): JSX.Element => {
  // Get login function and auth state from useAuth hook
  const { login, state } = useAuth();
  
  // Setup form validation
  const initialValues: ILoginCredentials = { email: '', password: '' };
  
  // Create validation schema
  const validationSchema = {
    email: (value: string) => !value 
      ? 'Email is required' 
      : !validateEmail(value) 
        ? 'Invalid email format' 
        : null,
    password: (value: string) => !value 
      ? 'Password is required' 
      : value.length < 10 
        ? 'Password must be at least 10 characters' 
        : null
  };
  
  // Handle login success callback
  const handleLoginSuccess = () => {
    onSuccess();
  };
  
  // Initialize form with useForm hook
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    setFieldError
  } = useForm<ILoginCredentials>(
    initialValues,
    validationSchema
  );
  
  // Handle form submission with comprehensive validation
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Use validateLoginCredentials for comprehensive validation
    const validation = validateLoginCredentials(values);
    
    if (!validation.isValid) {
      // Set field errors from validation result
      Object.entries(validation.errors).forEach(([field, error]) => {
        setFieldError(field, error);
      });
      return;
    }
    
    try {
      await login(values);
      onSuccess();
    } catch (error) {
      // Error handling is managed by the useAuth hook
      console.error('Login failed:', error);
    }
  };
  
  // Determine loading state
  const isLoading = state.state === AuthState.AUTHENTICATING || isSubmitting;
  
  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Display authentication error if any */}
        {state.error && (
          <ErrorDisplay 
            error={state.error}
            variant="inline"
          />
        )}
        
        <FormField
          name="email"
          label="Email"
          type="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
          touched={touched.email}
          required
          disabled={isLoading}
          fullWidth
        />
        
        <FormField
          name="password"
          label="Password"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          touched={touched.password}
          required
          disabled={isLoading}
          fullWidth
        />
        
        <div className="flex justify-between space-x-4 pt-2">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading}
          >
            Sign In
          </Button>
          
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => window.location.href = '/register'}
            disabled={isLoading}
          >
            Register
          </Button>
        </div>
        
        <div className="mt-4">
          <OAuthButtons onSuccess={handleLoginSuccess} />
        </div>
        
        <div className="text-center mt-4">
          <a 
            href="#forgot-password" 
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot Password?
          </a>
        </div>
      </form>
    </div>
  );
};