'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { MobiGlasPanel } from '@/components/ui/mobiglas';
import MobiGlasButton from '../ui/mobiglas/MobiGlasButton';
import {
  MissionLeader,
  PlannedMission,
  PlannedMissionValidationErrors,
  LEADERSHIP_ROLES,
} from '@/types/PlannedMission';
import {
  ACTIVITIES,
  ActivityType,
  OPERATION_TYPES,
  PERSONNEL_PROFESSIONS,
  PersonnelProfession,
  SHIP_CATEGORIES,
  SHIP_SIZES,
  ShipCategory,
  ShipSize,
} from '@/types/MissionPlanning';
import { LOCATION_OPTIONS } from '@/data/StarCitizenLocations';

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

const ShipIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const ACTIVITY_ICONS: Record<ActivityType, JSX.Element> = {
  Mining: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Salvage: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Escort: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Transport: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  Medical: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Combat: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

const SHIP_SIZE_ICONS: Record<ShipSize, JSX.Element> = {
  Small: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
    </svg>
  ),
  Medium: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" strokeWidth={2} />
    </svg>
  ),
  Large: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="7" strokeWidth={2} />
    </svg>
  ),
  Capital: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
    </svg>
  ),
};

interface Leader {
  id: string;
  aydoHandle: string;
  discordId?: string;
  position?: string;
  clearanceLevel: number;
}

interface MissionPlannerFormProps {
  formData: Partial<PlannedMission>;
  errors: PlannedMissionValidationErrors;
  isLoading: boolean;
  isEditing: boolean;
  onInputChange: (field: keyof PlannedMission, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onPublishToDiscord?: () => void;
}

function formatDateTimeForInput(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
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
  onInputChange,
  onSave,
  onCancel,
  onPublishToDiscord,
}) => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);

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

  const totalShips = useMemo(() => {
    return (formData.shipRequirements || []).reduce((total, requirement) => total + requirement.count, 0);
  }, [formData.shipRequirements]);

  const totalPersonnel = useMemo(() => {
    return (formData.personnelRequirements || []).reduce((total, requirement) => total + requirement.count, 0);
  }, [formData.personnelRequirements]);

  const addLeader = () => {
    onInputChange('leaders', [
      ...(formData.leaders || []),
      { userId: '', aydoHandle: '', role: 'Mission Commander' },
    ]);
  };

  const updateLeader = (index: number, field: keyof MissionLeader, value: string) => {
    const newLeaders = [...(formData.leaders || [])];

    if (field === 'userId') {
      const leader = leaders.find(l => l.id === value);
      if (leader) {
        newLeaders[index] = {
          ...newLeaders[index],
          userId: leader.id,
          aydoHandle: leader.aydoHandle,
          discordId: leader.discordId || undefined,
        };
      }
    } else {
      newLeaders[index] = { ...newLeaders[index], [field]: value };
    }

    onInputChange('leaders', newLeaders);
  };

  const removeLeader = (index: number) => {
    onInputChange('leaders', formData.leaders?.filter((_, i) => i !== index) || []);
  };

  const addShipRequirement = () => {
    onInputChange('shipRequirements', [
      ...(formData.shipRequirements || []),
      { size: 'Medium', category: 'Transport', count: 1 },
    ]);
  };

  const updateShipRequirement = (
    index: number,
    field: 'size' | 'category' | 'count',
    value: ShipSize | ShipCategory | number,
  ) => {
    const requirements = [...(formData.shipRequirements || [])];
    requirements[index] = { ...requirements[index], [field]: value };
    onInputChange('shipRequirements', requirements);
  };

  const removeShipRequirement = (index: number) => {
    onInputChange('shipRequirements', formData.shipRequirements?.filter((_, i) => i !== index) || []);
  };

  const addPersonnelRequirement = () => {
    onInputChange('personnelRequirements', [
      ...(formData.personnelRequirements || []),
      { profession: 'Pilot', count: 1 },
    ]);
  };

  const updatePersonnelRequirement = (
    index: number,
    field: 'profession' | 'count',
    value: PersonnelProfession | number,
  ) => {
    const requirements = [...(formData.personnelRequirements || [])];
    requirements[index] = { ...requirements[index], [field]: value };
    onInputChange('personnelRequirements', requirements);
  };

  const removePersonnelRequirement = (index: number) => {
    onInputChange('personnelRequirements', formData.personnelRequirements?.filter((_, i) => i !== index) || []);
  };

  return (
    <div className="space-y-6">
      <MobiGlasPanel
        title={isEditing ? 'Edit Mission' : 'Plan New Mission'}
        rightContent={
          <MobiGlasButton onClick={onCancel} variant="secondary" size="sm">
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
            ? 'Update the mission details below. Changes will be saved when you click "Save Changes".'
            : 'Create a mission plan by defining requirements, assigning leaders, and setting the briefing details. Publish to Discord when ready.'}
        </div>
      </MobiGlasPanel>

      <MobiGlasPanel title="Mission Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div>
            <label htmlFor="mission-datetime" className="mg-subtitle block mb-2">SCHEDULED DATE & TIME *</label>
            <input
              type="datetime-local"
              id="mission-datetime"
              value={formData.scheduledDateTime ? formatDateTimeForInput(formData.scheduledDateTime) : ''}
              aria-required={true}
              onChange={(e) => {
                if (e.target.value) {
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

          <div>
            <label htmlFor="mission-duration" className="mg-subtitle block mb-2">ESTIMATED DURATION</label>
            <select
              id="mission-duration"
              value={formData.duration || ''}
              onChange={(e) => onInputChange('duration', e.target.value ? parseInt(e.target.value, 10) : undefined)}
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

      <MobiGlasPanel title="Operation Type">
        <div className="grid grid-cols-2 gap-4">
          {OPERATION_TYPES.map((type) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onInputChange('operationType', type)}
              className={`p-6 rounded-lg border-2 flex flex-col items-center gap-3 transition-all ${
                formData.operationType === type
                  ? 'border-[rgba(var(--mg-primary),0.8)] bg-[rgba(var(--mg-primary),0.15)]'
                  : 'border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.3)] hover:border-[rgba(var(--mg-primary),0.4)]'
              }`}
            >
              <div className={formData.operationType === type ? 'text-[rgba(var(--mg-primary),1)]' : 'text-[rgba(var(--mg-text),0.6)]'}>
                {type === 'Space Operations' ? <SpaceIcon /> : <GroundIcon />}
              </div>
              <span className={`font-medium ${formData.operationType === type ? 'text-[rgba(var(--mg-primary),1)]' : 'text-[rgba(var(--mg-text),0.8)]'}`}>
                {type}
              </span>
            </motion.button>
          ))}
        </div>
        {errors.operationType && (
          <div className="text-[rgba(var(--mg-danger),0.8)] text-sm mt-2">{errors.operationType}</div>
        )}
      </MobiGlasPanel>

      <MobiGlasPanel title="Mission Activities">
        <div className="space-y-6">
          <div className="text-[rgba(var(--mg-text),0.6)] text-sm">
            Select primary, secondary, and tertiary activities. Each can only be selected once.
          </div>

          <div>
            <label className="mg-subtitle block mb-3">PRIMARY ACTIVITY *</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((activity) => {
                const isDisabled = activity === formData.secondaryActivity || activity === formData.tertiaryActivity;
                return (
                  <motion.button
                    key={activity}
                    whileHover={!isDisabled ? { scale: 1.05 } : {}}
                    whileTap={!isDisabled ? { scale: 0.95 } : {}}
                    onClick={() => !isDisabled && onInputChange('primaryActivity', activity)}
                    disabled={isDisabled}
                    className={`px-4 py-2 rounded-full border flex items-center gap-2 transition-all ${
                      formData.primaryActivity === activity
                        ? 'border-[rgba(var(--mg-primary),0.8)] bg-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),1)]'
                        : isDisabled
                        ? 'border-[rgba(var(--mg-text),0.1)] bg-[rgba(var(--mg-panel-dark),0.2)] text-[rgba(var(--mg-text),0.3)] cursor-not-allowed'
                        : 'border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.3)] text-[rgba(var(--mg-text),0.7)] hover:border-[rgba(var(--mg-primary),0.4)]'
                    }`}
                  >
                    {ACTIVITY_ICONS[activity]}
                    <span>{activity}</span>
                  </motion.button>
                );
              })}
            </div>
            {errors.primaryActivity && (
              <div className="text-[rgba(var(--mg-danger),0.8)] text-sm mt-2">{errors.primaryActivity}</div>
            )}
          </div>

          <div>
            <label className="mg-subtitle block mb-3">SECONDARY ACTIVITY</label>
            <div className="flex flex-wrap gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onInputChange('secondaryActivity', undefined)}
                className={`px-4 py-2 rounded-full border transition-all ${
                  !formData.secondaryActivity
                    ? 'border-[rgba(var(--mg-text),0.4)] bg-[rgba(var(--mg-panel-dark),0.4)] text-[rgba(var(--mg-text),0.7)]'
                    : 'border-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-text),0.5)]'
                }`}
              >
                None
              </motion.button>
              {ACTIVITIES.filter(a => a !== formData.primaryActivity && a !== formData.tertiaryActivity).map((activity) => (
                <motion.button
                  key={activity}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onInputChange('secondaryActivity', activity)}
                  className={`px-4 py-2 rounded-full border flex items-center gap-2 transition-all ${
                    formData.secondaryActivity === activity
                      ? 'border-[rgba(var(--mg-secondary),0.8)] bg-[rgba(var(--mg-secondary),0.2)] text-[rgba(var(--mg-secondary),1)]'
                      : 'border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.3)] text-[rgba(var(--mg-text),0.7)] hover:border-[rgba(var(--mg-primary),0.4)]'
                  }`}
                >
                  {ACTIVITY_ICONS[activity]}
                  <span>{activity}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <label className="mg-subtitle block mb-3">TERTIARY ACTIVITY</label>
            <div className="flex flex-wrap gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onInputChange('tertiaryActivity', undefined)}
                className={`px-4 py-2 rounded-full border transition-all ${
                  !formData.tertiaryActivity
                    ? 'border-[rgba(var(--mg-text),0.4)] bg-[rgba(var(--mg-panel-dark),0.4)] text-[rgba(var(--mg-text),0.7)]'
                    : 'border-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-text),0.5)]'
                }`}
              >
                None
              </motion.button>
              {ACTIVITIES.filter(a => a !== formData.primaryActivity && a !== formData.secondaryActivity).map((activity) => (
                <motion.button
                  key={activity}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onInputChange('tertiaryActivity', activity)}
                  className={`px-4 py-2 rounded-full border flex items-center gap-2 transition-all ${
                    formData.tertiaryActivity === activity
                      ? 'border-[rgba(var(--mg-accent),0.8)] bg-[rgba(var(--mg-accent),0.2)] text-[rgba(var(--mg-accent),1)]'
                      : 'border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.3)] text-[rgba(var(--mg-text),0.7)] hover:border-[rgba(var(--mg-primary),0.4)]'
                  }`}
                >
                  {ACTIVITY_ICONS[activity]}
                  <span>{activity}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </MobiGlasPanel>

      <MobiGlasPanel
        title="Leadership"
        rightContent={
          <MobiGlasButton onClick={addLeader} variant="primary" size="sm" leftIcon={<PlusIcon />}>
            Add Leader
          </MobiGlasButton>
        }
      >
        <div className="space-y-4">
          <div className="text-[rgba(var(--mg-text),0.6)] text-sm">
            Assign unit leaders for this mission.
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

      <MobiGlasPanel
        title="Ship Requirements"
        rightContent={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[rgba(var(--mg-text),0.7)]">
              <ShipIcon />
              <span>Ships: <strong className="text-[rgba(var(--mg-primary),1)]">{totalShips}</strong></span>
            </div>
            <MobiGlasButton onClick={addShipRequirement} variant="primary" size="sm" leftIcon={<PlusIcon />} withScanline>
              Add Ship Slot
            </MobiGlasButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-[rgba(var(--mg-text),0.6)] text-sm">
            Define required ships by size and category. Leave empty for ground-only operations.
          </div>

          {formData.shipRequirements && formData.shipRequirements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.shipRequirements.map((ship, index) => (
                <motion.div
                  key={index}
                  className="border border-[rgba(var(--mg-primary),0.3)] rounded-lg p-4 bg-[rgba(var(--mg-panel-dark),0.3)] relative"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={() => removeShipRequirement(index)}
                    className="absolute top-2 right-2 p-1.5 rounded bg-[rgba(var(--mg-danger),0.2)] text-[rgba(var(--mg-danger),0.8)] hover:bg-[rgba(var(--mg-danger),0.3)] transition-colors"
                    title="Remove Ship Requirement"
                  >
                    <TrashIcon />
                  </button>

                  <div className="mb-4">
                    <label className="mg-subtitle block mb-2 text-xs">SIZE</label>
                    <div className="flex gap-2">
                      {SHIP_SIZES.map((size) => (
                        <button
                          key={size}
                          onClick={() => updateShipRequirement(index, 'size', size)}
                          className={`flex-1 py-2 rounded flex flex-col items-center gap-1 transition-all ${
                            ship.size === size
                              ? 'bg-[rgba(var(--mg-primary),0.2)] border border-[rgba(var(--mg-primary),0.5)] text-[rgba(var(--mg-primary),1)]'
                              : 'bg-[rgba(var(--mg-panel-dark),0.4)] border border-transparent text-[rgba(var(--mg-text),0.6)] hover:border-[rgba(var(--mg-primary),0.3)]'
                          }`}
                        >
                          {SHIP_SIZE_ICONS[size]}
                          <span className="text-xs">{size}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={`mission-ship-category-${index}`} className="mg-subtitle block mb-1 text-xs">CATEGORY</label>
                      <select
                        id={`mission-ship-category-${index}`}
                        value={ship.category}
                        onChange={(e) => updateShipRequirement(index, 'category', e.target.value as ShipCategory)}
                        className="mg-input w-full text-sm"
                      >
                        {SHIP_CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`mission-ship-count-${index}`} className="mg-subtitle block mb-1 text-xs">COUNT</label>
                      <div className="flex items-center">
                        <button
                          onClick={() => updateShipRequirement(index, 'count', Math.max(1, ship.count - 1))}
                          className="px-3 py-2 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-l border border-r-0 border-[rgba(var(--mg-primary),0.3)] hover:bg-[rgba(var(--mg-primary),0.1)]"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          id={`mission-ship-count-${index}`}
                          value={ship.count}
                          onChange={(e) => updateShipRequirement(index, 'count', parseInt(e.target.value, 10) || 1)}
                          className="mg-input w-16 text-center rounded-none border-x-0"
                        />
                        <button
                          onClick={() => updateShipRequirement(index, 'count', Math.min(20, ship.count + 1))}
                          className="px-3 py-2 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-r border border-l-0 border-[rgba(var(--mg-primary),0.3)] hover:bg-[rgba(var(--mg-primary),0.1)]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[rgba(var(--mg-text),0.4)] border border-dashed border-[rgba(var(--mg-primary),0.2)] rounded-lg">
              No ships specified. Click &quot;Add Ship Slot&quot; to add vessel requirements.
            </div>
          )}
          {errors.shipRequirements && (
            <div className="text-[rgba(var(--mg-danger),0.8)] text-sm">{errors.shipRequirements}</div>
          )}
        </div>
      </MobiGlasPanel>

      <MobiGlasPanel
        title="Personnel Requirements"
        rightContent={
          <div className="flex items-center gap-4">
            <div className="text-sm text-[rgba(var(--mg-text),0.7)]">
              Personnel: <strong className="text-[rgba(var(--mg-secondary),1)]">{totalPersonnel}</strong>
            </div>
            <MobiGlasButton onClick={addPersonnelRequirement} variant="primary" size="sm" leftIcon={<PlusIcon />} withScanline>
              Add Role
            </MobiGlasButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-[rgba(var(--mg-text),0.6)] text-sm">
            Specify required personnel roles and counts for this mission.
          </div>

          {formData.personnelRequirements && formData.personnelRequirements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {formData.personnelRequirements.map((personnel, index) => (
                <motion.div
                  key={index}
                  className="border border-[rgba(var(--mg-secondary),0.3)] rounded-lg p-4 bg-[rgba(var(--mg-panel-dark),0.3)] relative"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <button
                    onClick={() => removePersonnelRequirement(index)}
                    className="absolute top-2 right-2 p-1 rounded bg-[rgba(var(--mg-danger),0.2)] text-[rgba(var(--mg-danger),0.8)] hover:bg-[rgba(var(--mg-danger),0.3)] transition-colors"
                    title="Remove Personnel Requirement"
                  >
                    <TrashIcon />
                  </button>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor={`mission-personnel-profession-${index}`} className="mg-subtitle block mb-1 text-xs">PROFESSION</label>
                      <select
                        id={`mission-personnel-profession-${index}`}
                        value={personnel.profession}
                        onChange={(e) => updatePersonnelRequirement(index, 'profession', e.target.value as PersonnelProfession)}
                        className="mg-input w-full text-sm"
                      >
                        {PERSONNEL_PROFESSIONS.map((profession) => (
                          <option key={profession} value={profession}>{profession}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`mission-personnel-count-${index}`} className="mg-subtitle block mb-1 text-xs">COUNT</label>
                      <div className="flex items-center">
                        <button
                          onClick={() => updatePersonnelRequirement(index, 'count', Math.max(1, personnel.count - 1))}
                          className="px-3 py-2 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-l border border-r-0 border-[rgba(var(--mg-secondary),0.3)] hover:bg-[rgba(var(--mg-secondary),0.1)]"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          id={`mission-personnel-count-${index}`}
                          value={personnel.count}
                          onChange={(e) => updatePersonnelRequirement(index, 'count', parseInt(e.target.value, 10) || 1)}
                          className="mg-input w-full text-center rounded-none border-x-0"
                        />
                        <button
                          onClick={() => updatePersonnelRequirement(index, 'count', Math.min(50, personnel.count + 1))}
                          className="px-3 py-2 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-r border border-l-0 border-[rgba(var(--mg-secondary),0.3)] hover:bg-[rgba(var(--mg-secondary),0.1)]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[rgba(var(--mg-text),0.4)] border border-dashed border-[rgba(var(--mg-secondary),0.2)] rounded-lg">
              No personnel specified. Click &quot;Add Role&quot; to add required roles.
            </div>
          )}
          {errors.personnelRequirements && (
            <div className="text-[rgba(var(--mg-danger),0.8)] text-sm">{errors.personnelRequirements}</div>
          )}
        </div>
      </MobiGlasPanel>

      <MobiGlasPanel title="Mission Briefing">
        <div className="space-y-4">
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
            <MobiGlasButton onClick={onCancel} variant="secondary" size="md" disabled={isLoading}>
              {isEditing ? 'Discard Changes' : 'Cancel'}
            </MobiGlasButton>
            <MobiGlasButton onClick={onSave} variant="primary" size="md" disabled={isLoading} isLoading={isLoading} withGlow={!isLoading}>
              {isEditing ? 'Save Changes' : 'Create Mission'}
            </MobiGlasButton>
          </div>
        </div>
      </MobiGlasPanel>
    </div>
  );
};

export default MissionPlannerForm;
