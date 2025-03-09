import React, { useEffect } from 'react'; // ^18.0.0
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // ^14.0.0

// Internal imports
import { AppShell } from '../components/layout/AppShell';
import { ToastContainer } from '../components/common/Toast';
import { useAuthStore } from '../store/authStore';
import '../styles/globals.css'; // Import global styles including TailwindCSS and custom styles

// Define the Inter font with appropriate subsets
const inter = Inter({ subsets: ['latin'] });

// Interface defining the properties for the RootLayout component
interface RootLayoutProps {
  children: React.ReactNode;
}

// Metadata for the application used by Next.js for SEO and document head
export const metadata: Metadata = {
  title: 'AI Agent Network',
  description: 'A lightweight, privacy-focused platform for creating AI assistants.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

/**
 * Root layout component that wraps all pages in the application
 * @param props - The children to render within the layout
 * @returns Rendered layout with children content
 */
export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  // Access authentication store to initialize auth state
  const initializeAuth = useAuthStore((state) => state.initialize);

  // Initialize authentication state on component mount using useEffect
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Render the HTML document structure with lang attribute
  return (
    <html lang="en">
      {/* Apply the Inter font to the body element */}
      <body className={inter.className}>
        {/* Wrap the application content in the AppShell component */}
        <AppShell authRequired={false}>
          {/* Render children components (page content) within the layout */}
          {children}
        </AppShell>

        {/* Include ToastContainer for application-wide notifications */}
        <ToastContainer position="bottom-right" />
      </body>
    </html>
  );
}