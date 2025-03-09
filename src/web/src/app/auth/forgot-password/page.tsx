# src/web/src/app/auth/forgot-password/page.tsx
```typescript
import React from 'react'; // Core React library for component creation
import { useRouter } from 'next/navigation'; // Next.js hook for programmatic navigation after successful password reset request
import { Metadata } from 'next'; // Next.js type for page metadata
import { ForgotPasswordForm } from '../../../components/auth/ForgotPasswordForm'; // Form component for requesting password reset
import { PageContainer } from '../../../components/layout/PageContainer'; // Container component for consistent page layout
import { Card } from '../../../components/common/Card'; // Container component for the forgot password form

/**
 * Metadata configuration for the forgot password page
 * @returns {Metadata} Page metadata object
 */
export const metadata: Metadata = {
  title: 'Forgot Password | AI Agent Network', // Define title as 'Forgot Password | AI Agent Network'
  description: 'Request a password reset for your AI Agent Network account.', // Define description for SEO purposes
};

/**
 * Forgot password page component that renders the password reset request UI
 * @returns {JSX.Element} Rendered forgot password page component
 */
const ForgotPasswordPage: React.FC = () => {
  const router = useRouter(); // Initialize router for navigation after successful password reset request

  /**
   * Navigates to the login page with a success message
   */
  const handleSuccess = () => { // Create handleSuccess function to navigate to login page with success message
    router.push('/auth/login?reset=success');
  };

  /**
   * Navigates back to the login page
   */
  const handleCancel = () => { // Create handleCancel function to navigate back to login page
    router.push('/auth/login');
  };

  return (
    <PageContainer maxWidth="md" className="flex items-center justify-center h-screen"> // Render PageContainer with appropriate styling and maxWidth
      <Card variant="outlined" padding="md" className="w-full max-w-md"> // Render Card component containing the forgot password form
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Forgot Password</h1> {/* Render application logo/branding */}
          <p className="text-gray-600 mt-2">Enter your email to reset your password.</p> {/* Render page title and description */}
        </div>
        <ForgotPasswordForm onSuccess={handleSuccess} onCancel={handleCancel} /> {/* Render ForgotPasswordForm component with success and cancel callbacks */}
        <div className="text-center mt-4">
          <a href="/auth/login" className="text-blue-600 hover:underline"> {/* Render link to return to login page */}
            Back to Login
          </a>
        </div>
      </Card>
    </PageContainer>
  );
};

export default ForgotPasswordPage; // Export the ForgotPasswordPage component as the default export for the route