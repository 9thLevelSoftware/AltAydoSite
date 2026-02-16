'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { MobiGlasPanel } from '@/components/ui/mobiglas';
import MobiGlasButton from '../ui/mobiglas/MobiGlasButton';
import {
  PlannedMission,
  PlannedMissionValidationErrors,
  MissionLeader,
  MissionShip,
  LEADERSHIP_ROLES,
} from '@/types/PlannedMission';
import { MissionTemplate, ActivityType, OperationType } from '@/types/MissionTemplate';
import { LOCATION_OPTIONS } from '@/data/StarCitizenLocations';
import MissionShipPickerModal from '@/components/ships/MissionShipPickerModal';
import { shipDocumentToMissionShip } from '@/lib/ships/mappers';
import type { ShipDocument } from '@/types/ship';

// Icons
const SpaceIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
  </svg>
);

const GroundIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h18M3 12l4-4m-4 4l4 4M21 12l-4-4m4 4l-4 4" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v18" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const RocketIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);

const ShipIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

// Activity icons
const ACTIVITY_ICONS: Record<ActivityType, JSX.Element> = {
  'Mining': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  'Salvage': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  'Escort': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  'Transport': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  'Medical': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  'Combat': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
};

const ACTIVITIES: ActivityType[] = ['Mining', 'Salvage', 'Escort', 'Transport', 'Medical', 'Combat'];

interface Leader {
  id: string;
  aydoHandle: string;
  discordName?: string;
  discordId?: string;
  position?: string;
  division?: string;
  clearanceLevel: number;
  photo?: string;
}

interface MissionPlannerFormProps {
  formData: Partial<PlannedMission>;
  errors: PlannedMissionValidationErrors;
  isLoading: boolean;
  isEditing: boolean;
  templates: MissionTemplate[];
  onInputChange: (field: keyof PlannedMission, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onPublishToDiscord?: () => void;
}

// Helper to format ISO date string to datetime-local input format (in local timezone)
function formatDateTimeForInput(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    // Format as YYYY-MM-DDTHH:mm in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

const MissionPlannerForm: React.FC<MissionPlannerFormProps> = ({
  formData,
  errors,
  isLoading,
  isEditing,
  templates,
  onInputChange,
  onSave,
  onCancel,
  onPublishToDiscord
}) => {
  const [showShipDropdown, setShowShipDropdown] = useState(false);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);

  // Check if a template is selected
  const hasTemplate = Boolean(formData.templateId);

  // Fetch leaders on mount
  useEffect(() => {
    async function fetchLeaders() {
      try {
        const res = await fetch('/api/users/leaders');
        if (res.ok) {
          const data = await res.json();
          setLeaders(data.leaders || []);
        }
      } catch (error) {
        console.error('Error fetching leaders:', error);
      } finally {
        setLoadingLeaders(false);
      }
    }
    fetchLeaders();
  }, []);

  // Initialize ships array if empty
  useEffect(() => {
    if (!formData.ships) {
      onInputChange('ships', []);
    }
  }, []);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onInputChange('templateId', template.id);
      onInputChange('templateName', template.name);
      onInputChange('operationType', template.operationType);
      onInputChange('primaryActivity', template.primaryActivity);
      onInputChange('secondaryActivity', template.secondaryActivity);
      onInputChange('tertiaryActivity', template.tertiaryActivity);
      onInputChange('equipmentNotes', template.requiredEquipment);
    }
  };

  // Clear template selection
  const clearTemplate = () => {
    onInputChange('templateId', undefined);
    onInputChange('templateName', undefined);
  };

  // Add ships to roster (supports multiple ships from dynamic ship picker)
  const addShips = (newShips: ShipDocument[]) => {
    const currentShips = [...(formData.ships || [])];

    for (const ship of newShips) {
      const existingIndex = currentShips.findIndex(s => s.shipName === ship.name);

      if (existingIndex >= 0) {
        currentShips[existingIndex] = {
          ...currentShips[existingIndex],
          quantity: currentShips[existingIndex].quantity + 1
        };
      } else {
        currentShips.push(shipDocumentToMissionShip(ship));
      }
    }

    onInputChange('ships', currentShips);
  };

  // Get existing ship names for the picker
  const existingShipNames = useMemo(() =>
    (formData.ships || []).map(s => s.shipName),
    [formData.ships]
  );

  // Remove ship from roster
  const removeShip = (shipIndex: number) => {
    const ships = (formData.ships || []).filter((_, i) => i !== shipIndex);
    onInputChange('ships', ships);
  };

  // Update ship quantity
  const updateShipQuantity = (shipIndex: number, quantity: number) => {
    if (quantity < 1) return;
    const ships = [...(formData.ships || [])];
    ships[shipIndex] = { ...ships[shipIndex], quantity };
    onInputChange('ships', ships);
  };

  // Update ship notes
  const updateShipNotes = (shipIndex: number, notes: string) => {
    const ships = [...(formData.ships || [])];
    ships[shipIndex] = { ...ships[shipIndex], notes };
    onInputChange('ships', ships);
  };

  // Calculate total ships count (quantity-based since crew data comes from API)
  const totalShips = useMemo(() => {
    return (formData.ships || []).reduce((total, ship) => total + ship.quantity, 0);
  }, [formData.ships]);

  // Add leader
  const addLeader = () => {
    const newLeaders = [...(formData.leaders || [])];
    newLeaders.push({
      userId: '',
      aydoHandle: '',
      role: 'Mission Commander'
    });
    onInputChange('leaders', newLeaders);
  };

  // Update leader
  const updateLeader = (index: number, field: keyof MissionLeader, value: string) => {
    const newLeaders = [...(formData.leaders || [])];

    if (field === 'userId') {
      const leader = leaders.find(l => l.id === value);
      if (leader) {
        newLeaders[index] = {
          ...newLeaders[index],
          userId: leader.id,
          aydoHandle: leader.aydoHandle,
          discordId: leader.discordId || undefined
        };
      }
    } else {
      newLeaders[index] = { ...newLeaders[index], [field]: value };
    }

    onInputChange('leaders', newLeaders);
  };

  // Remove leader
  const removeLeader = (index: number) => {
    const newLeaders = formData.leaders?.filter((_, i) => i !== index) || [];
    onInputChange('leaders', newLeaders);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <MobiGlasPanel
        title={isEditing ? 'Edit Mission' : 'Plan New Mission'}
        rightContent={
          <MobiGlasButton
            onClick={onCancel}
            variant="secondary"
            size="sm"
          >
            Back to List
          </MobiGlasButton>
        }
      >
        {isEditing && formData.name && (
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[rgba(var(--mg-primary),0.2)]">
            <span className="px-2 py-1 rounded text-xs font-medium bg-[rgba(var(--mg-secondary),0.2)] text-[rgba(var(--mg-secondary),1)]">
              EDITING
            </span>
            <span className="text-[rgba(var(--mg-text),0.9)] font-medium">{formData.name}</span>
          </div>
        )}
        <div className="text-[rgba(var(--mg-text),0.7)]">
          {isEditing
            ? 'Update the mission details below. Changes will be saved when you click "Update Mission".'
            : 'Create a detailed mission plan by selecting specific ships from the compendium, assigning leaders, and setting the mission details. Publish to Discord when ready.'
          }
        </div>
      </MobiGlasPanel>

      {/* Template Selection - REQUIRED */}
      <MobiGlasPanel
        title="Mission Template *"
        rightContent={
          hasTemplate && (
            <button
              onClick={clearTemplate}
              className="text-xs text-[rgba(var(--mg-text),0.5)] hover:text-[rgba(var(--mg-danger),0.8)] transition-colors"
            >
              Change Template
            </button>
          )
        }
      >
        {!hasTemplate ? (
          <>
            <div className="text-[rgba(var(--mg-text),0.6)] text-sm mb-4">
              Select a template to define the operation type and activities for this mission.
            </div>
            {templates.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {templates.map(template => (
                  <motion.button
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTemplateSelect(template.id)}
                    className="p-4 rounded border text-left transition-all border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.3)] hover:border-[rgba(var(--mg-primary),0.5)] hover:bg-[rgba(var(--mg-primary),0.05)]"
                  >
                    <div className="text-sm font-medium text-[rgba(var(--mg-text),0.9)] truncate">
                      {template.name}
                    </div>
                    <div className="text-xs text-[rgba(var(--mg-primary),0.8)] mt-1">
                      {template.operationType}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),0.9)]">
                        {template.primaryActivity}
                      </span>
                      {template.secondaryActivity && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(var(--mg-secondary),0.2)] text-[rgba(var(--mg-secondary),0.9)]">
                          {template.secondaryActivity}
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[rgba(var(--mg-text),0.5)] border border-dashed border-[rgba(var(--mg-primary),0.2)] rounded-lg">
                <div>No templates available.</div>
                <div className="text-xs mt-2">Create a mission template first to define operation types and activities.</div>
              </div>
            )}
          </>
        ) : (
          // Show selected template info
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded bg-[rgba(var(--mg-primary),0.1)] border border-[rgba(var(--mg-primary),0.3)]">
              <div className="flex-1">
                <div className="text-base font-medium text-[rgba(var(--mg-primary),1)]">
                  {formData.templateName}
                </div>
              </div>
            </div>

            {/* Show operation type and activities as read-only info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded bg-[rgba(var(--mg-panel-dark),0.3)]">
                <div className="text-xs text-[rgba(var(--mg-text),0.5)] mb-1">OPERATION TYPE</div>
                <div className="flex items-center gap-2 text-sm text-[rgba(var(--mg-text),0.9)]">
                  {formData.operationType === 'Space Operations' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h18" />
                    </svg>
                  )}
                  <span>{formData.operationType}</span>
                </div>
              </div>
              <div className="p-3 rounded bg-[rgba(var(--mg-panel-dark),0.3)]">
                <div className="text-xs text-[rgba(var(--mg-text),0.5)] mb-1">PRIMARY</div>
                <div className="flex items-center gap-2 text-sm text-[rgba(var(--mg-primary),0.9)]">
                  {formData.primaryActivity && ACTIVITY_ICONS[formData.primaryActivity]}
                  <span>{formData.primaryActivity}</span>
                </div>
              </div>
              {formData.secondaryActivity && (
                <div className="p-3 rounded bg-[rgba(var(--mg-panel-dark),0.3)]">
                  <div className="text-xs text-[rgba(var(--mg-text),0.5)] mb-1">SECONDARY</div>
                  <div className="flex items-center gap-2 text-sm text-[rgba(var(--mg-secondary),0.9)]">
                    {ACTIVITY_ICONS[formData.secondaryActivity]}
                    <span>{formData.secondaryActivity}</span>
                  </div>
                </div>
              )}
              {formData.tertiaryActivity && (
                <div className="p-3 rounded bg-[rgba(var(--mg-panel-dark),0.3)]">
                  <div className="text-xs text-[rgba(var(--mg-text),0.5)] mb-1">TERTIARY</div>
                  <div className="flex items-center gap-2 text-sm text-[rgba(var(--mg-text),0.7)]">
                    {ACTIVITY_ICONS[formData.tertiaryActivity]}
                    <span>{formData.tertiaryActivity}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </MobiGlasPanel>

      {/* Basic Info */}
      <MobiGlasPanel title="Mission Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mission Name */}
          <div className="md:col-span-2">
            <label htmlFor="mission-name" className="mg-subtitle block mb-2">MISSION NAME *</label>
            <input
              type="text"
              id="mission-name"
              value={formData.name || ''}
              onChange={(e) => onInputChange('name', e.target.value)}
              className={`mg-input w-full text-lg ${errors.name ? 'border-[rgba(var(--mg-danger),0.5)]' : ''}`}
              placeholder="Operation Thunderstrike"
              maxLength={100}
              aria-required={true}
            />
            {errors.name && (
              <div className="text-[rgba(var(--mg-danger),0.8)] text-sm mt-1">{errors.name}</div>
            )}
          </div>

          {/* Date/Time */}
          <div>
            <label htmlFor="mission-datetime" className="mg-subtitle block mb-2">SCHEDULED DATE & TIME *</label>
            <input
              type="datetime-local"
              id="mission-datetime"
              value={formData.scheduledDateTime ? formatDateTimeForInput(formData.scheduledDateTime) : ''}
              aria-required={true}
              onChange={(e) => {
                // Store the datetime-local value directly, converting to ISO only when needed
                // This prevents timezone shifting during editing
                if (e.target.value) {
                  // Create date from local input and convert to ISO
                  const localDate = new Date(e.target.value);
                  onInputChange('scheduledDateTime', localDate.toISOString());
                } else {
                  onInputChange('scheduledDateTime', '');
                }
              }}
              className={`mg-input w-full ${errors.scheduledDateTime ? 'border-[rgba(var(--mg-danger),0.5)]' : ''}`}
            />
            {errors.scheduledDateTime && (
              <div className="text-[rgba(var(--mg-danger),0.8)] text-sm mt-1">{errors.scheduledDateTime}</div>
            )}
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="mission-duration" className="mg-subtitle block mb-2">ESTIMATED DURATION</label>
            <select
              id="mission-duration"
              value={formData.duration || ''}
              onChange={(e) => onInputChange('duration', e.target.value ? parseInt(e.target.value) : undefined)}
              className="mg-input w-full"
            >
              <option value="">Not specified</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
              <option value="240">4 hours</option>
              <option value="360">6 hours</option>
            </select>
          </div>

          {/* Location */}
          <div className="md:col-span-2">
            <label htmlFor="mission-location" className="mg-subtitle block mb-2">LOCATION / SYSTEM</label>
            <select
              id="mission-location"
              value={formData.location || ''}
              onChange={(e) => onInputChange('location', e.target.value)}
              className="mg-input w-full"
            >
              <option value="">Select location...</option>
              {LOCATION_OPTIONS.map(loc => (
                <option key={loc.value} value={loc.value}>{loc.label}</option>
              ))}
            </select>
          </div>
        </div>
      </MobiGlasPanel>

      {/* Leadership */}
      <MobiGlasPanel
        title="Leadership"
        rightContent={
          <MobiGlasButton
            onClick={addLeader}
            variant="primary"
            size="sm"
            leftIcon={<PlusIcon />}
          >
            Add Leader
          </MobiGlasButton>
        }
      >
        <div className="space-y-4">
          <div className="text-[rgba(var(--mg-text),0.6)] text-sm">
            Assign unit leaders for this mission
          </div>

          {formData.leaders && formData.leaders.length > 0 ? (
            <div className="space-y-3">
              {formData.leaders.map((leader, index) => (
                <motion.div
                  key={index}
                  className="border border-[rgba(var(--mg-primary),0.2)] rounded p-4 bg-[rgba(var(--mg-panel-dark),0.3)]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label htmlFor={`mission-leader-role-${index}`} className="mg-subtitle block mb-1 text-xs">ROLE</label>
                      <select
                        id={`mission-leader-role-${index}`}
                        value={leader.role}
                        onChange={(e) => updateLeader(index, 'role', e.target.value)}
                        className="mg-input w-full text-sm"
                      >
                        {LEADERSHIP_ROLES.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`mission-leader-user-${index}`} className="mg-subtitle block mb-1 text-xs">LEADER</label>
                      <select
                        id={`mission-leader-user-${index}`}
                        value={leader.userId}
                        onChange={(e) => updateLeader(index, 'userId', e.target.value)}
                        className="mg-input w-full text-sm"
                        disabled={loadingLeaders}
                      >
                        <option value="">Select Leader...</option>
                        {leaders.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.aydoHandle} {l.position ? `(${l.position})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <button
                        onClick={() => removeLeader(index)}
                        className="mg-btn-icon text-[rgba(var(--mg-danger),0.8)] hover:text-[rgba(var(--mg-danger),1)]"
                        title="Remove Leader"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-[rgba(var(--mg-text),0.5)]">
              No leaders assigned. Click &quot;Add Leader&quot; to assign mission leadership.
            </div>
          )}
        </div>
      </MobiGlasPanel>

      {/* Ship Roster */}
      <MobiGlasPanel
        title="Ship Roster"
        rightContent={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[rgba(var(--mg-text),0.7)]">
              <ShipIcon />
              <span>Ships: <strong className="text-[rgba(var(--mg-primary),1)]">{totalShips}</strong></span>
            </div>
            <div>
              <MobiGlasButton
                onClick={() => setShowShipDropdown(!showShipDropdown)}
                variant="primary"
                size="sm"
                leftIcon={<PlusIcon />}
              >
                Add Ship
              </MobiGlasButton>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-[rgba(var(--mg-text),0.6)] text-sm">
            Select the specific ships for this mission from the compendium
          </div>

          {/* Ship Cards Grid */}
          {formData.ships && formData.ships.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {formData.ships.map((ship, shipIndex) => (
                <motion.div
                  key={`${ship.shipName}-${shipIndex}`}
                  className="relative rounded-lg border border-[rgba(var(--mg-primary),0.3)] bg-[rgba(var(--mg-panel-dark),0.4)] overflow-hidden"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  layout
                >
                  {/* Ship Image */}
                  <div className="aspect-video relative">
                    {ship.image ? (
                      <Image
                        src={ship.image}
                        alt={ship.shipName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-[rgba(var(--mg-panel-dark),0.6)] border border-[rgba(var(--mg-primary),0.15)] rounded">
                        <span className="text-xs text-[rgba(var(--mg-primary),0.3)]">No image</span>
                      </div>
                    )}
                    {/* Quantity Controls */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-[rgba(0,0,0,0.8)] rounded px-2 py-1">
                      <button
                        onClick={() => updateShipQuantity(shipIndex, ship.quantity - 1)}
                        className="text-sm hover:text-[rgba(var(--mg-primary),1)] px-1"
                        disabled={ship.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="text-sm font-bold min-w-[20px] text-center">x{ship.quantity}</span>
                      <button
                        onClick={() => updateShipQuantity(shipIndex, ship.quantity + 1)}
                        className="text-sm hover:text-[rgba(var(--mg-primary),1)] px-1"
                      >
                        +
                      </button>
                    </div>
                    {/* Remove Button */}
                    <button
                      onClick={() => removeShip(shipIndex)}
                      className="absolute top-2 left-2 p-1.5 bg-[rgba(var(--mg-danger),0.8)] rounded hover:bg-[rgba(var(--mg-danger),1)] transition-colors"
                    >
                      <TrashIcon />
                    </button>
                    {/* Size Badge */}
                    {ship.size && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-[rgba(0,0,0,0.8)] rounded text-xs">
                        {ship.size}
                      </div>
                    )}
                  </div>
                  {/* Ship Info */}
                  <div className="p-3">
                    <div className="text-sm font-medium text-[rgba(var(--mg-text),0.9)] truncate">
                      {ship.shipName}
                    </div>
                    <div className="text-xs text-[rgba(var(--mg-text),0.5)] mb-2">
                      {ship.manufacturer}
                    </div>
                    {/* Notes Input */}
                    <input
                      type="text"
                      value={ship.notes || ''}
                      onChange={(e) => updateShipNotes(shipIndex, e.target.value)}
                      className="mg-input w-full text-xs"
                      placeholder="Notes (e.g., Lead ship)"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-[rgba(var(--mg-primary),0.2)] rounded-lg">
              <ShipIcon />
              <div className="text-[rgba(var(--mg-text),0.5)] mt-2">
                No ships assigned. Click &quot;Add Ship&quot; to select vessels from the compendium.
              </div>
            </div>
          )}

          {errors.ships && (
            <div className="text-[rgba(var(--mg-danger),0.8)] text-sm">{errors.ships}</div>
          )}
        </div>
      </MobiGlasPanel>

      {/* Mission Ship Picker Modal */}
      <MissionShipPickerModal
        isOpen={showShipDropdown}
        onClose={() => setShowShipDropdown(false)}
        onSelectShips={addShips}
        existingShipNames={existingShipNames}
      />

      {/* Mission Briefing */}
      <MobiGlasPanel title="Mission Briefing">
        <div className="space-y-4">
          {/* Objectives */}
          <div>
            <label htmlFor="mission-objectives" className="mg-subtitle block mb-2">OBJECTIVES</label>
            <textarea
              id="mission-objectives"
              value={formData.objectives || ''}
              onChange={(e) => onInputChange('objectives', e.target.value)}
              className={`mg-input w-full h-24 resize-vertical ${errors.objectives ? 'border-[rgba(var(--mg-danger),0.5)]' : ''}`}
              placeholder="What are we trying to accomplish?"
              maxLength={1000}
            />
          </div>

          {/* Full Briefing */}
          <div>
            <label htmlFor="mission-briefing" className="mg-subtitle block mb-2">DETAILED BRIEFING</label>
            <textarea
              id="mission-briefing"
              value={formData.briefing || ''}
              onChange={(e) => onInputChange('briefing', e.target.value)}
              className="mg-input w-full h-40 resize-vertical"
              placeholder="Detailed mission plan, strategy, and instructions..."
              maxLength={5000}
            />
            <div className="text-xs text-[rgba(var(--mg-text),0.5)] mt-1">
              {(formData.briefing || '').length}/5000 characters
            </div>
          </div>

          {/* Equipment Notes */}
          <div>
            <label htmlFor="mission-equipment" className="mg-subtitle block mb-2">EQUIPMENT RECOMMENDATIONS</label>
            <textarea
              id="mission-equipment"
              value={formData.equipmentNotes || ''}
              onChange={(e) => onInputChange('equipmentNotes', e.target.value)}
              className="mg-input w-full h-24 resize-vertical"
              placeholder="Recommended gear, weapons, armor, etc."
              maxLength={2000}
            />
          </div>
        </div>
      </MobiGlasPanel>

      {/* Action Buttons */}
      <MobiGlasPanel title="Actions">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            {formData.status === 'DRAFT' && isEditing && onPublishToDiscord && (
              <MobiGlasButton
                onClick={onPublishToDiscord}
                variant="secondary"
                size="md"
                disabled={isLoading}
                leftIcon={
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
                  </svg>
                }
              >
                Publish to Discord
              </MobiGlasButton>
            )}
          </div>
          <div className="flex gap-3">
            <MobiGlasButton
              onClick={onCancel}
              variant="secondary"
              size="md"
              disabled={isLoading}
            >
              {isEditing ? 'Discard Changes' : 'Cancel'}
            </MobiGlasButton>
            <MobiGlasButton
              onClick={onSave}
              variant="primary"
              size="md"
              disabled={isLoading}
              isLoading={isLoading}
              withGlow={!isLoading}
            >
              {isEditing ? 'Save Changes' : 'Create Mission'}
            </MobiGlasButton>
          </div>
        </div>
      </MobiGlasPanel>
    </div>
  );
};

export default MissionPlannerForm;
