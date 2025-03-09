import React, { useState, useCallback } from 'react'; // react v18.0+
import classNames from 'classnames'; // ^2.3.2

import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import AgentToAgentConversation from './AgentToAgentConversation';
import { useAgent } from '../../hooks/useAgent';
import {
  AgentApprovalRequest,
  MeetingProposal,
  AgentConversation,
  ApprovalStatus
} from '../../lib/types/agent.types';
import { formatDate } from '../../lib/utils/dateTime';

/**
 * Props interface for the ApprovalModal component
 */
interface ApprovalModalProps {
  approvalRequest: AgentApprovalRequest;
  isOpen: boolean;
  onClose: () => void;
  onResponse: (updatedRequest: AgentApprovalRequest) => void;
}

/**
 * Interface for the modification form state
 */
interface ModificationFormState {
  title: string;
  date: string;
  time: string;
  location: string;
  notes: string;
}

/**
 * Modal component for displaying and responding to agent-negotiated meeting proposals
 */
export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  approvalRequest,
  isOpen,
  onClose,
  onResponse
}) => {
  // Extract agent state and respondToApproval function from useAgent hook
  const { agent, respondToApproval } = useAgent();

  // Set up state for loading status during approval actions
  const [isLoading, setIsLoading] = useState(false);

  // Set up state for modification mode when user wants to edit the proposal
  const [isModification, setIsModification] = useState(false);

  // Extract meeting proposal data from the approval request
  const meetingProposal = approvalRequest?.data as MeetingProposal;

  // Fetch the associated conversation using the conversationId from the approval request
  const conversationId = approvalRequest?.conversationId;

  // Create handler function for approving the proposal
  const handleApprove = useCallback(async () => {
    setIsLoading(true);
    try {
      if (respondToApproval && approvalRequest?.requestId) {
        await respondToApproval(approvalRequest.requestId, ApprovalStatus.APPROVED);
        onResponse({ ...approvalRequest, status: ApprovalStatus.APPROVED });
        onClose();
      }
    } catch (error) {
      console.error('Failed to approve proposal:', error);
    } finally {
      setIsLoading(false);
    }
  }, [approvalRequest, respondToApproval, onClose, onResponse]);

  // Create handler function for rejecting the proposal
  const handleReject = useCallback(async () => {
    setIsLoading(true);
    try {
      if (respondToApproval && approvalRequest?.requestId) {
        await respondToApproval(approvalRequest.requestId, ApprovalStatus.REJECTED);
        onResponse({ ...approvalRequest, status: ApprovalStatus.REJECTED });
        onClose();
      }
    } catch (error) {
      console.error('Failed to reject proposal:', error);
    } finally {
      setIsLoading(false);
    }
  }, [approvalRequest, respondToApproval, onClose, onResponse]);

  // Create handler function for entering modification mode
  const handleModify = useCallback(() => {
    // Set modification state to true
    setIsModification(true);
  }, []);

  // Create handler function for submitting modified proposal
  const handleSubmitModification = useCallback(async () => {
    setIsLoading(true);
    try {
      if (respondToApproval && approvalRequest?.requestId) {
        await respondToApproval(approvalRequest.requestId, ApprovalStatus.MODIFIED, {});
        onResponse({ ...approvalRequest, status: ApprovalStatus.MODIFIED });
        onClose();
      }
    } catch (error) {
      console.error('Failed to submit modification:', error);
    } finally {
      setIsLoading(false);
    }
  }, [approvalRequest, respondToApproval, onClose, onResponse]);

  // Create handler function for canceling modification
  const handleCancelModification = useCallback(() => {
    // Set modification state to false
    setIsModification(false);
  }, []);

  // Render the meeting details
  const renderMeetingDetails = useCallback(() => {
    if (!meetingProposal) return null;

    const formattedDate = formatDate(meetingProposal.startTime, 'EEEE, MMMM d, yyyy');
    const formattedTime = formatDate(meetingProposal.startTime, 'h:mm a') + ' - ' + formatDate(meetingProposal.endTime, 'h:mm a');

    return (
      <div>
        <h3 className="text-lg font-semibold mb-2">{meetingProposal.title}</h3>
        <p className="text-gray-600">Date: {formattedDate}</p>
        <p className="text-gray-600">Time: {formattedTime}</p>
        <p className="text-gray-600">Location: {meetingProposal.location?.name}</p>
      </div>
    );
  }, [meetingProposal]);

  // Render the modification form
  const renderModificationForm = useCallback(() => {
    return (
      <div>
        {/* Add form fields for title, date, time, and location */}
        <Button variant="primary" onClick={handleSubmitModification}>Submit Modification</Button>
        <Button variant="secondary" onClick={handleCancelModification}>Cancel</Button>
      </div>
    );
  }, [handleSubmitModification, handleCancelModification]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Approval Request"
      size="md"
    >
      {meetingProposal && (
        <div>
          {renderMeetingDetails()}
          {agent && conversationId && (
            <AgentToAgentConversation
              conversation={null}
              userAgentId={agent.agentId}
              otherAgentName="Other Agent"
            />
          )}
          <div className="mt-4 flex justify-end">
            {!isModification ? (
              <>
                <Button variant="primary" onClick={handleApprove} disabled={isLoading}>
                  {isLoading ? 'Approving...' : 'Approve'}
                </Button>
                <Button variant="secondary" onClick={handleModify} disabled={isLoading}>
                  Modify
                </Button>
                <Button variant="danger" onClick={handleReject} disabled={isLoading}>
                  {isLoading ? 'Rejecting...' : 'Reject'}
                </Button>
              </>
            ) : (
              renderModificationForm()
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};