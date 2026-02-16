'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EscortRequestResponse, EscortRequestStatus, ThreatLevel } from '@/types/EscortRequest';

interface EscortRequestDetailProps {
  request: EscortRequestResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedRequest: EscortRequestResponse) => void;
  onDelete?: (requestId: string) => void;
}

const EscortRequestDetail: React.FC<EscortRequestDetailProps> = ({
  request,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRequest, setEditedRequest] = useState<EscortRequestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  React.useEffect(() => {
    if (request) {
      setEditedRequest({ ...request });
    }
  }, [request]);

  if (!request || !isOpen) return null;

  // Get status color for display
  const getStatusColor = (status: EscortRequestStatus) => {
    switch (status) {
      case 'Submitted':
        return 'border-blue-400 text-blue-400 bg-[rgba(59,130,246,0.1)]';
      case 'Under Review':
        return 'border-yellow-400 text-yellow-400 bg-[rgba(251,191,36,0.1)]';
      case 'Approved':
        return 'border-green-400 text-green-400 bg-[rgba(74,222,128,0.1)]';
      case 'Assigned':
        return 'border-purple-400 text-purple-400 bg-[rgba(167,139,250,0.1)]';
      case 'In Progress':
        return 'border-orange-400 text-orange-400 bg-[rgba(251,146,60,0.1)]';
      case 'Completed':
        return 'border-gray-400 text-gray-400 bg-[rgba(156,163,175,0.1)]';
      case 'Cancelled':
        return 'border-red-400 text-red-400 bg-[rgba(248,113,113,0.1)]';
      case 'Rejected':
        return 'border-red-500 text-red-500 bg-[rgba(239,68,68,0.1)]';
      default:
        return 'border-[rgba(255,100,100,0.5)] text-[rgba(255,100,100,0.8)] bg-[rgba(255,100,100,0.1)]';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low':
        return 'text-green-400';
      case 'Medium':
        return 'text-yellow-400';
      case 'High':
        return 'text-orange-400';
      case 'Urgent':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    }).format(date);
  };

  // Handle save changes
  const handleSave = async () => {
    if (!editedRequest) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/security/escort-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const updatedRequest = await response.json();
      onUpdate?.(updatedRequest);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Error updating escort request:', err);
      setError(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/security/escort-requests?id=${request.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      onDelete?.(request.id);
      onClose();
    } catch (err) {
      console.error('Error deleting escort request:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete request');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleInputChange = (field: keyof EscortRequestResponse, value: any) => {
    if (!editedRequest) return;
    setEditedRequest(prev => prev ? { ...prev, [field]: value } : null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 500 }}
            className="bg-[rgba(var(--mg-panel-dark),0.95)] border border-[rgba(255,100,100,0.4)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-[rgba(255,100,100,0.2)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-quantify text-[rgba(255,100,100,0.9)]">
                  Request #{request.id.slice(-8).toUpperCase()}
                </h2>
                <button
                  onClick={onClose}
                  className="text-[rgba(var(--mg-text),0.6)] hover:text-[rgba(var(--mg-text),0.9)] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className={`text-sm px-3 py-1 rounded border ${getStatusColor(request.status)}`}>
                  {isEditing ? (
                    <select
                      value={editedRequest?.status || request.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="bg-transparent border-none outline-none text-current"
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  ) : (
                    request.status
                  )}
                </div>
                <div className={`text-sm font-semibold ${getPriorityColor(request.priority)}`}>
                  {isEditing ? (
                    <select
                      value={editedRequest?.priority || request.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="bg-[rgba(var(--mg-panel-dark),0.8)] border border-[rgba(255,100,100,0.3)] rounded px-2 py-1 text-current"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  ) : (
                    `${request.priority} Priority`
                  )}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-[rgba(var(--mg-error),0.1)] border border-[rgba(var(--mg-error),0.3)] rounded text-[rgba(var(--mg-error),0.9)] text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-quantify text-[rgba(255,100,100,0.8)] mb-3">Request Details</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-[rgba(var(--mg-text),0.6)]">Requested by:</span>
                      <div className="text-[rgba(var(--mg-text),0.9)]">{request.requestedBy}</div>
                    </div>
                    <div>
                      <span className="text-sm text-[rgba(var(--mg-text),0.6)]">Ships to escort:</span>
                      <div className="text-[rgba(var(--mg-text),0.9)]">{request.shipsToEscort}</div>
                    </div>
                    <div>
                      <span className="text-sm text-[rgba(var(--mg-text),0.6)]">Created:</span>
                      <div className="text-[rgba(var(--mg-text),0.9)]">{formatDate(request.createdAt)}</div>
                    </div>
                    {request.preferredDateTime && (
                      <div>
                        <span className="text-sm text-[rgba(var(--mg-text),0.6)]">Preferred time:</span>
                        <div className="text-[rgba(var(--mg-text),0.9)]">{formatDate(request.preferredDateTime)}</div>
                      </div>
                    )}
                    {request.estimatedDuration && (
                      <div>
                        <span className="text-sm text-[rgba(var(--mg-text),0.6)]">Duration:</span>
                        <div className="text-[rgba(var(--mg-text),0.9)]">{request.estimatedDuration}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-quantify text-[rgba(255,100,100,0.8)] mb-3">Threat Assessment</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-[rgba(var(--mg-text),0.6)]">Assessment status:</span>
                      <div className="text-[rgba(var(--mg-text),0.9)]">
                        {request.threatAssessment === 'done' ? '✓ Completed' : '○ Needed'}
                      </div>
                    </div>
                    {request.threatLevel && (
                      <div>
                        <span className="text-sm text-[rgba(var(--mg-text),0.6)]">Threat level:</span>
                        <div className={`font-semibold ${
                          request.threatLevel === 'Critical' ? 'text-red-400' :
                          request.threatLevel === 'High' ? 'text-orange-400' :
                          request.threatLevel === 'Medium' ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {request.threatLevel}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Route Information */}
              <div>
                <h3 className="text-lg font-quantify text-[rgba(255,100,100,0.8)] mb-3">Route Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm text-[rgba(var(--mg-text),0.6)]">Start location:</span>
                    <div className="text-[rgba(var(--mg-text),0.9)]">{request.startLocation}</div>
                  </div>
                  <div>
                    <span className="text-sm text-[rgba(var(--mg-text),0.6)]">End location:</span>
                    <div className="text-[rgba(var(--mg-text),0.9)]">{request.endLocation}</div>
                  </div>
                  {request.secondaryLocations && (
                    <div className="md:col-span-2">
                      <span className="text-sm text-[rgba(var(--mg-text),0.6)]">Secondary locations:</span>
                      <div className="text-[rgba(var(--mg-text),0.9)]">{request.secondaryLocations}</div>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-sm text-[rgba(var(--mg-text),0.6)]">Planned route:</span>
                  <div className="text-[rgba(var(--mg-text),0.9)] mt-1 p-3 bg-[rgba(var(--mg-panel-light),0.2)] rounded border border-[rgba(255,100,100,0.2)]">
                    {request.plannedRoute}
                  </div>
                </div>
              </div>

              {/* Assets Requested */}
              {request.assetsRequested.length > 0 && (
                <div>
                  <h3 className="text-lg font-quantify text-[rgba(255,100,100,0.8)] mb-3">Requested Assets</h3>
                  <div className="flex flex-wrap gap-2">
                    {request.assetsRequested.map((asset, i) => (
                      <span
                        key={i}
                        className="text-sm px-3 py-1 bg-[rgba(255,100,100,0.1)] border border-[rgba(255,100,100,0.3)] rounded text-[rgba(255,100,100,0.8)]"
                      >
                        {asset}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment Information */}
              {request.assignedSecurityOfficer && (
                <div>
                  <h3 className="text-lg font-quantify text-[rgba(255,100,100,0.8)] mb-3">Assignment</h3>
                  <div>
                    <span className="text-sm text-[rgba(var(--mg-text),0.6)]">Assigned to:</span>
                    <div className="text-[rgba(255,100,100,0.8)] font-semibold">{request.assignedSecurityOfficer}</div>
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              {request.additionalNotes && (
                <div>
                  <h3 className="text-lg font-quantify text-[rgba(255,100,100,0.8)] mb-3">Additional Notes</h3>
                  <div className="text-[rgba(var(--mg-text),0.9)] p-3 bg-[rgba(var(--mg-panel-light),0.2)] rounded border border-[rgba(255,100,100,0.2)]">
                    {request.additionalNotes}
                  </div>
                </div>
              )}

              {/* Completion Notes */}
              {request.completionNotes && (
                <div>
                  <h3 className="text-lg font-quantify text-[rgba(255,100,100,0.8)] mb-3">Completion Notes</h3>
                  <div className="text-[rgba(var(--mg-text),0.9)] p-3 bg-[rgba(var(--mg-panel-light),0.2)] rounded border border-[rgba(255,100,100,0.2)]">
                    {request.completionNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[rgba(255,100,100,0.2)] flex justify-between items-center">
              <div className="text-xs text-[rgba(var(--mg-text),0.5)]">
                Last updated: {formatDate(request.updatedAt)}
              </div>

              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-sm border border-[rgba(var(--mg-text),0.3)] rounded hover:bg-[rgba(var(--mg-text),0.1)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-4 py-2 text-sm bg-[rgba(255,100,100,0.2)] border border-[rgba(255,100,100,0.6)] text-[rgba(255,100,100,0.9)] rounded hover:bg-[rgba(255,100,100,0.3)] transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 text-sm bg-[rgba(var(--mg-error),0.2)] border border-[rgba(var(--mg-error),0.6)] text-[rgba(var(--mg-error),0.9)] rounded hover:bg-[rgba(var(--mg-error),0.3)] transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm bg-[rgba(255,100,100,0.2)] border border-[rgba(255,100,100,0.6)] text-[rgba(255,100,100,0.9)] rounded hover:bg-[rgba(255,100,100,0.3)] transition-colors"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[rgba(var(--mg-panel-dark),0.95)] border border-[rgba(var(--mg-error),0.4)] rounded-lg p-6 max-w-md mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-quantify text-[rgba(var(--mg-error),0.9)] mb-4">Confirm Deletion</h3>
                  <p className="text-[rgba(var(--mg-text),0.8)] mb-6">
                    Are you sure you want to delete this escort request? This action cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 text-sm border border-[rgba(var(--mg-text),0.3)] rounded hover:bg-[rgba(var(--mg-text),0.1)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-4 py-2 text-sm bg-[rgba(var(--mg-error),0.2)] border border-[rgba(var(--mg-error),0.6)] text-[rgba(var(--mg-error),0.9)] rounded hover:bg-[rgba(var(--mg-error),0.3)] transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Deleting...' : 'Delete Request'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EscortRequestDetail; 