import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import classNames from 'classnames';
import { FaBars, FaTimes } from 'react-icons/fa';

import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { AuthState } from '../../lib/types/auth.types';

/**
 * Interface defining the properties for the NavLink component
 */
interface NavLinkProps {
  href: string;
  label: string;
  isActive: boolean;
  className?: string;
}

/**
 * Interface defining the properties for the Header component
 */
interface HeaderProps {
  isAuthPage?: boolean;
  className?: string;
}

/**
 * Navigation link component with active state styling
 */
const NavLink = ({ href, label, isActive, className = '' }: NavLinkProps): JSX.Element => {
  return (
    <Link
      href={href}
      className={classNames(
        'px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-blue-700 text-white'
          : 'text-gray-200 hover:bg-blue-600 hover:text-white',
        className
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
    </Link>
  );
};

/**
 * Main header component that provides navigation, branding, and authentication controls
 */
export const Header = ({ isAuthPage = false, className = '' }: HeaderProps): JSX.Element => {
  const { state, user, logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

  // Track window size for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Set initial width
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
    }

    // Cleanup event listener
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Toggle mobile menu
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, router]);

  // Close mobile menu when changing routes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [router.asPath]);

  // Determine if we should show mobile view
  const isMobileView = windowWidth < 768;

  // Don't show header on auth pages if specified
  if (isAuthPage) {
    return <header className={classNames('h-16', className)} />;
  }

  const isAuthenticated = state === AuthState.AUTHENTICATED;

  return (
    <header className={classNames('bg-blue-800 shadow-md', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center flex-shrink-0 text-white mr-6"
              aria-label="AI Agent Network Home"
            >
              <svg 
                className="h-8 w-8 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M13 10V3L4 14h7v7l9-11h-7z" 
                />
              </svg>
              <span className="font-bold text-xl tracking-tight">AI Agent Network</span>
            </Link>

            {/* Desktop Navigation */}
            {!isMobileView && (
              <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
                {isAuthenticated ? (
                  <>
                    <NavLink
                      href="/dashboard"
                      label="Dashboard"
                      isActive={router.pathname === '/dashboard'}
                    />
                    <NavLink
                      href="/agent"
                      label="Agent"
                      isActive={router.pathname.startsWith('/agent')}
                    />
                    <NavLink
                      href="/connect"
                      label="Connect"
                      isActive={router.pathname.startsWith('/connect')}
                    />
                    <NavLink
                      href="/calendar"
                      label="Calendar"
                      isActive={router.pathname.startsWith('/calendar')}
                    />
                  </>
                ) : (
                  <>
                    <NavLink
                      href="/login"
                      label="Login"
                      isActive={router.pathname === '/login'}
                    />
                    <NavLink
                      href="/register"
                      label="Register"
                      isActive={router.pathname === '/register'}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* User Menu (Desktop) */}
          {!isMobileView && (
            <div className="hidden md:flex md:items-center">
              {isAuthenticated && user ? (
                <div className="flex items-center">
                  <span className="text-white mr-4">{user.displayName}</span>
                  <div className="relative ml-3">
                    <div className="flex">
                      <button
                        className="flex text-sm border-2 border-transparent rounded-full focus:outline-none focus:border-white transition duration-150 ease-in-out"
                        id="user-menu"
                        aria-label="User menu"
                        aria-haspopup="true"
                      >
                        {user.photoURL ? (
                          <img
                            className="h-8 w-8 rounded-full"
                            src={user.photoURL}
                            alt={`${user.displayName}'s profile`}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                            {user.displayName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-white hover:bg-blue-700"
                        onClick={handleLogout}
                        ariaLabel="Sign out"
                      >
                        Sign out
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="border-white text-white hover:bg-blue-700"
                    onClick={() => router.push('/login')}
                  >
                    Sign in
                  </Button>
                  <Button
                    variant="primary"
                    className="bg-white text-blue-800 hover:bg-gray-100"
                    onClick={() => router.push('/register')}
                  >
                    Register
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Mobile menu button */}
          {isMobileView && (
            <div className="flex items-center -mr-2 md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                <span className="sr-only">
                  {isMobileMenuOpen ? 'Close main menu' : 'Open main menu'}
                </span>
                {isMobileMenuOpen ? (
                  <FaTimes className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <FaBars className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {isMobileView && isMobileMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className={classNames(
                    'block px-3 py-2 rounded-md text-base font-medium',
                    router.pathname === '/dashboard'
                      ? 'bg-blue-700 text-white'
                      : 'text-white hover:bg-blue-600'
                  )}
                  aria-current={router.pathname === '/dashboard' ? 'page' : undefined}
                >
                  Dashboard
                </Link>
                <Link
                  href="/agent"
                  className={classNames(
                    'block px-3 py-2 rounded-md text-base font-medium',
                    router.pathname.startsWith('/agent')
                      ? 'bg-blue-700 text-white'
                      : 'text-white hover:bg-blue-600'
                  )}
                  aria-current={router.pathname.startsWith('/agent') ? 'page' : undefined}
                >
                  Agent
                </Link>
                <Link
                  href="/connect"
                  className={classNames(
                    'block px-3 py-2 rounded-md text-base font-medium',
                    router.pathname.startsWith('/connect')
                      ? 'bg-blue-700 text-white'
                      : 'text-white hover:bg-blue-600'
                  )}
                  aria-current={router.pathname.startsWith('/connect') ? 'page' : undefined}
                >
                  Connect
                </Link>
                <Link
                  href="/calendar"
                  className={classNames(
                    'block px-3 py-2 rounded-md text-base font-medium',
                    router.pathname.startsWith('/calendar')
                      ? 'bg-blue-700 text-white'
                      : 'text-white hover:bg-blue-600'
                  )}
                  aria-current={router.pathname.startsWith('/calendar') ? 'page' : undefined}
                >
                  Calendar
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={classNames(
                    'block px-3 py-2 rounded-md text-base font-medium',
                    router.pathname === '/login'
                      ? 'bg-blue-700 text-white'
                      : 'text-white hover:bg-blue-600'
                  )}
                  aria-current={router.pathname === '/login' ? 'page' : undefined}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={classNames(
                    'block px-3 py-2 rounded-md text-base font-medium',
                    router.pathname === '/register'
                      ? 'bg-blue-700 text-white'
                      : 'text-white hover:bg-blue-600'
                  )}
                  aria-current={router.pathname === '/register' ? 'page' : undefined}
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* User profile section in mobile menu */}
          {isAuthenticated && user && (
            <div className="pt-4 pb-3 border-t border-blue-700">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  {user.photoURL ? (
                    <img
                      className="h-10 w-10 rounded-full"
                      src={user.photoURL}
                      alt={`${user.displayName}'s profile`}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      {user.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-white">{user.displayName}</div>
                  <div className="text-sm font-medium text-blue-200">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <Link
                  href="/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-600"
                >
                  Your Profile
                </Link>
                <Link
                  href="/settings"
                  className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-600"
                >
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-600"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};