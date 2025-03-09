import React, { useState, useCallback } from 'react';
import { Button } from '../common/Button';
import { FormField } from '../common/FormField';
import { Card } from '../common/Card';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { useForm } from '../../hooks/useForm';
import { authService } from '../../services/auth.service';
import { IPasswordResetRequest } from '../../lib/types/auth.types';

/**
 * Interface defining the properties for the ForgotPasswordForm component
 */
interface ForgotPasswordFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
}

/**
 * Interface defining the form values for the forgot password form
 */
interface ForgotPasswordFormValues {
  email: string;
}

/**
 * Validates email format for the forgot password form
 * @param value Email value to validate
 * @returns Error message if invalid, null if valid
 */
const validateEmail = (value: string): string | null => {
  if (!value) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Invalid email format';
  }
  return null;
};

/**
 * Component for the forgot password form that allows users to request a password reset
 */
export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSuccess, onCancel, className }) => {
  // State for form submission status and success message
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set up form validation schema with email validation
  const validationSchema = {
    email: validateEmail,
  };

  // Initialize form state using useForm hook with initial values and validation schema
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useForm<ForgotPasswordFormValues>({ email: '' }, validationSchema);

  /**
   * Processes form submission to request a password reset
   * @param values Form values containing the email address
   */
  const handleFormSubmit = useCallback(async () => {
    setSubmissionStatus('submitting');
    setErrorMessage(null);

    try {
      // Call authService.resetPassword with email from form values
      await authService.resetPassword({ email: values.email });

      // Handle successful submission by showing success message
      setSuccessMessage('Password reset email sent. Please check your inbox.');
      setSubmissionStatus('success');
      onSuccess();
    } catch (error: any) {
      // Handle errors by displaying error message
      console.error('Password reset request failed:', error);
      setErrorMessage(error.message || 'Failed to send password reset email.');
      setSubmissionStatus('error');
    } finally {
      setSubmissionStatus('idle');
    }
  }, [values.email, onSuccess]);

  return (
    <Card variant="outlined" padding="md" className={className}>
      <h2 className="text-lg font-semibold mb-4">Forgot Password</h2>
      <p className="text-gray-600 mb-6">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <FormField
          type="email"
          label="Email Address"
          name="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
          touched={touched.email}
          required
          ariaLabel="Email address for password reset"
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={submissionStatus === 'submitting'}
          disabled={submissionStatus === 'submitting'}
        >
          {submissionStatus === 'submitting' ? 'Sending...' : 'Reset Password'}
        </Button>
      </form>

      {successMessage && (
        <div className="mt-4 text-green-600">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <ErrorDisplay error={errorMessage} variant="inline" className="mt-4" />
      )}

      <div className="mt-6 text-sm">
        <Button variant="ghost" onClick={onCancel}>
          Return to Login
        </Button>
      </div>
    </Card>
  );
};