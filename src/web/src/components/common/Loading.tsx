import React from 'react';
import classNames from 'classnames'; // ^2.3.2

/**
 * Interface defining the properties for the Loading component
 */
export interface LoadingProps {
  /**
   * Size of the loading indicator
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Visual style variant of the loading indicator
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'neutral';
  
  /**
   * Text label to display alongside the loading indicator
   * @default 'Loading...'
   */
  label?: string;
  
  /**
   * Whether to hide the text label
   * @default false
   */
  hideLabel?: boolean;
  
  /**
   * Additional CSS class names to apply to the component
   */
  className?: string;
  
  /**
   * Data test ID for testing purposes
   * @default 'loading-spinner'
   */
  testId?: string;
  
  /**
   * Whether the loading indicator should take up the full page
   * @default false
   */
  fullPage?: boolean;
  
  /**
   * Whether the loading indicator should display inline with other content
   * @default false
   */
  inline?: boolean;
}

/**
 * A customizable loading component that displays a spinner or other loading indicator
 * throughout the AI Agent Network application.
 */
export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'primary',
  label = 'Loading...',
  hideLabel = false,
  className = '',
  testId = 'loading-spinner',
  fullPage = false,
  inline = false,
}) => {
  // Determine size-based classes
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };
  
  // Determine variant-based classes
  const variantClasses = {
    primary: 'border-blue-500 border-t-transparent',
    secondary: 'border-green-500 border-t-transparent',
    neutral: 'border-gray-300 border-t-transparent',
  };
  
  // Container classes for different display modes
  const containerClasses = classNames(
    'flex items-center justify-center',
    {
      'fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-50': fullPage,
      'inline-flex': inline,
      'flex flex-col': !inline,
    },
    className
  );
  
  // Spinner classes combining size and variant
  const spinnerClasses = classNames(
    'rounded-full animate-spin',
    sizeClasses[size],
    variantClasses[variant]
  );
  
  return (
    <div 
      className={containerClasses} 
      data-testid={testId}
      role="status"
      aria-live="polite"
    >
      <div className={spinnerClasses} />
      {!hideLabel && label && (
        <span className={classNames('text-sm text-gray-700 dark:text-gray-300', {
          'sr-only': hideLabel,
          'ml-2': inline,
          'mt-2': !inline,
        })}>
          {label}
        </span>
      )}
      {/* Always include an accessible loading text for screen readers */}
      <span className="sr-only">Loading</span>
    </div>
  );
};

export default Loading;