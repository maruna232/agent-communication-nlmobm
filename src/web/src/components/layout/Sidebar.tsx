import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import classNames from 'classnames';
import { FaHome, FaComment, FaCalendarAlt, FaUser, FaUserFriends, FaCog } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { AuthState } from '../../lib/types/auth.types';
import { Button } from '../common/Button';

/**
 * Interface defining the properties for the NavItem component
 */
interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
}

/**
 * Interface defining the properties for the Sidebar component
 */
interface SidebarProps {
  className?: string;
}

/**
 * Navigation item component that renders a link with icon and label for the sidebar
 */
const NavItem = ({ href, label, icon, isActive }: NavItemProps): JSX.Element => {
  // Apply styling based on active state
  const itemClasses = classNames(
    'flex items-center w-full px-4 py-3 my-1 rounded-md transition-colors duration-200',
    {
      'bg-blue-100 text-blue-700': isActive,
      'text-gray-700 hover:bg-gray-100': !isActive,
    }
  );

  return (
    <Link 
      href={href} 
      className={itemClasses} 
      aria-label={label} 
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="mr-3 text-lg" aria-hidden="true">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
};

/**
 * Main sidebar component that provides navigation links for desktop view
 */
export const Sidebar = ({ className = '' }: SidebarProps): JSX.Element => {
  // Get authentication state from useAuth hook
  const { state: authState } = useAuth();
  
  // Get current route information from useRouter
  const router = useRouter();

  /**
   * Determine if a route is active
   * For the home route, check exact match, otherwise check if pathname starts with the route
   */
  const isActiveRoute = (path: string): boolean => {
    if (path === '/') {
      return router.pathname === path;
    }
    return router.pathname.startsWith(path);
  };

  return (
    <aside 
      className={classNames(
        'hidden md:flex md:flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-gray-200 p-4',
        className
      )}
      aria-label="Main navigation"
    >
      {/* App Logo/Brand */}
      <div className="flex items-center justify-center mb-8 mt-2">
        <h1 className="text-xl font-bold text-blue-600">AI Agent Network</h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1">
        {authState.state === AuthState.AUTHENTICATED ? (
          // Authenticated user navigation
          <>
            <NavItem
              href="/"
              label="Dashboard"
              icon={<FaHome />}
              isActive={isActiveRoute('/')}
            />
            <NavItem
              href="/agent"
              label="Agent"
              icon={<FaComment />}
              isActive={isActiveRoute('/agent')}
            />
            <NavItem
              href="/connect"
              label="Connect"
              icon={<FaUserFriends />}
              isActive={isActiveRoute('/connect')}
            />
            <NavItem
              href="/calendar"
              label="Calendar"
              icon={<FaCalendarAlt />}
              isActive={isActiveRoute('/calendar')}
            />
            <NavItem
              href="/settings"
              label="Settings"
              icon={<FaCog />}
              isActive={isActiveRoute('/settings')}
            />
          </>
        ) : (
          // Unauthenticated user navigation - show login/register buttons
          <>
            <div className="px-4 py-2 mb-6">
              <Button
                fullWidth
                variant="primary"
                leftIcon={<FaUser />}
                label="Login"
                onClick={() => router.push('/login')}
              />
            </div>
            <div className="px-4 py-2">
              <Button
                fullWidth
                variant="outline"
                leftIcon={<FaUser />}
                label="Register"
                onClick={() => router.push('/register')}
              />
            </div>
          </>
        )}
      </nav>

      {/* User profile section - only shown when authenticated */}
      {authState.state === AuthState.AUTHENTICATED && authState.user && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center p-2">
            {authState.user.photoURL ? (
              <img
                src={authState.user.photoURL}
                alt="Profile"
                className="w-8 h-8 rounded-full mr-2"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2">
                {authState.user.displayName ? authState.user.displayName.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div className="text-sm">
              <p className="font-medium text-gray-700">{authState.user.displayName || "User"}</p>
              <p className="text-gray-500 text-xs truncate">{authState.user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};