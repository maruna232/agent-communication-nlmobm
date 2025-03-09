import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useForm } from '../../hooks/useForm';
import { Button } from '../common/Button';
import { FormField } from '../common/FormField';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { IPasswordUpdateRequest, AuthState } from '../../lib/types/auth.types';
import { validatePassword, validatePasswordMatch } from '../../lib/utils/validation';

export interface ResetPasswordFormProps {
  onSuccess: () => void;
  token: string;
  className?: string;
}

interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

export const ResetPasswordForm = ({ 
  onSuccess, 
  token, 
  className = '' 
}: ResetPasswordFormProps): JSX.Element => {
  const { updatePassword, state } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Define initial form values
  const initialValues: ResetPasswordFormValues = {
    password: '',
    confirmPassword: ''
  };
  
  // Create validation schema
  const validationSchema = {
    password: (value: string) => {
      const validation = validatePassword(value);
      return validation.isValid ? null : validation.error;
    },
    confirmPassword: (value: string, values: ResetPasswordFormValues) => {
      return validatePasswordMatch(values.password, value) ? null : 'Passwords do not match';
    }
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
    isValid
  } = useForm<ResetPasswordFormValues>(
    initialValues,
    validationSchema,
    {
      onSubmit: async (formValues) => {
        try {
          setAuthError(null);
          
          // Create password update request
          const passwordData: IPasswordUpdateRequest = {
            currentPassword: token, // Use token as the current password for reset
            newPassword: formValues.password
          };
          
          // Update password
          await updatePassword(passwordData);
          
          // Call success callback
          handleResetSuccess();
        } catch (error) {
          // Handle error display
          setAuthError(error instanceof Error ? error.message : 'Failed to reset password');
        }
      }
    }
  );
  
  // Handle successful password reset
  const handleResetSuccess = () => {
    onSuccess();
  };
  
  // Check if the form is loading (submitting or auth state is authenticating)
  const isLoading = isSubmitting || state === AuthState.AUTHENTICATING;
  
  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      <div className="space-y-4">
        {/* Password field */}
        <FormField
          name="password"
          label="New Password"
          type="password"
          placeholder="Enter your new password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          touched={touched.password}
          required
          autoComplete="new-password"
          helperText="Password must be at least 10 characters with uppercase, lowercase, number, and special character"
        />
        
        {/* Confirm Password field */}
        <FormField
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Confirm your new password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.confirmPassword}
          touched={touched.confirmPassword}
          required
          autoComplete="new-password"
        />
        
        {/* Error display for authentication errors */}
        {authError && (
          <ErrorDisplay 
            error={authError} 
            variant="inline" 
          />
        )}
        
        {/* Submit button */}
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={!isValid || isLoading}
          isLoading={isLoading}
        >
          Reset Password
        </Button>
      </div>
    </form>
  );
};