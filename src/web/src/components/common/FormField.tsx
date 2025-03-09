import React, { forwardRef } from 'react';
import classNames from 'classnames'; // ^2.3.2
import { ErrorDisplay } from './ErrorDisplay';

export interface FormFieldProps {
  // Basic props
  id?: string;
  name: string;
  label?: string;
  value?: string | number;
  placeholder?: string;
  helperText?: string;
  error?: string;
  touched?: boolean;
  
  // Input type and appearance
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local' | 'textarea' | 'select';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  
  // Style customization
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  helperTextClassName?: string;
  
  // UI enhancements
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  options?: React.ReactNode[];
  
  // Input-specific attributes
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
  
  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;
  
  // Testing
  testId?: string;
  
  // Event handlers
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

/**
 * A customizable form field component that supports various input types, validation states,
 * and accessibility features for the AI Agent Network application.
 */
export const FormField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  FormFieldProps
>(({
  // Destructure props with default values
  id,
  name,
  label,
  value,
  placeholder,
  helperText,
  error,
  touched = false,
  type = 'text',
  size = 'md',
  disabled = false,
  readOnly = false,
  required = false,
  fullWidth = false,
  className = '',
  labelClassName = '',
  inputClassName = '',
  errorClassName = '',
  helperTextClassName = '',
  leftIcon,
  rightIcon,
  children,
  options,
  min,
  max,
  step,
  maxLength,
  pattern,
  autoComplete,
  ariaLabel,
  ariaDescribedBy,
  testId,
  onChange,
  onBlur,
  onFocus,
}, ref) => {
  // Generate unique ID if not provided for accessibility
  const fieldId = id || `field-${name}-${Math.random().toString(36).substring(2, 9)}`;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  
  // Determine if we should show error
  const showError = !!error && touched;
  
  // Define size-specific classes
  const sizeClasses = {
    sm: 'text-sm px-2 py-1 h-8',
    md: 'text-base px-3 py-2 h-10',
    lg: 'text-lg px-4 py-2 h-12',
  };
  
  // Create aria-describedby value
  const getAriaDescribedBy = () => {
    const ids = [];
    if (showError) ids.push(errorId);
    if (helperText) ids.push(helperId);
    if (ariaDescribedBy) ids.push(ariaDescribedBy);
    
    return ids.length > 0 ? ids.join(' ') : undefined;
  };
  
  // Apply conditional classes
  const labelClasses = classNames(
    'block mb-1 font-medium text-gray-700',
    {
      'text-sm': size === 'sm',
      'text-base': size === 'md',
      'text-lg': size === 'lg',
      'opacity-60': disabled,
    },
    labelClassName
  );
  
  const inputClasses = classNames(
    'w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500',
    sizeClasses[size],
    {
      'w-full': fullWidth,
      'bg-gray-100 cursor-not-allowed': disabled,
      'bg-gray-50': readOnly,
      'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500': showError,
      'pl-9': leftIcon,
      'pr-9': rightIcon,
    },
    inputClassName
  );
  
  const helperTextClasses = classNames(
    'mt-1 text-sm text-gray-500',
    helperTextClassName
  );
  
  // Common input props for all input types
  const commonInputProps = {
    id: fieldId,
    name,
    value,
    placeholder,
    disabled,
    readOnly,
    required,
    'aria-label': ariaLabel || label,
    'aria-invalid': showError,
    'aria-describedby': getAriaDescribedBy(),
    onChange,
    onBlur,
    onFocus,
    'data-testid': testId,
  };
  
  // Render the input based on type
  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={inputClasses}
            maxLength={maxLength}
            autoComplete={autoComplete}
            {...commonInputProps}
          />
        );
      
      case 'select':
        return (
          <select
            ref={ref as React.Ref<HTMLSelectElement>}
            className={inputClasses}
            autoComplete={autoComplete}
            {...commonInputProps}
          >
            {options || children}
          </select>
        );
      
      default:
        return (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            type={type}
            className={inputClasses}
            min={type === 'number' ? min : undefined}
            max={type === 'number' ? max : undefined}
            step={type === 'number' ? step : undefined}
            maxLength={maxLength}
            pattern={pattern}
            autoComplete={autoComplete}
            {...commonInputProps}
          />
        );
    }
  };
  
  return (
    <div className={classNames('mb-4', { 'w-full': fullWidth }, className)}>
      {label && (
        <label htmlFor={fieldId} className={labelClasses}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        {renderInput()}
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
      
      {helperText && !showError && (
        <p id={helperId} className={helperTextClasses}>
          {helperText}
        </p>
      )}
      
      {showError && (
        <div 
          id={errorId} 
          className={classNames('mt-1', errorClassName)}
        >
          <ErrorDisplay
            error={error}
            variant="inline"
            showIcon={false}
            className="text-sm"
          />
        </div>
      )}
    </div>
  );
});

// Add display name for better debugging
FormField.displayName = 'FormField';

export default FormField;