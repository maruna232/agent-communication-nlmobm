import React, { useState, useCallback } from 'react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { FormField } from '../common/FormField';
import { useForm } from '../../hooks/useForm';
import { useNotifications } from '../../hooks/useNotifications';
import { validateEmail } from '../../lib/utils/validation';

interface InviteFriendsProps {
  className?: string;
}

/**
 * Creates a unique invitation link for sharing
 * 
 * @returns Invitation link URL with a randomized code
 */
function createInvitationLink(): string {
  const baseUrl = window.location.origin;
  // Generate a unique invitation code - in a real app, this would be tied to the user's account
  const invitationCode = `invite-${Math.random().toString(36).substring(2, 10)}`;
  return `${baseUrl}/invite/${invitationCode}`;
}

/**
 * Sends an invitation email to the provided address
 * 
 * @param email Email address to send invitation to
 * @returns Promise resolving to success status
 */
async function sendInvitation(email: string): Promise<boolean> {
  // In a production environment, this would make an API call
  // For this implementation, we'll simulate a successful response
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate success - in production would check API response
      resolve(true);
    }, 500);
  });
}

/**
 * Component that allows users to invite friends to the AI Agent Network platform
 * by email or by sharing an invitation link.
 */
export const InviteFriends: React.FC<InviteFriendsProps> = ({ className }) => {
  // State for invitation link and copy status
  const [invitationLink, setInvitationLink] = useState<string>(createInvitationLink());
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  
  // Get notification function for showing success/error messages
  const { addNotification } = useNotifications();
  
  // Create validation schema for the email field
  const validationSchema = {
    email: (value: string) => {
      if (!value) return 'Email is required';
      if (!validateEmail(value)) return 'Please enter a valid email address';
      return null;
    }
  };
  
  // Initialize form with useForm hook
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm
  } = useForm(
    { email: '' },
    validationSchema,
    { 
      onSubmit: async (formValues) => {
        try {
          const success = await sendInvitation(formValues.email);
          
          if (success) {
            addNotification({
              type: 'success',
              title: 'Invitation Sent',
              message: `An invitation has been sent to ${formValues.email}`
            });
            resetForm();
          } else {
            addNotification({
              type: 'error',
              title: 'Invitation Failed',
              message: 'Unable to send invitation. Please try again.'
            });
          }
        } catch (error) {
          addNotification({
            type: 'error',
            title: 'Invitation Failed',
            message: 'An error occurred while sending the invitation.'
          });
        }
      }
    }
  );
  
  // Handle copying the invitation link to clipboard
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(invitationLink)
      .then(() => {
        setLinkCopied(true);
        
        addNotification({
          type: 'success',
          title: 'Link Copied',
          message: 'Invitation link copied to clipboard'
        });
        
        // Reset copied state after 2 seconds
        setTimeout(() => {
          setLinkCopied(false);
        }, 2000);
      })
      .catch(() => {
        addNotification({
          type: 'error',
          title: 'Copy Failed',
          message: 'Unable to copy link to clipboard'
        });
      });
  }, [invitationLink, addNotification]);
  
  return (
    <Card
      title="Invite Friends"
      className={className}
    >
      <div className="space-y-6">
        {/* Email invitation form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            type="email"
            name="email"
            label="Email address"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            touched={touched.email}
            placeholder="friend@example.com"
            required
          />
          <Button 
            type="submit" 
            variant="primary"
          >
            Invite
          </Button>
        </form>
        
        {/* Invitation link section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Or share this invitation link:</p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={invitationLink}
              readOnly
              className="flex-1 p-2 border border-gray-300 rounded-md text-sm bg-gray-50"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
            >
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default InviteFriends;