import React, { useState, useCallback, useEffect } from 'react'; // react v18.0+
import classNames from 'classnames'; // ^2.3.2

import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ApprovalModal } from '../agent/ApprovalModal';
import { useAgent } from '../../hooks/useAgent';
import { useCalendar } from '../../hooks/useCalendar';
import {
  AgentApprovalRequest,
  ApprovalType,
  ApprovalStatus,
  MeetingProposal,
} from '../../lib/types/agent.types';
import { formatDate, formatTimeRange } from '../../lib/utils/dateTime';

/**
 * Props interface for the PendingApprovals component
 */
interface PendingApprovalsProps {
  maxItems?: number;
  className?: string;
  onApprovalResponse?: (request: AgentApprovalRequest) => void;
}

/**
 * Component that displays pending approval requests for calendar events and meeting proposals
 */
export const PendingApprovals: React.FC<PendingApprovalsProps> = ({
  maxItems = 3,
  className = '',
  onApprovalResponse,
}) => {
  // LD1: Destructure props to get maxItems and className
  // LD1: Get approval requests from useAgent hook
  const { approvalRequests } = useAgent();
  // LD1: Get calendar events from useCalendar hook
  const { events } = useCalendar();

  // LD1: Filter approval requests to only show pending ones
  const pendingApprovals = approvalRequests?.filter(
    (request) => request.status === ApprovalStatus.PENDING
  );

  // LD1: Filter approval requests to only show calendar-related ones (MEETING_PROPOSAL and CALENDAR_EVENT types)
  const calendarApprovals = pendingApprovals?.filter(
    (request) =>
      request.type === ApprovalType.MEETING_PROPOSAL ||
      request.type === ApprovalType.CALENDAR_EVENT
  );

  // LD1: Sort approval requests by creation date (newest first)
  const sortedApprovals = calendarApprovals?.sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  // LD1: Limit the number of displayed items based on maxItems prop
  const limitedApprovals = sortedApprovals?.slice(0, maxItems);

  // LD1: Set up state for the selected approval request
  const [selectedRequest, setSelectedRequest] = useState<AgentApprovalRequest | null>(null);
  // LD1: Set up state for the approval modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // LD1: Create handler for opening the approval modal
  const handleOpenModal = useCallback((request: AgentApprovalRequest) => {
    // LD1: Set the selected approval request state
    setSelectedRequest(request);
    // LD1: Set the modal visibility state to true
    setIsModalOpen(true);
  }, []);

  // LD1: Create handler for closing the approval modal
  const handleCloseModal = useCallback(() => {
    // LD1: Set the modal visibility state to false
    setIsModalOpen(false);
    // LD1: Clear the selected approval request state
    setSelectedRequest(null);
  }, []);

  // LD1: Create handler for responding to approval requests
  const handleApprovalResponse = useCallback((updatedRequest: AgentApprovalRequest) => {
    // LD1: Close the modal
    handleCloseModal();
    // LD1: If onApprovalResponse prop is provided, call it with the updated request
    onApprovalResponse?.(updatedRequest);
  }, [handleCloseModal, onApprovalResponse]);

  // LD1: Render a single approval request item
  const renderApprovalItem = useCallback((request: AgentApprovalRequest) => {
    // LD1: Extract meeting proposal data from the request
    const meetingProposal = getMeetingProposalFromRequest(request);

    // LD1: Format the date and time for display
    const formattedDate = meetingProposal ? formatDate(meetingProposal.startTime, 'MMM d, yyyy') : '';
    const formattedTime = meetingProposal ? formatTimeRange(meetingProposal.startTime, meetingProposal.endTime) : '';

    // LD1: Determine the meeting type (in-person, video call, etc.)
    const meetingType = meetingProposal ? meetingProposal.title : 'Request';

    return (
      <div
        key={request.requestId}
        className="mb-2 last:mb-0"
      >
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-800">{meetingType}</h4>
            <p className="text-xs text-gray-500">
              {formattedDate} - {formattedTime}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenModal(request)}
          >
            View Details
          </Button>
        </div>
      </div>
    );
  }, [handleOpenModal]);

  // LD1: Return the complete component structure
  return (
    <>
      <Card title="Pending Approvals" className={className}>
        {limitedApprovals && limitedApprovals.length > 0 ? (
          limitedApprovals.map((request) => renderApprovalItem(request))
        ) : (
          <div className="text-center text-gray-500 py-4">
            No pending approvals
          </div>
        )}
      </Card>

      {selectedRequest && (
        <ApprovalModal
          approvalRequest={selectedRequest}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onResponse={handleApprovalResponse}
        />
      )}
    </>
  );
};

/**
 * LD1: Extracts the meeting proposal data from an approval request
 * @param request The approval request
 * @returns The meeting proposal data or null if not available
 */
const getMeetingProposalFromRequest = (request: AgentApprovalRequest): MeetingProposal | null => {
  // LD1: Check if the request type is MEETING_PROPOSAL
  if (request.type === ApprovalType.MEETING_PROPOSAL) {
    // LD1: If it is, cast the request data to MeetingProposal type
    return request.data as MeetingProposal;
  }
  // LD1: If not a meeting proposal, return null
  return null;
};