import React, { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { LoginForm } from '../../../components/auth/LoginForm';
import { useAuth } from '../../../hooks/useAuth';
import { Card } from '../../../components/common/Card';

export const metadata: Metadata = {
  title: 'Login - AI Agent Network',
  description: 'Log in to your AI Agent Network account to manage your personal AI assistant'
};

export default function LoginPage(): JSX.Element {
  const { isAuthenticated } = useAuth();
  
  // Check if user is already authenticated, redirect to dashboard if they are
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        redirect('/dashboard');
      }
    };
    
    checkAuth();
  }, [isAuthenticated]);
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">AI Agent Network</h1>
        </div>
        
        <Card className="p-6">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
              <svg
                className="h-8 w-8 text-blue-600"
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
                  d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          
          <h2 className="mt-4 text-center text-xl font-medium text-gray-900">
            Welcome to AI Agent Network
          </h2>
          
          <div className="mt-6">
            <LoginForm onSuccess={() => redirect('/dashboard')} />
          </div>
        </Card>
        
        <div className="text-center text-sm text-gray-500">
          <p>Privacy-focused platform: Your data stays on your device</p>
        </div>
      </div>
    </div>
  );
}