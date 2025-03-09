import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import classNames from 'classnames';

// Import layout components
import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';
import { PageContainer } from './PageContainer';
import { ToastContainer } from '../common/Toast';

// Import hooks and types
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { AuthState } from '../../lib/types/auth.types';

/**
 * Interface defining the properties for the AppShell component
 */
interface AppShellProps {
  /** Child content to be rendered within the app shell */
  children: React.ReactNode;
  /** Whether the current page requires authentication */
  authRequired?: boolean;
}

/**
 * Main layout component that wraps the entire application and provides consistent structure,
 * navigation, and responsive behavior across all pages of the AI Agent Network application.
 */
export const AppShell = ({
  children,
  authRequired = false
}: AppShellProps): JSX.Element => {
  // Get authentication state and isAuthenticated function
  const { state, isAuthenticated } = useAuth();
  
  // Get notification status for badge indicators
  const { hasUnreadNotifications, hasPendingApprovals } = useNotifications();
  
  // Get router for redirects and current route info
  const router = useRouter();
  
  // Track window size for responsive layout
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    // Set initial size and add event listener
    if (typeof window !== 'undefined') {
      handleResize();
      window.addEventListener('resize', handleResize);
    }
    
    // Cleanup event listener
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);
  
  // Determine if we should show mobile view
  const isMobileView = windowWidth < 768;
  
  // Check if current route is an auth page
  const isAuthPage = router.pathname === '/login' || 
                     router.pathname === '/register' || 
                     router.pathname === '/forgot-password';
  
  // Check if user should be redirected to login
  useEffect(() => {
    // If page requires auth and user is not authenticated, redirect to login
    if (authRequired && !isAuthenticated()) {
      router.push('/login');
    }
  }, [authRequired, isAuthenticated, router]);
  
  return (
    <div className={classNames(
      'flex flex-col min-h-screen',
      state === AuthState.AUTHENTICATED ? 'bg-gray-50' : 'bg-white'
    )}>
      {/* Header - consistent navigation across the top */}
      <Header isAuthPage={isAuthPage} />
      
      <div className="flex flex-1">
        {/* Sidebar for desktop view when authenticated */}
        {!isMobileView && state === AuthState.AUTHENTICATED && (
          <Sidebar />
        )}
        
        {/* Main content area */}
        <main className={classNames(
          'flex-1 transition-all duration-200',
          state === AuthState.AUTHENTICATED && !isMobileView ? 'md:ml-64' : '',
          isMobileView && state === AuthState.AUTHENTICATED ? 'pb-16' : '' // Add bottom padding for mobile navigation
        )}>
          <PageContainer className={classNames(
            'py-4 md:py-6',
            isAuthPage ? 'max-w-md mx-auto' : ''
          )}>
            {children}
          </PageContainer>
        </main>
      </div>
      
      {/* Footer */}
      <Footer />
      
      {/* Mobile navigation for small screens when authenticated */}
      {isMobileView && state === AuthState.AUTHENTICATED && (
        <MobileNavigation />
      )}
      
      {/* Toast notifications - integrated with the application-wide notification system */}
      <ToastContainer position="bottom-right" />
    </div>
  );
};