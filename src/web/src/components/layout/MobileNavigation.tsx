import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import classNames from 'classnames';
import { FaHome, FaComment, FaCalendarAlt, FaUser, FaUserFriends } from 'react-icons/fa';

// Import authentication hooks and types
import { useAuth } from '../../hooks/useAuth';
import { AuthState } from '../../lib/types/auth.types';

/**
 * Interface defining the properties for the MobileNavigation component
 */
interface MobileNavigationProps {
  className?: string;
}

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
 * Navigation item component that renders a link with icon and label for the mobile navigation
 */
const NavItem: React.FC<NavItemProps> = ({ href, label, icon, isActive }) => {
  return (
    <Link 
      href={href}
      className={classNames(
        'flex flex-col items-center justify-center py-1 px-2 min-h-[44px] min-w-[64px]',
        'text-xs transition-colors duration-200',
        isActive 
          ? 'text-blue-500 font-medium' 
          : 'text-gray-500 hover:text-blue-400'
      )}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="text-lg mb-1">{icon}</span>
      <span className="text-center">{label}</span>
    </Link>
  );
};

/**
 * Mobile navigation component that displays a bottom navigation bar with icons for primary destinations
 * Adapts based on user's authentication state and provides touch-friendly navigation for small screens
 */
const MobileNavigation: React.FC<MobileNavigationProps> = ({ className }) => {
  const { state } = useAuth();
  const router = useRouter();
  const isAuthenticated = state.state === AuthState.AUTHENTICATED;

  return (
    <nav 
      className={classNames(
        'sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg',
        'flex justify-around items-center h-14 z-50',
        className
      )}
      aria-label="Mobile navigation"
    >
      {isAuthenticated ? (
        // Navigation for authenticated users
        <>
          <NavItem 
            href="/" 
            label="Home" 
            icon={<FaHome />} 
            isActive={router.pathname === '/'} 
          />
          <NavItem 
            href="/chat" 
            label="Chat" 
            icon={<FaComment />} 
            isActive={router.pathname.startsWith('/chat')} 
          />
          <NavItem 
            href="/connect" 
            label="Connect" 
            icon={<FaUserFriends />} 
            isActive={router.pathname.startsWith('/connect')} 
          />
          <NavItem 
            href="/calendar" 
            label="Calendar" 
            icon={<FaCalendarAlt />} 
            isActive={router.pathname.startsWith('/calendar')} 
          />
          <NavItem 
            href="/profile" 
            label="Profile" 
            icon={<FaUser />} 
            isActive={router.pathname.startsWith('/profile')} 
          />
        </>
      ) : (
        // Navigation for unauthenticated users
        <>
          <NavItem 
            href="/login" 
            label="Login" 
            icon={<FaUser />} 
            isActive={router.pathname === '/login'} 
          />
          <NavItem 
            href="/register" 
            label="Register" 
            icon={<FaUserFriends />} 
            isActive={router.pathname === '/register'} 
          />
        </>
      )}
    </nav>
  );
};

export default MobileNavigation;