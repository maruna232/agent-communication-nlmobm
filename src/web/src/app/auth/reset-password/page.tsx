'use client';

import React, { useEffect } from 'react';
import { useSearchParams, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '../../../components/auth/ResetPasswordForm';
import { useAuth } from '../../../hooks/useAuth';
import { Card } from '../../../components/common/Card';

// Define metadata for the page
export const metadata: Metadata = {
  title: 'Reset Password - AI Agent Network',
  description: 'Reset your password for the AI Agent Network to regain access to your personal AI assistant',
};

// Reset Password page component
export default function ResetPasswordPage(): JSX.Element {
  // Get the token from URL search parameters
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  // Get authentication state to check if user is already authenticated
  const { isAuthenticated } = useAuth();
  
  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      redirect('/dashboard');
    }
    
    // If no token is provided, redirect to login page
    if (!token) {
      redirect('/auth/login');
    }
  }, [isAuthenticated, token]);
  
  // Handle successful password reset
  const handleResetSuccess = () => {
    // Redirect to login page after successful reset
    redirect('/auth/login?reset=success');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset Your Password
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your new password below to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card padding="lg">
          <ResetPasswordForm 
            token={token || ''} 
            onSuccess={handleResetSuccess} 
          />
          
          <div className="mt-4 text-center">
            <a 
              href="/auth/login" 
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Remember your password? Sign in
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}