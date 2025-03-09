import React from 'react';
import classNames from 'classnames';
import { Card } from './Card';
import { Button } from './Button';
import { ERROR_TYPES } from '../../lib/constants';
import {
  getErrorType,
  getErrorMessage,
  getErrorDetails,
  getRecoveryAction,
  RecoveryAction
} from '../../lib/utils/errorHandling';

export interface ErrorDisplayProps {
  error: Error | string;
  message?: string;
  errorType?: string;
  recoveryAction?: RecoveryAction;
  variant?: 'inline' | 'card' | 'banner' | 'toast';
  showIcon?: boolean;
  showDetails?: boolean;
  className?: string;
  testId?: string;
  onDismiss?: () => void;
}

const getErrorIcon = (errorType: string): JSX.Element => {
  switch (errorType) {
    case ERROR_TYPES.AUTHENTICATION:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case ERROR_TYPES.NETWORK:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
          <path d="M1 1l22 22m-4-4a7 7 0 0 0-10-10" />
          <path d="M15 9a5 5 0 0 0-5-5m-4 9a3 3 0 0 0 3 3" />
        </svg>
      );
    case ERROR_TYPES.STORAGE:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
          <path d="M12 2v8m0 4v8m-8-6h16m-16-8h16" />
        </svg>
      );
    case ERROR_TYPES.WEBSOCKET:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case ERROR_TYPES.CALENDAR:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case ERROR_TYPES.AGENT:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="3" />
          <path d="M12 8v3" />
        </svg>
      );
    case ERROR_TYPES.VALIDATION:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
          <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v4m0 4h.01" />
        </svg>
      );
    case ERROR_TYPES.UNKNOWN:
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
  }
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  message,
  errorType: explicitErrorType,
  recoveryAction: explicitRecoveryAction,
  variant = 'card',
  showIcon = true,
  showDetails = false,
  className = '',
  testId = 'error-display',
  onDismiss,
}) => {
  // Determine the error type - use explicit type if provided, or derive from error
  const errorType = explicitErrorType || 
    (error instanceof Error ? getErrorType(error) : ERROR_TYPES.UNKNOWN);
  
  // Get the error message - use explicit message if provided, or derive from error
  const errorMessage = message || getErrorMessage(error);
  
  // Get error details if needed and available
  const details = showDetails ? getErrorDetails(error) : {};
  
  // Get recovery action - use explicit action if provided, or derive from error
  const recoveryAction = explicitRecoveryAction || 
    (error instanceof Error ? getRecoveryAction(error) : undefined);
  
  // Determine styling based on variant and error type
  const variantClasses = {
    inline: 'text-sm py-1',
    card: '', // Card component will handle padding
    banner: 'w-full py-2 px-4',
    toast: 'p-4 rounded-lg shadow-md',
  };
  
  const errorTypeClasses = {
    [ERROR_TYPES.AUTHENTICATION]: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    [ERROR_TYPES.NETWORK]: 'bg-red-50 text-red-800 border-red-200',
    [ERROR_TYPES.STORAGE]: 'bg-orange-50 text-orange-800 border-orange-200',
    [ERROR_TYPES.WEBSOCKET]: 'bg-purple-50 text-purple-800 border-purple-200',
    [ERROR_TYPES.CALENDAR]: 'bg-blue-50 text-blue-800 border-blue-200',
    [ERROR_TYPES.AGENT]: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    [ERROR_TYPES.VALIDATION]: 'bg-pink-50 text-pink-800 border-pink-200',
    [ERROR_TYPES.UNKNOWN]: 'bg-gray-50 text-gray-800 border-gray-200',
  };
  
  // Use a default if the error type doesn't match any known types
  const errorStyleClass = errorTypeClasses[errorType] || errorTypeClasses[ERROR_TYPES.UNKNOWN];
  
  // Get the appropriate icon for this error type
  const icon = showIcon ? getErrorIcon(errorType) : null;
  
  if (variant === 'card') {
    return (
      <Card 
        className={classNames(
          'border', 
          errorStyleClass, 
          className
        )}
        testId={testId}
      >
        <div className="flex items-start">
          {showIcon && (
            <div className="flex-shrink-0 mr-3">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-base font-medium mb-1">
              {errorMessage}
            </h3>
            {showDetails && Object.keys(details).length > 0 && (
              <div className="text-sm mt-2 text-gray-600">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(details, null, 2)}
                </pre>
              </div>
            )}
            {recoveryAction && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={recoveryAction.action}
                  ariaLabel={`${recoveryAction.label} to resolve error`}
                >
                  {recoveryAction.label}
                </Button>
              </div>
            )}
          </div>
          {onDismiss && (
            <div className="flex-shrink-0 ml-3">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={onDismiss}
                aria-label="Dismiss error"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </Card>
    );
  }
  
  // For other variants, use a simpler structure
  return (
    <div
      className={classNames(
        'flex items-center border',
        errorStyleClass,
        variantClasses[variant],
        className
      )}
      role="alert"
      aria-live="polite"
      data-testid={testId}
    >
      {showIcon && (
        <span className="flex-shrink-0 mr-2">
          {icon}
        </span>
      )}
      <span className="flex-1">
        {errorMessage}
      </span>
      {recoveryAction && (
        <button
          type="button"
          className="ml-2 text-sm font-medium underline"
          onClick={recoveryAction.action}
          aria-label={`${recoveryAction.label} to resolve error`}
        >
          {recoveryAction.label}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          className="ml-2 text-gray-400 hover:text-gray-500"
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};