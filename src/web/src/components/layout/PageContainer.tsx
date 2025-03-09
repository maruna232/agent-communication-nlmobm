import React from 'react';
import classNames from 'classnames'; // v2.3.2

/**
 * Interface defining the properties for the PageContainer component
 */
interface PageContainerProps {
  /** Child content to be rendered within the container */
  children: React.ReactNode;
  /** Additional CSS classes to apply to the container */
  className?: string;
  /** Maximum width constraint for the container */
  maxWidth?: string;
  /** Whether to remove padding from the container */
  noPadding?: boolean;
}

/**
 * A container component that wraps page content with consistent padding, 
 * maximum width, and responsive behavior
 * 
 * @param props Component properties
 * @returns Rendered page container with children content
 */
export function PageContainer({
  children,
  className,
  maxWidth = '7xl',
  noPadding = false,
}: PageContainerProps): JSX.Element {
  // Combine provided className with default container classes
  const containerClasses = classNames(
    'w-full mx-auto', // Full width and horizontally centered
    {
      'px-4 sm:px-6 md:px-8 lg:px-10': !noPadding, // Apply responsive padding unless noPadding is true
      'max-w-sm': maxWidth === 'sm',
      'max-w-md': maxWidth === 'md',
      'max-w-lg': maxWidth === 'lg',
      'max-w-xl': maxWidth === 'xl',
      'max-w-2xl': maxWidth === '2xl',
      'max-w-3xl': maxWidth === '3xl',
      'max-w-4xl': maxWidth === '4xl',
      'max-w-5xl': maxWidth === '5xl',
      'max-w-6xl': maxWidth === '6xl',
      'max-w-7xl': maxWidth === '7xl' || maxWidth === undefined,
      'max-w-full': maxWidth === 'full',
      'max-w-screen-sm': maxWidth === 'screen-sm',
      'max-w-screen-md': maxWidth === 'screen-md',
      'max-w-screen-lg': maxWidth === 'screen-lg',
      'max-w-screen-xl': maxWidth === 'screen-xl',
      'max-w-screen-2xl': maxWidth === 'screen-2xl',
    },
    className // Apply any additional classes
  );

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
}