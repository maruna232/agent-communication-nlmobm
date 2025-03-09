import React from 'react';
import classNames from 'classnames'; // ^2.3.2

export interface ButtonProps {
  /** The content of the button */
  children?: React.ReactNode;
  /** Text label for the button (alternative to children) */
  label?: string;
  /** Visual style variant of the button */
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** HTML button type */
  type?: 'button' | 'submit' | 'reset';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Whether the button should take the full width of its container */
  fullWidth?: boolean;
  /** Additional CSS classes to add to the button */
  className?: string;
  /** Button ID attribute */
  id?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Data test ID for testing */
  testId?: string;
  /** Click handler function */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Icon to display on the left side of the button */
  leftIcon?: React.ReactNode;
  /** Icon to display on the right side of the button */
  rightIcon?: React.ReactNode;
}

/**
 * A customizable button component that supports various styles, sizes, and states
 * for consistent UX across the AI Agent Network application.
 */
export const Button = ({
  children,
  label,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  isLoading = false,
  fullWidth = false,
  className = '',
  id,
  ariaLabel,
  testId,
  onClick,
  leftIcon,
  rightIcon,
}: ButtonProps): JSX.Element => {
  // Base classes for all buttons
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
  
  // Variant-specific classes
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400 focus-visible:ring-gray-400',
    outline: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-400',
  };
  
  // Size-specific classes
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5 min-h-[30px]',
    md: 'text-base px-4 py-2 min-h-[38px]',
    lg: 'text-lg px-6 py-3 min-h-[46px]',
  };
  
  // Disabled and loading state classes
  const stateClasses = {
    disabled: 'opacity-50 cursor-not-allowed',
    fullWidth: 'w-full',
  };
  
  // Combine all classes
  const buttonClasses = classNames(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    {
      [stateClasses.disabled]: disabled || isLoading,
      [stateClasses.fullWidth]: fullWidth,
    },
    className
  );
  
  // Loading spinner component
  const LoadingSpinner = () => (
    <svg 
      className="animate-spin -ml-1 mr-2 h-4 w-4" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
  
  // Handle click event with optional event prevention
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) {
      event.preventDefault();
      return;
    }
    
    onClick?.(event);
  };
  
  return (
    <button
      id={id}
      type={type}
      className={buttonClasses}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-label={ariaLabel}
      data-testid={testId}
      onClick={handleClick}
    >
      {isLoading && <LoadingSpinner />}
      
      {/* Left icon if provided and not loading */}
      {leftIcon && !isLoading && <span className="mr-2">{leftIcon}</span>}
      
      {/* Button content */}
      <span>
        {children || label}
      </span>
      
      {/* Right icon if provided and not loading */}
      {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};