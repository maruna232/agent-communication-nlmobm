import React, { useState, useEffect, useRef, useCallback } from 'react';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import { Button } from './Button';

/**
 * Interface defining the properties for the Modal component
 */
export interface ModalProps {
  /** The content of the modal */
  children: React.ReactNode;
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Function to call when the modal should close */
  onClose: () => void;
  /** The title of the modal */
  title?: string;
  /** The size of the modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether clicking the backdrop should close the modal */
  closeOnBackdropClick?: boolean;
  /** Whether pressing ESC should close the modal */
  closeOnEsc?: boolean;
  /** Whether to show the close button in the header */
  showCloseButton?: boolean;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Additional CSS class for the modal container */
  className?: string;
  /** Additional CSS class for the modal content */
  contentClassName?: string;
  /** Additional CSS class for the backdrop */
  backdropClassName?: string;
  /** ID attribute for the modal */
  id?: string;
  /** ARIA labelled by ID */
  ariaLabelledBy?: string;
  /** ARIA described by ID */
  ariaDescribedBy?: string;
  /** Whether to focus the modal initially */
  initialFocus?: boolean;
  /** Duration for animation in ms */
  animationDuration?: number;
}

/**
 * Custom hook to handle ESC key press
 */
const useEscapeKey = (callback: () => void): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [callback]);
};

/**
 * Custom hook to prevent body scrolling when modal is open
 */
const useBodyScrollLock = (isLocked: boolean): void => {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    if (isLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalStyle;
    }

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isLocked]);
};

/**
 * A customizable modal component that provides an overlay dialog interface
 */
export const Modal = ({
  children,
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  footer,
  className = '',
  contentClassName = '',
  backdropClassName = '',
  id,
  ariaLabelledBy,
  ariaDescribedBy,
  initialFocus = true,
  animationDuration = 300,
}: ModalProps): JSX.Element | null => {
  // Animation states
  const [isEntering, setIsEntering] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  // Refs for modal container and previously focused element
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  // Handle ESC key press to close modal if closeOnEsc is true
  const handleEscapeKey = useCallback(() => {
    if (closeOnEsc && isOpen) {
      onClose();
    }
  }, [closeOnEsc, isOpen, onClose]);
  
  useEscapeKey(handleEscapeKey);
  
  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen || isEntering || isLeaving);
  
  // Manage animation states when isOpen changes
  useEffect(() => {
    if (isOpen) {
      // Save currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Start enter animation
      setIsEntering(true);
      
      // End enter animation after duration
      const enterTimeout = setTimeout(() => {
        setIsEntering(false);
      }, animationDuration);
      
      return () => clearTimeout(enterTimeout);
    } else {
      // Start leave animation if we were showing the modal
      if (!isEntering && !isLeaving && modalRef.current) {
        setIsLeaving(true);
        
        // End leave animation after duration
        const leaveTimeout = setTimeout(() => {
          setIsLeaving(false);
          
          // Restore focus to previous element when modal closes
          if (previousFocusRef.current) {
            previousFocusRef.current.focus();
          }
        }, animationDuration);
        
        return () => clearTimeout(leaveTimeout);
      }
    }
  }, [isOpen, animationDuration, isEntering, isLeaving]);
  
  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Don't render anything if not open and not animating
  if (!isOpen && !isEntering && !isLeaving) {
    return null;
  }
  
  // Size-specific classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full m-4',
  };
  
  // Animation classes based on state
  const backdropClasses = classNames(
    'fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 transition-opacity',
    {
      'opacity-0': isLeaving,
      'opacity-100': isOpen && !isLeaving,
    },
    backdropClassName
  );
  
  const modalClasses = classNames(
    'relative w-full mx-auto rounded-lg bg-white shadow-xl transition-all transform',
    {
      'scale-95 opacity-0': isLeaving,
      'scale-100 opacity-100': isOpen && !isLeaving,
    },
    sizeClasses[size],
    className
  );
  
  // Create a dynamic title ID for accessibility if not provided
  const titleId = ariaLabelledBy || (title ? `modal-title-${id || Date.now()}` : undefined);
  const contentId = ariaDescribedBy || `modal-content-${id || Date.now()}`;
  
  // Set transition style based on animation duration
  const transitionStyle = {
    transitionDuration: `${animationDuration}ms`,
  };
  
  // Generate a unique ID for the modal if not provided
  const modalId = id || `modal-${Date.now()}`;
  
  return (
    <FocusTrap
      active={isOpen && !isLeaving}
      focusTrapOptions={{
        initialFocus: initialFocus ? undefined : false,
        fallbackFocus: `#${modalId}`,
        allowOutsideClick: true,
        escapeDeactivates: false, // We handle ESC key ourselves
      }}
    >
      <div
        className={backdropClasses}
        style={transitionStyle}
        onClick={handleBackdropClick}
        aria-hidden="true"
      >
        <div
          id={modalId}
          className={modalClasses}
          style={transitionStyle}
          ref={modalRef}
          tabIndex={-1} // Allows the container to receive focus
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={contentId}
          data-testid="modal"
        >
          {/* Header with title and close button */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              {title && (
                <h2 id={titleId} className="text-lg font-medium text-gray-900">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <div className={title ? '' : 'ml-auto'}>
                  <Button
                    variant="ghost"
                    size="sm"
                    ariaLabel="Close modal"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="w-5 h-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Content */}
          <div id={contentId} className={classNames('px-6 py-4', contentClassName)}>
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="flex justify-end px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    </FocusTrap>
  );
};