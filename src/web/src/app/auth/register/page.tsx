'use client';

import React, { useEffect } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { RegisterForm } from '../../../components/auth/RegisterForm';
import { useAuth } from '../../../hooks/useAuth';
import { Card } from '../../../components/common/Card';

// Define metadata for the registration page
// Note: In Next.js 14, metadata should be exported from a server component.
// This is included to match the specified exports in the requirements,
// but it won't be used by Next.js since this is a client component.
export const metadata: Metadata = {
  title: 'Register - AI Agent Network',
  description: 'Create your AI Agent Network account to set up your personal AI assistant',
};

// Main registration page component
export default function RegisterPage() {
  const { isAuthenticated } = useAuth();

  // Redirect if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        window.location.href = '/dashboard';
      }
    };
    
    checkAuth();
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900">
          AI Agent Network
        </h1>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Set up your personal AI assistant with privacy-first technology
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="px-4 py-8 sm:px-10">
          <RegisterForm />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}