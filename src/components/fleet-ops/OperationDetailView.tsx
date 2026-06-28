'use client';

import React, { useState } from 'react';
import { Session } from 'next-auth';
import { OperationResponse, OperationStatus } from '@/types/Operation';
import { MobiGlasButton } from '@/components/ui/mobiglas';
import { formatDate as formatDateSafe } from '@/lib/utils/formatDate';

// Returns the link as a safe href only when it is a well-formed http(s) URL;
// otherwise returns null so the caller renders it as plain text.
const getSafeHttpUrl = (link: string): string | null => {
  try {
    const url = new URL(link);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};

interface OperationDetailViewProps {
  operation: OperationResponse;
  session: Session;
  onBack: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
}

const OperationDetailView: React.FC<OperationDetailViewProps> = ({
  operation,
  session,
  onBack,
  onEdit,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<OperationStatus>(operation.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has leadership role
  const isLeadership =
    (session?.user?.role && ['Director', 'Manager', 'Board Member'].includes(session.user.role)) ||
    (session?.user?.clearanceLevel && session.user.clearanceLevel >= 3);

  // Check if user is the operation leader
  const isLeader = operation.leaderId === session?.user?.id;

  // Check if user can modify this operation
  const canModify = isLeadership || isLeader;

  // Format date for display (falls back to a label on invalid dates)
  const formatDate = (dateString: string) =>
    formatDateSafe(dateString, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // Handle status change
  const handleStatusChange = async () => {
    if (newStatus === operation.status) {
      setIsChangingStatus(false);
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setError(null);

      const response = await fetch(`/api/fleet-ops/operations/${operation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      // Update successful, refresh the operation data
      const updatedOperation = await response.json();

      // Close the status change UI
      setIsChangingStatus(false);

      // Go back to the list and refresh operations
      onBack();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle delete operation
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      const response = await fetch(`/api/fleet-ops/operations/${operation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete operation');
      }

      // Delete successful, call onDelete to update UI
      onDelete(operation.id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete operation');
      setIsDeleting(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning':
        return 'bg-blue-600/20 text-blue-400';
      case 'Briefing':
        return 'bg-purple-600/20 text-purple-400';
      case 'Active':
        return 'bg-green-600/20 text-green-400';
      case 'Completed':
        return 'bg-teal-600/20 text-teal-400';
      case 'Debriefing':
        return 'bg-orange-600/20 text-orange-400';
      case 'Cancelled':
        return 'bg-red-600/20 text-red-400';
      default:
        return 'bg-gray-600/20 text-gray-400';
    }
  };

  return (
    <div>
      {/* Header with back button and actions */}
      <div className="flex justify-between items-center mb-6">
        <MobiGlasButton
          variant="secondary"
          onClick={onBack}
          leftIcon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          }
        >
          Back
        </MobiGlasButton>

        {canModify && (
          <div className="flex gap-2">
            <MobiGlasButton
              variant="secondary"
              onClick={() => setIsChangingStatus(!isChangingStatus)}
            >
              Change Status
            </MobiGlasButton>
            <MobiGlasButton variant="primary" onClick={onEdit}>
              Edit Operation
            </MobiGlasButton>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mg-panel-error p-4 mb-6">
          <p className="mg-text-error">{error}</p>
        </div>
      )}

      {/* Status change UI */}
      {isChangingStatus && (
        <div className="mg-panel p-4 mb-6">
          <h3 className="mg-subtitle mb-2">Change Operation Status</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <select
              className="mg-input"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OperationStatus)}
              disabled={isUpdatingStatus}
            >
              <option value="Planning">Planning</option>
              <option value="Briefing">Briefing</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Debriefing">Debriefing</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <div className="flex gap-2">
              <MobiGlasButton
                variant="primary"
                onClick={handleStatusChange}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Updating...' : 'Update Status'}
              </MobiGlasButton>
              <MobiGlasButton
                variant="secondary"
                onClick={() => setIsChangingStatus(false)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </MobiGlasButton>
            </div>
          </div>
        </div>
      )}

      {/* Operation header */}
      <div className="mg-panel p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="mg-title text-2xl mb-1">{operation.name}</h1>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(operation.status)}`}>
                {operation.status}
              </span>
              <span className="mg-text-secondary text-sm">
                Led by {operation.leaderName || 'Unknown'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="mg-text-secondary text-sm">Scheduled for</div>
            <div className="mg-text">{formatDate(operation.plannedDateTime)}</div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="mg-subtitle mb-1">Description</h3>
          <p className="mg-text">{operation.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="mg-subtitle mb-1">Location</h3>
            <p className="mg-text">{operation.location}</p>
          </div>
          <div>
            <h3 className="mg-subtitle mb-1">Communications</h3>
            <p className="mg-text">{operation.commsChannel || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {/* Objectives */}
      <div className="mg-panel p-6 mb-6">
        <h2 className="mg-subtitle text-xl mb-3">Objectives</h2>
        <div className="mg-text whitespace-pre-wrap">{operation.objectives}</div>
      </div>

      {/* Participants */}
      <div className="mg-panel p-6 mb-6">
        <h2 className="mg-subtitle text-xl mb-3">Participants ({operation.participants.length})</h2>
        {operation.participants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full mg-table">
              <thead>
                <tr>
                  <th>Operative</th>
                  <th>Role</th>
                  <th>Ship</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {operation.participants.map((participant, index) => (
                  <tr key={`${participant.userId}-${index}`}>
                    <td>{participant.userId}</td>
                    <td>{participant.role}</td>
                    <td>
                      {participant.shipName ? (
                        <span>
                          {participant.shipManufacturer} {participant.shipName}
                        </span>
                      ) : (
                        <span className="mg-text-secondary">Not assigned</span>
                      )}
                    </td>
                    <td>{participant.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mg-text-secondary">No participants assigned to this operation.</p>
        )}
      </div>

      {/* Diagrams */}
      {operation.diagramLinks.length > 0 && (
        <div className="mg-panel p-6 mb-6">
          <h2 className="mg-subtitle text-xl mb-3">Operation Diagrams</h2>
          <ul className="list-disc pl-5">
            {operation.diagramLinks.map((link, index) => {
              const safeHref = getSafeHttpUrl(link);
              return (
                <li key={index} className="mb-1">
                  {safeHref ? (
                    <a
                      href={safeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mg-link"
                    >
                      {link}
                    </a>
                  ) : (
                    <span className="mg-text-secondary break-all">{link}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Delete operation (only for leaders/admins) */}
      {canModify && (
        <div className="mg-panel p-6 border border-red-800/30 bg-red-900/10">
          <h2 className="mg-subtitle text-xl mb-3 text-red-400">Danger Zone</h2>
          <p className="mg-text-secondary mb-4">
            Deleting an operation cannot be undone. All data associated with this operation will be
            permanently removed.
          </p>
          {isDeleting ? (
            <div>
              <p className="mg-text-error mb-2">Are you sure you want to delete this operation?</p>
              <div className="flex gap-2">
                <MobiGlasButton variant="danger" onClick={handleDelete}>
                  Yes, Delete Operation
                </MobiGlasButton>
                <MobiGlasButton variant="secondary" onClick={() => setIsDeleting(false)}>
                  Cancel
                </MobiGlasButton>
              </div>
            </div>
          ) : (
            <MobiGlasButton variant="danger" onClick={() => setIsDeleting(true)}>
              Delete Operation
            </MobiGlasButton>
          )}
        </div>
      )}
    </div>
  );
};

export default OperationDetailView;
