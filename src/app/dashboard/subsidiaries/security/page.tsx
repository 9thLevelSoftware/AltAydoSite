'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { EscortRequestResponse, SecurityAssetType, ThreatLevel } from '@/types/EscortRequest';
import EscortRequestTracker from '@/components/security/EscortRequestTracker';
import EscortRequestDetail from '@/components/security/EscortRequestDetail';

interface EscortFormData {
  requestedBy: string;
  threatAssessment: 'done' | 'needed';
  threatLevel?: ThreatLevel;
  shipsToEscort: number;
  startLocation: string;
  endLocation: string;
  secondaryLocations: string;
  plannedRoute: string;
  assetsRequested: SecurityAssetType[];
  additionalNotes: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  estimatedDuration?: string;
  preferredDateTime?: string;
}

interface MidnightRank {
  midnightRank: string;
  aydoEquivalent: string;
  employeeLevel: string;
  track: string;
}

export default function MidnightSecurityPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'overview' | 'escort' | 'requests' | 'training' | 'calendar' | 'organization'>('overview');
  const [escortForm, setEscortForm] = useState<EscortFormData>({
    requestedBy: session?.user?.name || '',
    threatAssessment: 'needed',
    threatLevel: undefined,
    shipsToEscort: 1,
    startLocation: '',
    endLocation: '',
    secondaryLocations: '',
    plannedRoute: '',
    assetsRequested: [],
    additionalNotes: '',
    priority: 'Medium',
    estimatedDuration: '',
    preferredDateTime: ''
  });
  const [expandedTrainingDoc, setExpandedTrainingDoc] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<EscortRequestResponse | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [requests, setRequests] = useState<EscortRequestResponse[]>([]);

  // Check if user has access to training docs (Leadership roles only for now)
  const hasTrainingAccess = session?.user?.role && ['Director', 'Manager', 'Board Member'].includes(session.user.role);

  // Midnight Security ranks structure
  const midnightRanks: MidnightRank[] = [
    // Gunnery Track
    { midnightRank: 'Gunnery Trainee', aydoEquivalent: 'Trainee', employeeLevel: 'Employee 1', track: 'Gunnery' },
    { midnightRank: 'Gunner', aydoEquivalent: 'Standard Hire', employeeLevel: 'Employee 2', track: 'Gunnery' },
    { midnightRank: 'Experienced Gunner', aydoEquivalent: 'Experienced Hire', employeeLevel: 'Employee 3', track: 'Gunnery' },
    { midnightRank: 'Seasoned Gunner', aydoEquivalent: 'Seasoned Hire', employeeLevel: 'Senior Employee 1', track: 'Gunnery' },
    { midnightRank: 'Veteran Gunner', aydoEquivalent: 'Veteran Hire', employeeLevel: 'Senior Employee 2', track: 'Gunnery' },
    { midnightRank: 'Gunnery Lead', aydoEquivalent: 'Team Lead', employeeLevel: 'Senior Employee 3', track: 'Gunnery' },
    { midnightRank: 'Gunnery Manager', aydoEquivalent: 'Unit Leader', employeeLevel: 'Manager 1', track: 'Gunnery' },
    
    // Engineering Track
    { midnightRank: 'Engineer Trainee', aydoEquivalent: 'Trainee', employeeLevel: 'Employee 1', track: 'Engineering' },
    { midnightRank: 'Engineer', aydoEquivalent: 'Standard Hire', employeeLevel: 'Employee 2', track: 'Engineering' },
    { midnightRank: 'Experienced Engineer', aydoEquivalent: 'Experienced Hire', employeeLevel: 'Employee 3', track: 'Engineering' },
    { midnightRank: 'Seasoned Engineer', aydoEquivalent: 'Seasoned Hire', employeeLevel: 'Senior Employee 1', track: 'Engineering' },
    { midnightRank: 'Veteran Engineer', aydoEquivalent: 'Veteran Hire', employeeLevel: 'Senior Employee 2', track: 'Engineering' },
    { midnightRank: 'Engineering Lead', aydoEquivalent: 'Team Lead', employeeLevel: 'Senior Employee 3', track: 'Engineering' },
    { midnightRank: 'Engineering Manager', aydoEquivalent: 'Unit Leader', employeeLevel: 'Manager 1', track: 'Engineering' },
    
    // Marine Track
    { midnightRank: 'Marine Trainee', aydoEquivalent: 'Trainee', employeeLevel: 'Employee 1', track: 'Marine' },
    { midnightRank: 'Marine', aydoEquivalent: 'Standard Hire', employeeLevel: 'Employee 2', track: 'Marine' },
    { midnightRank: 'Experienced Marine', aydoEquivalent: 'Experienced Hire', employeeLevel: 'Employee 3', track: 'Marine' },
    { midnightRank: 'Seasoned Marine', aydoEquivalent: 'Seasoned Hire', employeeLevel: 'Senior Employee 1', track: 'Marine' },
    { midnightRank: 'Veteran Marine', aydoEquivalent: 'Veteran Hire', employeeLevel: 'Senior Employee 2', track: 'Marine' },
    { midnightRank: 'Team Lead', aydoEquivalent: 'Team Lead', employeeLevel: 'Senior Employee 3', track: 'Marine' },
    { midnightRank: 'Squad Lead', aydoEquivalent: 'Unit Leader', employeeLevel: 'Manager 1', track: 'Marine' },
    
    // Pilot Track
    { midnightRank: 'Pilot', aydoEquivalent: 'Experienced Hire', employeeLevel: 'Employee 3', track: 'Pilot' },
    { midnightRank: 'Seasoned Pilot', aydoEquivalent: 'Seasoned Hire', employeeLevel: 'Senior Employee 1', track: 'Pilot' },
    { midnightRank: 'Element Lead', aydoEquivalent: 'Veteran Hire', employeeLevel: 'Senior Employee 2', track: 'Pilot' },
    { midnightRank: 'Flight Lead', aydoEquivalent: 'Team Lead', employeeLevel: 'Senior Employee 3', track: 'Pilot' },
    { midnightRank: 'Head Pilot', aydoEquivalent: 'Unit Leader', employeeLevel: 'Manager 1', track: 'Pilot' },
    
    // Leadership
    { midnightRank: 'Assistant Director', aydoEquivalent: 'Vice Director', employeeLevel: 'Manager 2', track: 'Leadership' },
    { midnightRank: 'Director', aydoEquivalent: 'Director', employeeLevel: 'Manager 3', track: 'Leadership' }
  ];

  const handleEscortSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const response = await fetch('/api/security/escort-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(escortForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const newRequest = await response.json();
      setSubmitMessage(`Escort request submitted successfully! Request ID: #${newRequest.id.slice(-8).toUpperCase()}`);
      
      // Reset form
      setEscortForm({
        requestedBy: session?.user?.name || '',
        threatAssessment: 'needed',
        threatLevel: undefined,
        shipsToEscort: 1,
        startLocation: '',
        endLocation: '',
        secondaryLocations: '',
        plannedRoute: '',
        assetsRequested: [],
        additionalNotes: '',
        priority: 'Medium',
        estimatedDuration: '',
        preferredDateTime: ''
      });

      // Switch to requests tab to show the new request
      setTimeout(() => {
        setActiveTab('requests');
      }, 2000);

    } catch (error) {
      console.error('Error submitting escort request:', error);
      setSubmitMessage(`Error: ${error instanceof Error ? error.message : 'Failed to submit request'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof EscortFormData, value: any) => {
    setEscortForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAssetToggle = (asset: SecurityAssetType) => {
    setEscortForm(prev => ({
      ...prev,
      assetsRequested: prev.assetsRequested.includes(asset)
        ? prev.assetsRequested.filter(a => a !== asset)
        : [...prev.assetsRequested, asset]
    }));
  };

  const handleRequestClick = (request: EscortRequestResponse) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const handleCreateNewRequest = () => {
    setActiveTab('escort');
  };

  const handleRequestUpdate = (updatedRequest: EscortRequestResponse) => {
    setRequests(prev => prev.map(req => req.id === updatedRequest.id ? updatedRequest : req));
    setSelectedRequest(updatedRequest);
  };

  const handleRequestDelete = (requestId: string) => {
    setRequests(prev => prev.filter(req => req.id !== requestId));
    setSelectedRequest(null);
    setShowDetailModal(false);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedRequest(null);
  };

  return (
    <div className="min-h-screen bg-black bg-opacity-95 p-6 relative">
      {/* Holographic background effects */}
      <div className="absolute inset-0 bg-holo-grid bg-[length:50px_50px] opacity-5 pointer-events-none"></div>
      <div className="hexagon-bg absolute inset-0 opacity-5 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/subsidiaries" className="inline-flex items-center text-sm text-[rgba(var(--mg-text),0.7)] hover:text-[rgba(var(--mg-primary),0.9)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Subsidiaries
          </Link>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-center"
        >
          <div className="h-16 w-16 relative mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[rgba(255,100,100,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="mg-title text-2xl sm:text-3xl lg:text-4xl mb-2">Midnight Security</h1>
            <div className="text-[rgba(255,100,100,0.8)] font-quantify">&ldquo;Protecting Assets, Ensuring Future.&rdquo;</div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-wrap gap-2 sm:gap-4">
            {[
              { id: 'overview' as const, label: 'Overview' },
              { id: 'escort' as const, label: 'New Request' },
              { id: 'requests' as const, label: 'Track Requests' },
              { id: 'training' as const, label: 'Training Docs' },
              { id: 'calendar' as const, label: 'Event Calendar' },
              { id: 'organization' as const, label: 'Organization Chart' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-sm border transition-all font-quantify tracking-wider text-sm ${
                  activeTab === tab.id
                    ? 'bg-[rgba(255,100,100,0.2)] border-[rgba(255,100,100,0.6)] text-[rgba(255,100,100,0.9)]'
                    : 'bg-[rgba(var(--mg-panel-dark),0.4)] border-[rgba(255,100,100,0.2)] text-[rgba(var(--mg-text),0.7)] hover:border-[rgba(255,100,100,0.4)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,100,100,0.6)] to-transparent"></div>
              
              <h2 className="mg-subtitle text-xl mb-6">Mission Statement</h2>
              <p className="mg-text mb-6">
                Midnight Security is AydoCorp&apos;s elite security division, dedicated to protecting corporate assets, personnel, and operations throughout the galaxy. We provide comprehensive security services including convoy escort, threat assessment, and emergency response capabilities.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="mg-subtitle text-lg mb-4">Core Services</h3>
                  <ul className="space-y-2">
                    {[
                      'Convoy Escort Operations',
                      'Asset Protection',
                      'Threat Assessment & Intelligence',
                      'Emergency Response',
                      'Personnel Security',
                      'Installation Defense'
                    ].map((service, i) => (
                      <li key={i} className="flex items-center">
                        <div className="w-2 h-2 bg-[rgba(255,100,100,0.8)] rounded-full mr-3"></div>
                        <span className="text-sm">{service}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="mg-subtitle text-lg mb-4">Fleet Assets</h3>
                  <p className="mg-text text-sm">
                    Our fleet includes specialized combat vessels optimized for escort and defense operations: Redeemer gunships, Cutlass Black patrol craft, Vanguard Sentinel interceptors, and Gladius fighters.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Escort Request Tab */}
        {activeTab === 'escort' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,100,100,0.6)] to-transparent"></div>
              
              <h2 className="mg-subtitle text-xl mb-4">Submit New Escort Request</h2>
              <p className="text-sm text-[rgba(var(--mg-text),0.7)] mb-6">
                For Aydo Intergalactic Corporation employees only. Complete this form to request security escort services.
              </p>

              {submitMessage && (
                <div className={`p-4 rounded-lg mb-6 ${
                  submitMessage.includes('Error') 
                    ? 'bg-[rgba(var(--mg-error),0.1)] border border-[rgba(var(--mg-error),0.3)] text-[rgba(var(--mg-error),0.9)]'
                    : 'bg-[rgba(var(--mg-success),0.1)] border border-[rgba(var(--mg-success),0.3)] text-[rgba(var(--mg-success),0.9)]'
                }`}>
                  {submitMessage}
                </div>
              )}

              <form onSubmit={handleEscortSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="security-requested-by" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Requested By</label>
                    <input
                      type="text"
                      id="security-requested-by"
                      value={escortForm.requestedBy}
                      aria-required={true}
                      onChange={(e) => handleInputChange('requestedBy', e.target.value)}
                      className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(255,100,100,0.3)]"
                      placeholder="Your username"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="security-priority" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Priority Level</label>
                    <select
                      id="security-priority"
                      value={escortForm.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(255,100,100,0.3)]"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="security-ships-count" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Ships to be Escorted</label>
                    <input
                      type="number"
                      id="security-ships-count"
                      value={escortForm.shipsToEscort}
                      aria-required={true}
                      onChange={(e) => handleInputChange('shipsToEscort', parseInt(e.target.value))}
                      className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(255,100,100,0.3)]"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label id="security-threat-label" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Threat Assessment</label>
                  <div className="flex gap-4 mb-2" role="radiogroup" aria-labelledby="security-threat-label">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="threatAssessment"
                        value="done"
                        checked={escortForm.threatAssessment === 'done'}
                        onChange={(e) => handleInputChange('threatAssessment', e.target.value)}
                        className="mr-2"
                      />
                      Already completed
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="threatAssessment"
                        value="needed"
                        checked={escortForm.threatAssessment === 'needed'}
                        onChange={(e) => handleInputChange('threatAssessment', e.target.value)}
                        className="mr-2"
                      />
                      Midnight Security to provide
                    </label>
                  </div>
                  {escortForm.threatAssessment === 'done' && (
                    <select
                      id="security-threat-level"
                      aria-label="Threat Level"
                      value={escortForm.threatLevel || ''}
                      onChange={(e) => handleInputChange('threatLevel', e.target.value)}
                      className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(255,100,100,0.3)]"
                    >
                      <option value="">Select threat level</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="security-start-location" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Escort Start Location</label>
                    <input
                      type="text"
                      id="security-start-location"
                      value={escortForm.startLocation}
                      aria-required={true}
                      onChange={(e) => handleInputChange('startLocation', e.target.value)}
                      className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(255,100,100,0.3)]"
                      placeholder="e.g., Port Olisar, Stanton System"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="security-end-location" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Escort End Location</label>
                    <input
                      type="text"
                      id="security-end-location"
                      value={escortForm.endLocation}
                      aria-required={true}
                      onChange={(e) => handleInputChange('endLocation', e.target.value)}
                      className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(255,100,100,0.3)]"
                      placeholder="e.g., Lorville, Hurston"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="security-secondary-locations" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Secondary Locations</label>
                  <input
                    type="text"
                    id="security-secondary-locations"
                    value={escortForm.secondaryLocations}
                    onChange={(e) => handleInputChange('secondaryLocations', e.target.value)}
                    className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(255,100,100,0.3)]"
                    placeholder="Any intermediate stops or waypoints"
                  />
                </div>

                <div>
                  <label htmlFor="security-planned-route" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Planned Route</label>
                  <textarea
                    id="security-planned-route"
                    value={escortForm.plannedRoute}
                    aria-required={true}
                    onChange={(e) => handleInputChange('plannedRoute', e.target.value)}
                    className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(255,100,100,0.3)]"
                    rows={3}
                    placeholder="Describe your planned route and any specific requirements"
                    required
                  />
                  <p className="text-xs text-[rgba(var(--mg-text),0.5)] mt-2">
                    <strong>Disclaimer:</strong> Midnight Security reserves the right to alter the planned route as needed for security, rearm, repair, or refueling purposes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="security-duration" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Estimated Duration</label>
                    <input
                      type="text"
                      id="security-duration"
                      value={escortForm.estimatedDuration}
                      onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                      className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(255,100,100,0.3)]"
                      placeholder="e.g., 2 hours, 1 day"
                    />
                  </div>

                  <div>
                    <label htmlFor="security-datetime" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Preferred Date/Time</label>
                    <input
                      type="datetime-local"
                      id="security-datetime"
                      value={escortForm.preferredDateTime}
                      onChange={(e) => handleInputChange('preferredDateTime', e.target.value)}
                      className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(255,100,100,0.3)]"
                    />
                  </div>
                </div>

                <div>
                  <label id="security-assets-label" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Assets Requested</label>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="security-assets-label">
                    {[
                      'Escort Ships Only',
                      'Ground Security Only', 
                      'On Ship Security Only',
                      'Combined Operations'
                    ].map((asset) => (
                      <label key={asset} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={escortForm.assetsRequested.includes(asset as SecurityAssetType)}
                          onChange={() => handleAssetToggle(asset as SecurityAssetType)}
                          className="mr-2"
                        />
                        <span className="text-sm">{asset}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="security-notes" className="block text-sm mb-2 text-[rgba(var(--mg-text),0.7)]">Additional Notes</label>
                  <textarea
                    id="security-notes"
                    value={escortForm.additionalNotes}
                    onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                    className="w-full mg-input bg-[rgba(var(--mg-panel-light),0.3)] border border-[rgba(255,100,100,0.3)]"
                    rows={3}
                    placeholder="Any additional information or special requirements"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`mg-button px-6 py-2 bg-[rgba(255,100,100,0.2)] border border-[rgba(255,100,100,0.6)] text-[rgba(255,100,100,0.9)] hover:bg-[rgba(255,100,100,0.3)] transition-colors ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Escort Request'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* Track Requests Tab */}
        {activeTab === 'requests' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,100,100,0.6)] to-transparent"></div>
              
              <h2 className="mg-subtitle text-xl mb-6">Escort Request Tracking</h2>
              <p className="text-sm text-[rgba(var(--mg-text),0.7)] mb-6">
                Track and manage your escort requests. Click on any request to view detailed information.
              </p>

              <EscortRequestTracker 
                onRequestClick={handleRequestClick}
                onCreateRequest={handleCreateNewRequest}
                onRequestsChange={setRequests}
              />

              {/* Escort Request Detail Modal */}
              <EscortRequestDetail
                request={selectedRequest}
                isOpen={showDetailModal}
                onClose={handleCloseDetailModal}
                onUpdate={handleRequestUpdate}
                onDelete={handleRequestDelete}
              />
            </div>
          </motion.div>
        )}

        {/* Training Docs Tab */}
        {activeTab === 'training' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {!hasTrainingAccess ? (
              <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,100,100,0.6)] to-transparent"></div>
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-[rgba(255,100,100,0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h2 className="mg-subtitle text-xl mb-2">Restricted Access</h2>
                  <p className="text-[rgba(var(--mg-text),0.7)]">
                    Training documentation is restricted to Midnight Security personnel only.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Rules of Engagement */}
                <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,100,100,0.6)] to-transparent"></div>
                  <button
                    onClick={() => setExpandedTrainingDoc(expandedTrainingDoc === 'roe' ? null : 'roe')}
                    className="w-full text-left flex items-center justify-between"
                  >
                    <h2 className="mg-subtitle text-xl">Rules of Engagement & Escalation of Force</h2>
                    <svg className={`w-5 h-5 transition-transform ${expandedTrainingDoc === 'roe' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {expandedTrainingDoc === 'roe' && (
                    <div className="mt-6 space-y-4 text-sm">
                      <div>
                        <h3 className="font-quantify text-base mb-2 text-[rgba(255,100,100,0.8)]">PURPOSE</h3>
                        <p>To establish protocols for identifying and engaging potential threats to AydoCorp assets. These rules are to be followed on AydoCorp official operations.</p>
                      </div>
                      
                      <div>
                        <h3 className="font-quantify text-base mb-2 text-[rgba(255,100,100,0.8)]">ESCALATION OF FORCE (IN FLIGHT)</h3>
                        <p className="mb-2 text-[rgba(var(--mg-warning),0.8)]">
                          <strong>Note:</strong> If at any point during this escalation the target engages any AydoCorp assets, skip directly to &quot;Engage the Target&quot;.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 ml-4">
                          <li><strong>Communicate the Threat:</strong> Upon spotting a potential threat, communicate ship type, last 4 of serial number, and clock direction to wingmates.</li>
                          <li><strong>Scan the Target:</strong> Scan the target for name identification.</li>
                          <li><strong>Monitor the Target:</strong> Keep an eye on the target&apos;s movements.</li>
                          <li><strong>Fight or Flight:</strong> The #1 pilot determines if combat assets are sufficient to defeat the target. If not, assess threat and initiate retreat as needed.</li>
                          <li><strong>Hail the Target:</strong> If movements show aggression or bring them too close, attempt to hail or use Global Chat to advise course diversion.</li>
                          <li><strong>Show of Force:</strong> If target fails to respond or refuses to divert, initiate show of force by moving fighter wing into diamond formation with target in center.</li>
                          <li><strong>Warning Shot:</strong> If target continues to fail to respond, the #4 pilot fires a warning shot above the target.</li>
                          <li><strong>Engage the Target:</strong> If all attempts fail, at pilot #1&apos;s command, engage and destroy the target using proper formation.</li>
                        </ol>
                      </div>
                      
                      <div>
                        <h3 className="font-quantify text-base mb-2 text-[rgba(255,100,100,0.8)]">RULES OF ENGAGEMENT</h3>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Midnight Security and AydoCorp personnel are not to initiate combat unless in defense after proper Escalation of Force.</li>
                          <li>Unless authorized by Midnight Security combat lead, AydoExpress or Empyrion Industries personnel are prohibited from engaging in combat.</li>
                          <li>Non-combatants are not to be engaged except under specific circumstances.</li>
                          <li>Non-combatants can become hostile if they become armed or directly engage AydoCorp assets.</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Standard Fighter Flight */}
                <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,100,100,0.6)] to-transparent"></div>
                  <button
                    onClick={() => setExpandedTrainingDoc(expandedTrainingDoc === 'flight' ? null : 'flight')}
                    className="w-full text-left flex items-center justify-between"
                  >
                    <h2 className="mg-subtitle text-xl">Standard Fighter Flight Operations</h2>
                    <svg className={`w-5 h-5 transition-transform ${expandedTrainingDoc === 'flight' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {expandedTrainingDoc === 'flight' && (
                    <div className="mt-6 space-y-4 text-sm">
                      <div>
                        <h3 className="font-quantify text-base mb-2 text-[rgba(255,100,100,0.8)]">COMPOSITION</h3>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li><strong>Ship Composition:</strong> 4 Fighters, preferably of the same type (e.g., 4 Gladius, 4 Super Hornet Mk II)</li>
                          <li><strong>Personnel:</strong> 2 Elements of 2 pilots each</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-quantify text-base mb-2 text-[rgba(255,100,100,0.8)]">ROLES</h3>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li><strong>Pilot #1:</strong> Lead pilot for the Flight and lead pilot of Element #1</li>
                          <li><strong>Pilot #2:</strong> Wingman for Pilot #1</li>
                          <li><strong>Pilot #3:</strong> Lead pilot for Element #2</li>
                          <li><strong>Pilot #4:</strong> Wingman for Pilot #3</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-quantify text-base mb-2 text-[rgba(255,100,100,0.8)]">TACTICS</h3>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-quantify text-sm mb-1 text-[rgba(255,100,100,0.7)]">Diamond Formation</h4>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Standard flight formation for movement, escort missions, and Escalation of Force procedures</li>
                              <li>When flying as flight only: 50-100 meters apart</li>
                              <li>When escorting: 50-100 meters from escorted vessel in designated positions (fore, aft, port, starboard)</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-quantify text-sm mb-1 text-[rgba(255,100,100,0.7)]">Element Formation</h4>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Used only in combat scenarios at Flight Lead discretion</li>
                              <li>Pilots #1 and #3 are Element Leads - designate targets and serve as primary combatants</li>
                              <li>Pilots #2 and #4 fly behind their Element Lead at no greater than 1km distance</li>
                              <li>Wingmen cover and clear their Element Lead&apos;s blind spots</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Event Calendar Tab */}
        {activeTab === 'calendar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,100,100,0.6)] to-transparent"></div>
              
              <h2 className="mg-subtitle text-xl mb-6">Midnight Security Event Calendar</h2>
              
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-[rgba(255,100,100,0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="mg-subtitle text-lg mb-2">Calendar Integration Coming Soon</h3>
                <p className="text-[rgba(var(--mg-text),0.7)] mb-4">
                  This section will display scheduled events including:
                </p>
                <ul className="text-sm space-y-1 text-[rgba(var(--mg-text),0.6)]">
                  <li>• Official AIC Operations</li>
                  <li>• Midnight Security Training Operations</li>
                  <li>• Cross-Division Requests</li>
                  <li>• Approved Escort Requests</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Organization Chart Tab */}
        {activeTab === 'organization' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="mg-panel bg-[rgba(var(--mg-panel-dark),0.4)] p-6 rounded-sm relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgba(255,100,100,0.6)] to-transparent"></div>
              
              <h2 className="mg-subtitle text-xl mb-6">Midnight Security Organization Chart</h2>
              
              <div className="space-y-8">
                {/* Leadership */}
                <div>
                  <h3 className="mg-subtitle text-lg mb-4 text-[rgba(255,100,100,0.8)]">Leadership</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {midnightRanks.filter(rank => rank.track === 'Leadership').map((rank, index) => (
                      <div key={index} className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(255,100,100,0.2)] rounded-sm p-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-quantify text-sm text-[rgba(255,100,100,0.9)]">{rank.midnightRank}</h4>
                          <span className="text-xs text-[rgba(var(--mg-text),0.6)]">{rank.employeeLevel}</span>
                        </div>
                        <p className="text-xs text-[rgba(var(--mg-text),0.7)] mt-1">
                          Equivalent: {rank.aydoEquivalent}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Career Tracks */}
                {['Pilot', 'Gunnery', 'Engineering', 'Marine'].map((track) => (
                  <div key={track}>
                    <h3 className="mg-subtitle text-lg mb-4 text-[rgba(255,100,100,0.8)]">{track} Track</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {midnightRanks.filter(rank => rank.track === track).map((rank, index) => (
                        <div key={index} className="bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(255,100,100,0.2)] rounded-sm p-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-quantify text-sm text-[rgba(255,100,100,0.9)]">{rank.midnightRank}</h4>
                            <span className="text-xs text-[rgba(var(--mg-text),0.6)]">{rank.employeeLevel}</span>
                          </div>
                          <p className="text-xs text-[rgba(var(--mg-text),0.7)] mt-1">
                            Equivalent: {rank.aydoEquivalent}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        
        <div className="mt-8 text-center text-xs text-[rgba(var(--mg-text),0.6)]">
          AYDO INTERGALACTIC CORPORATION - MIDNIGHT SECURITY
        </div>
      </div>
    </div>
  );
} 