import React from 'react';
import classNames from 'classnames'; // v2.3.2

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  id?: string;
  showDividers?: boolean;
  showHeaderDivider?: boolean;
  showFooterDivider?: boolean;
  testId?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  headerContent,
  footerContent,
  variant = 'default',
  padding = 'md',
  fullWidth = false,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  id,
  showDividers = false,
  showHeaderDivider,
  showFooterDivider,
  testId,
}) => {
  // Determine whether to show specific dividers based on the props
  const displayHeaderDivider = showHeaderDivider !== undefined ? showHeaderDivider : showDividers;
  const displayFooterDivider = showFooterDivider !== undefined ? showFooterDivider : showDividers;
  
  // Determine base card classes based on variant and other props
  const cardClasses = classNames(
    'bg-white rounded-lg overflow-hidden transition-shadow',
    {
      'border border-gray-200': variant === 'outlined',
      'shadow-md': variant === 'elevated',
      'bg-transparent': variant === 'flat',
      'w-full': fullWidth,
    },
    className
  );
  
  // Determine padding classes for the content
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };
  
  // Determine if we need to render a header (if title or headerContent is provided)
  const hasHeader = Boolean(title || headerContent);
  
  // Determine if we need to render a footer (if footerContent is provided)
  const hasFooter = Boolean(footerContent);
  
  return (
    <div 
      className={cardClasses} 
      id={id} 
      data-testid={testId}
    >
      {hasHeader && (
        <div className={classNames(
          'flex items-center justify-between',
          paddingClasses[padding],
          {'border-b border-gray-200': displayHeaderDivider},
          headerClassName
        )}>
          {title && <h3 className="text-lg font-medium text-gray-800">{title}</h3>}
          {headerContent}
        </div>
      )}
      
      <div className={classNames(
        paddingClasses[padding],
        bodyClassName
      )}>
        {children}
      </div>
      
      {hasFooter && (
        <div className={classNames(
          paddingClasses[padding],
          {'border-t border-gray-200': displayFooterDivider},
          footerClassName
        )}>
          {footerContent}
        </div>
      )}
    </div>
  );
};

export default Card;