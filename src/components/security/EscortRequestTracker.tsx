'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EscortRequestResponse, EscortRequestStatus } from '@/types/EscortRequest';

interface EscortRequestTrackerProps {
  onRequestClick?: (request: EscortRequestResponse) => void;
  showCreateButton?: boolean;
  onCreateRequest?: () => void;
  onRequestsChange?: (requests: EscortRequestResponse[]) => void;
}

const EscortRequestTracker: React.FC<EscortRequestTrackerProps> = ({
  onRequestClick,
  showCreateButton = true,
  onCreateRequest,
  onRequestsChange,
}) => {
  const [requests, setRequests] = useState<EscortRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EscortRequestStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Monotonically increasing request id so stale responses are ignored
  const requestIdRef = useRef(0);

  // Fetch escort requests
  const fetchRequests = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      const response = await fetch(`/api/security/escort-requests?${params.toString()}`);
      // Ignore responses superseded by a newer request
      if (requestId !== requestIdRef.current) return;
      if (!response.ok) {
        console.error('Escort requests fetch failed', response.status);
        setError(`HTTP error ${response.status}`);
        setRequests([]);
        setLoading(false);
        return;
      }
      const data = await response.json();
      // Re-check after awaiting the JSON body in case a newer request landed
      if (requestId !== requestIdRef.current) return;
      setRequests(data);
      onRequestsChange?.(data);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Error fetching escort requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch escort requests');
    } finally {
      // Only the latest request controls the loading state
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [statusFilter, priorityFilter, onRequestsChange]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[rgba(255,100,100,0.3)] border-t-[rgba(255,100,100,0.8)] rounded-full"
        />
        <span className="ml-3 text-[rgba(var(--mg-text),0.7)]">Loading escort requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-[rgba(var(--mg-error),0.1)] border border-[rgba(var(--mg-error),0.3)] rounded-lg">
        <p className="text-[rgba(var(--mg-error),0.9)]">Error: {error}</p>
        <button
          onClick={fetchRequests}
          className="mt-2 px-4 py-2 bg-[rgba(var(--mg-error),0.2)] border border-[rgba(var(--mg-error),0.4)] rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EscortRequestStatus | 'all')}
            className="mg-input bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(255,100,100,0.3)] rounded px-3 py-1 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="mg-input bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(255,100,100,0.3)] rounded px-3 py-1 text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>

        {showCreateButton && onCreateRequest && (
          <button
            onClick={onCreateRequest}
            className="px-4 py-2 bg-[rgba(255,100,100,0.2)] border border-[rgba(255,100,100,0.6)] text-[rgba(255,100,100,0.9)] rounded hover:bg-[rgba(255,100,100,0.3)] transition-colors text-sm font-quantify tracking-wider"
          >
            NEW REQUEST
          </button>
        )}
      </div>

      {/* Request Count */}
      <div className="text-sm text-[rgba(var(--mg-text),0.6)]">
        {requests.length} escort request{requests.length !== 1 ? 's' : ''} found
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        <AnimatePresence>
          {requests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] border border-[rgba(255,100,100,0.2)] rounded-lg p-4 cursor-pointer hover:border-[rgba(255,100,100,0.4)] transition-all"
              onClick={() => onRequestClick?.(request)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-quantify text-[rgba(255,100,100,0.9)]">
                      Request #{request.id.slice(-8).toUpperCase()}
                    </h3>
                    <div
                      className={`text-xs px-2 py-1 rounded border ${getStatusColor(request.status)}`}
                    >
                      {request.status}
                    </div>
                    <div className={`text-xs font-semibold ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[rgba(var(--mg-text),0.6)]">Requested by:</span>
                      <span className="ml-2 text-[rgba(var(--mg-text),0.9)]">
                        {request.requestedBy}
                      </span>
                    </div>
                    <div>
                      <span className="text-[rgba(var(--mg-text),0.6)]">Route:</span>
                      <span className="ml-2 text-[rgba(var(--mg-text),0.9)]">
                        {request.startLocation} → {request.endLocation}
                      </span>
                    </div>
                    <div>
                      <span className="text-[rgba(var(--mg-text),0.6)]">Ships:</span>
                      <span className="ml-2 text-[rgba(var(--mg-text),0.9)]">
                        {request.shipsToEscort}
                      </span>
                    </div>
                    <div>
                      <span className="text-[rgba(var(--mg-text),0.6)]">Created:</span>
                      <span className="ml-2 text-[rgba(var(--mg-text),0.9)]">
                        {formatDate(request.createdAt)}
                      </span>
                    </div>
                  </div>

                  {request.assignedSecurityOfficer && (
                    <div className="mt-2 text-sm">
                      <span className="text-[rgba(var(--mg-text),0.6)]">Assigned to:</span>
                      <span className="ml-2 text-[rgba(255,100,100,0.8)]">
                        {request.assignedSecurityOfficer}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-xs text-[rgba(var(--mg-text),0.5)]">
                    {request.threatAssessment === 'done'
                      ? '✓ Threat Assessment'
                      : '○ Assessment Needed'}
                  </div>
                  {request.threatLevel && (
                    <div
                      className={`text-xs mt-1 font-semibold ${
                        request.threatLevel === 'Critical'
                          ? 'text-red-400'
                          : request.threatLevel === 'High'
                            ? 'text-orange-400'
                            : request.threatLevel === 'Medium'
                              ? 'text-yellow-400'
                              : 'text-green-400'
                      }`}
                    >
                      {request.threatLevel} Risk
                    </div>
                  )}
                </div>
              </div>

              {/* Asset types requested */}
              {request.assetsRequested.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {request.assetsRequested.map((asset, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 bg-[rgba(255,100,100,0.1)] border border-[rgba(255,100,100,0.3)] rounded text-[rgba(255,100,100,0.8)]"
                    >
                      {asset}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {requests.length === 0 && (
          <div className="text-center py-8 text-[rgba(var(--mg-text),0.6)]">
            No escort requests found matching the current filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default EscortRequestTracker;
