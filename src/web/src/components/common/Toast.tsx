import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { Toaster, toast, useToaster } from 'react-hot-toast';
import { Button } from './Button';

/**
 * Interface defining an action button for toast notifications
 */
export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  dismissOnClick?: boolean;
}

/**
 * Interface defining the properties for the Toast component
 */
export interface ToastProps {
  id?: string;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning' | 'approval';
  duration?: number;
  dismissible?: boolean;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: React.ReactNode;
  actions?: ToastAction[];
  onClose?: () => void;
  className?: string;
  ariaLive?: string;
}

/**
 * Interface defining the properties for the ToastContainer component
 */
export interface ToastContainerProps {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  limit?: number;
  gutter?: number;
  className?: string;
  reverseOrder?: boolean;
}

/**
 * A customizable toast notification component that displays temporary messages
 */
export const Toast = ({
  id,
  title,
  message,
  type = 'info',
  duration = 5000,
  dismissible = true,
  position = 'bottom-right',
  icon,
  actions = [],
  onClose,
  className,
  ariaLive = 'polite',
}: ToastProps): JSX.Element => {
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine the appropriate icon based on toast type
  const getIcon = () => {
    if (icon) return icon;

    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'approval':
        return (
          <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      default: // info
        return (
          <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Determine the appropriate background color based on toast type
  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'approval': return 'bg-blue-50 border-blue-200';
      default: return 'bg-blue-50 border-blue-200'; // info
    }
  };

  // Handle close/dismiss
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // Wait for exit animation to complete
  };

  // Set up auto-dismiss timer
  useEffect(() => {
    if (duration && duration > 0) {
      timerRef.current = setTimeout(() => {
        handleClose();
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration]);

  // Handle keyboard interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && dismissible) {
      handleClose();
    }
  };

  // Animation and positioning classes
  const animationClasses = isVisible 
    ? 'animate-enter opacity-100 translate-y-0' 
    : 'animate-leave opacity-0 translate-y-2';

  const positionClasses = {
    'top-left': 'top-0 left-0',
    'top-center': 'top-0 left-1/2 transform -translate-x-1/2',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-center': 'bottom-0 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-0 right-0',
  };

  // Main toast classes
  const toastClasses = classNames(
    'flex items-start p-4 mb-3 rounded-lg border shadow-md max-w-md transition-all duration-300 transform',
    getBackgroundColor(),
    positionClasses[position],
    animationClasses,
    className
  );

  return (
    <div
      id={id}
      role="alert"
      aria-live={ariaLive}
      className={toastClasses}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-testid="toast"
    >
      <div className="flex-shrink-0 mr-3">
        {getIcon()}
      </div>
      <div className="flex-1">
        {title && <h4 className="font-semibold text-gray-900">{title}</h4>}
        <div className="text-sm text-gray-700">{message}</div>
        {actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <Button
                key={`action-${index}`}
                variant={action.variant || 'primary'}
                size="sm"
                onClick={() => {
                  action.onClick();
                  if (action.dismissOnClick) {
                    handleClose();
                  }
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      {dismissible && (
        <button
          aria-label="Close"
          className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
          onClick={handleClose}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

/**
 * Container component that manages multiple toast notifications
 */
export const ToastContainer = ({
  position = 'bottom-right',
  limit = 5,
  gutter = 8,
  className,
  reverseOrder = false,
}: ToastContainerProps): JSX.Element => {
  // Convert position to react-hot-toast position format
  const getHotToastPosition = () => {
    switch (position) {
      case 'top-left': return 'top-left';
      case 'top-center': return 'top-center';
      case 'top-right': return 'top-right';
      case 'bottom-left': return 'bottom-left';
      case 'bottom-center': return 'bottom-center';
      case 'bottom-right': return 'bottom-right';
      default: return 'bottom-right';
    }
  };

  const containerClasses = classNames(
    'fixed z-50',
    {
      'top-0 left-0': position === 'top-left',
      'top-0 left-1/2 transform -translate-x-1/2': position === 'top-center',
      'top-0 right-0': position === 'top-right',
      'bottom-0 left-0': position === 'bottom-left',
      'bottom-0 left-1/2 transform -translate-x-1/2': position === 'bottom-center',
      'bottom-0 right-0': position === 'bottom-right',
    },
    className
  );

  return (
    <div className={containerClasses}>
      <Toaster
        position={getHotToastPosition()}
        toastOptions={{
          className: '',
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
          },
        }}
        gutter={gutter}
        containerStyle={{
          top: position.startsWith('top') ? 20 : undefined,
          bottom: position.startsWith('bottom') ? 20 : undefined,
          left: position.includes('left') ? 20 : undefined,
          right: position.includes('right') ? 20 : undefined,
        }}
        containerClassName="toast-container"
        reverseOrder={reverseOrder}
      />
    </div>
  );
};

/**
 * Custom hook that provides methods for showing toast notifications
 */
export const useToast = () => {
  const { toasts, handlers } = useToaster();
  const { startPause, endPause, updateToast, dismiss, dismissAll } = handlers;

  // Helper to show a toast notification
  const showToast = (
    message: string, 
    options?: Partial<ToastProps>
  ) => {
    return toast.custom(
      (t) => (
        <Toast
          id={t.id}
          message={message}
          {...options}
          onClose={() => toast.dismiss(t.id)}
        />
      ),
      {
        duration: options?.duration,
        id: options?.id,
      }
    );
  };

  // Success toast
  const success = (message: string, options?: Partial<ToastProps>) => {
    return showToast(message, { ...options, type: 'success' });
  };

  // Error toast
  const error = (message: string, options?: Partial<ToastProps>) => {
    return showToast(message, { ...options, type: 'error' });
  };

  // Info toast
  const info = (message: string, options?: Partial<ToastProps>) => {
    return showToast(message, { ...options, type: 'info' });
  };

  // Warning toast
  const warning = (message: string, options?: Partial<ToastProps>) => {
    return showToast(message, { ...options, type: 'warning' });
  };

  // Custom toast with actions
  const custom = (
    message: string, 
    options?: Partial<ToastProps>,
    actions?: ToastAction[]
  ) => {
    return showToast(message, { ...options, actions });
  };

  // Approval toast with accept/reject actions
  const approval = (
    message: string, 
    onAccept: () => void, 
    onReject: () => void,
    options?: Partial<ToastProps>
  ) => {
    const actions: ToastAction[] = [
      {
        label: 'Accept',
        onClick: onAccept,
        variant: 'primary',
        dismissOnClick: true,
      },
      {
        label: 'Reject',
        onClick: onReject,
        variant: 'outline',
        dismissOnClick: true,
      }
    ];

    return showToast(message, { 
      ...options, 
      type: 'approval', 
      duration: options?.duration || 0, // By default, approval toasts don't auto-dismiss
      actions 
    });
  };

  return {
    success,
    error,
    info,
    warning,
    custom,
    approval,
    dismiss,
    dismissAll,
    toasts
  };
};