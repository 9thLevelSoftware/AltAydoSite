'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MobiGlasPanel } from '@/components/ui/mobiglas';
import MobiGlasButton from '../ui/mobiglas/MobiGlasButton';
import {
  MissionTemplate,
  MissionTemplateShip,
  MissionTemplatePersonnel,
  MissionTemplateValidationErrors,
  ActivityType,
  OperationType,
  ShipSize,
  ShipCategory,
  PersonnelProfession
} from '@/types/MissionTemplate';

// Icons
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

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

const TemplateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
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

// Ship size icons
const SHIP_SIZE_ICONS: Record<ShipSize, JSX.Element> = {
  'Small': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
    </svg>
  ),
  'Medium': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" strokeWidth={2} />
    </svg>
  ),
  'Large': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="7" strokeWidth={2} />
    </svg>
  ),
  'Capital': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
    </svg>
  )
};

const ACTIVITIES: ActivityType[] = ['Mining', 'Salvage', 'Escort', 'Transport', 'Medical', 'Combat'];
const OPERATION_TYPES: OperationType[] = ['Ground Operations', 'Space Operations'];
const SHIP_SIZES: ShipSize[] = ['Small', 'Medium', 'Large', 'Capital'];
const SHIP_CATEGORIES: ShipCategory[] = ['Fighter', 'Transport', 'Industrial', 'Medical'];
const PERSONNEL_PROFESSIONS: PersonnelProfession[] = ['Pilot', 'Gunner', 'Medic', 'Infantry', 'Engineer'];

interface MissionTemplateFormProps {
  formData: Partial<MissionTemplate>;
  errors: MissionTemplateValidationErrors;
  isLoading: boolean;
  isEditing: boolean;
  onInputChange: (field: keyof MissionTemplate, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onAddShip: () => void;
  onUpdateShip: (index: number, field: keyof MissionTemplateShip, value: any) => void;
  onRemoveShip: (index: number) => void;
  onAddPersonnel: () => void;
  onUpdatePersonnel: (index: number, field: keyof MissionTemplatePersonnel, value: any) => void;
  onRemovePersonnel: (index: number) => void;
  getAvailableActivities: (excludeField?: 'primary' | 'secondary' | 'tertiary') => ActivityType[];
}

const MissionTemplateForm: React.FC<MissionTemplateFormProps> = ({
  formData,
  errors,
  isLoading,
  isEditing,
  onInputChange,
  onSave,
  onCancel,
  onAddShip,
  onUpdateShip,
  onRemoveShip,
  onAddPersonnel,
  onUpdatePersonnel,
  onRemovePersonnel,
  getAvailableActivities
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <MobiGlasPanel
        title={`${isEditing ? 'Edit' : 'Create'} Mission Template`}
        rightContent={
          <div className="flex items-center gap-3">
            <TemplateIcon />
            <MobiGlasButton
              onClick={onCancel}
              variant="secondary"
              size="sm"
              leftIcon={<BackIcon />}
            >
              Back to List
            </MobiGlasButton>
          </div>
        }
      >
        <div className="text-[rgba(var(--mg-text),0.7)]">
          {isEditing ? 'Modify the existing mission template' : 'Create a reusable blueprint for planning missions'}
        </div>
      </MobiGlasPanel>

      {/* Template Name */}
      <MobiGlasPanel title="Template Identity">
        <div className="mg-input-group">
          <label className="mg-subtitle block mb-2">TEMPLATE NAME *</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => onInputChange('name', e.target.value)}
            className={`mg-input w-full text-lg ${errors.name ? 'border-[rgba(var(--mg-danger),0.5)]' : ''}`}
            placeholder="e.g., Heavy Mining Expedition"
            maxLength={100}
          />
          {errors.name && (
            <div className="text-[rgba(var(--mg-danger),0.8)] text-sm mt-1">{errors.name}</div>
          )}
        </div>
      </MobiGlasPanel>

      {/* Operation Type - Visual Selection */}
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
              <div className={`${formData.operationType === type ? 'text-[rgba(var(--mg-primary),1)]' : 'text-[rgba(var(--mg-text),0.6)]'}`}>
                {type === 'Space Operations' ? <SpaceIcon /> : <GroundIcon />}
              </div>
              <span className={`font-medium ${formData.operationType === type ? 'text-[rgba(var(--mg-primary),1)]' : 'text-[rgba(var(--mg-text),0.8)]'}`}>
                {type}
              </span>
            </motion.button>
          ))}
        </div>
      </MobiGlasPanel>

      {/* Activity Selection - Visual Badges */}
      <MobiGlasPanel title="Mission Activities">
        <div className="space-y-6">
          <div className="text-[rgba(var(--mg-text),0.6)] text-sm">
            Select primary, secondary, and tertiary activities. Each can only be selected once.
          </div>

          {/* Primary Activity */}
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

          {/* Secondary Activity */}
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

          {/* Tertiary Activity */}
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

      {/* Ship Roster - Visual Cards */}
      <MobiGlasPanel
        title="Ship Requirements"
        rightContent={
          <MobiGlasButton
            onClick={onAddShip}
            variant="primary"
            size="sm"
            leftIcon={<PlusIcon />}
            withScanline={true}
          >
            Add Ship Slot
          </MobiGlasButton>
        }
      >
        <div className="space-y-4">
          <div className="text-[rgba(var(--mg-text),0.6)] text-sm">
            Define ship requirements by size and category. Leave empty for ground-only operations.
          </div>

          {formData.shipRoster && formData.shipRoster.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.shipRoster.map((ship, index) => (
                <motion.div
                  key={index}
                  className="border border-[rgba(var(--mg-primary),0.3)] rounded-lg p-4 bg-[rgba(var(--mg-panel-dark),0.3)] relative"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Delete Button */}
                  <button
                    onClick={() => onRemoveShip(index)}
                    className="absolute top-2 right-2 p-1.5 rounded bg-[rgba(var(--mg-danger),0.2)] text-[rgba(var(--mg-danger),0.8)] hover:bg-[rgba(var(--mg-danger),0.3)] transition-colors"
                    title="Remove Ship"
                  >
                    <TrashIcon />
                  </button>

                  {/* Ship Size Visual Selection */}
                  <div className="mb-4">
                    <label className="mg-subtitle block mb-2 text-xs">SIZE</label>
                    <div className="flex gap-2">
                      {SHIP_SIZES.map((size) => (
                        <button
                          key={size}
                          onClick={() => onUpdateShip(index, 'size', size)}
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

                  {/* Category and Count */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mg-subtitle block mb-1 text-xs">CATEGORY</label>
                      <select
                        value={ship.category}
                        onChange={(e) => onUpdateShip(index, 'category', e.target.value as ShipCategory)}
                        className="mg-input w-full text-sm"
                      >
                        {SHIP_CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mg-subtitle block mb-1 text-xs">COUNT</label>
                      <div className="flex items-center">
                        <button
                          onClick={() => onUpdateShip(index, 'count', Math.max(1, ship.count - 1))}
                          className="px-3 py-2 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-l border border-r-0 border-[rgba(var(--mg-primary),0.3)] hover:bg-[rgba(var(--mg-primary),0.1)]"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={ship.count}
                          onChange={(e) => onUpdateShip(index, 'count', parseInt(e.target.value) || 1)}
                          className="mg-input w-16 text-center rounded-none border-x-0"
                        />
                        <button
                          onClick={() => onUpdateShip(index, 'count', Math.min(20, ship.count + 1))}
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
        </div>
      </MobiGlasPanel>

      {/* Personnel Roster - Visual Cards */}
      <MobiGlasPanel
        title="Personnel Requirements"
        rightContent={
          <MobiGlasButton
            onClick={onAddPersonnel}
            variant="primary"
            size="sm"
            leftIcon={<PlusIcon />}
            withScanline={true}
          >
            Add Role
          </MobiGlasButton>
        }
      >
        <div className="space-y-4">
          <div className="text-[rgba(var(--mg-text),0.6)] text-sm">
            Specify the required personnel roles and counts for this mission type.
          </div>

          {formData.personnelRoster && formData.personnelRoster.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {formData.personnelRoster.map((personnel, index) => (
                <motion.div
                  key={index}
                  className="border border-[rgba(var(--mg-secondary),0.3)] rounded-lg p-4 bg-[rgba(var(--mg-panel-dark),0.3)] relative"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <button
                    onClick={() => onRemovePersonnel(index)}
                    className="absolute top-2 right-2 p-1 rounded bg-[rgba(var(--mg-danger),0.2)] text-[rgba(var(--mg-danger),0.8)] hover:bg-[rgba(var(--mg-danger),0.3)] transition-colors"
                    title="Remove Personnel"
                  >
                    <TrashIcon />
                  </button>

                  <div className="space-y-3">
                    <div>
                      <label className="mg-subtitle block mb-1 text-xs">PROFESSION</label>
                      <select
                        value={personnel.profession}
                        onChange={(e) => onUpdatePersonnel(index, 'profession', e.target.value as PersonnelProfession)}
                        className="mg-input w-full text-sm"
                      >
                        {PERSONNEL_PROFESSIONS.map((profession) => (
                          <option key={profession} value={profession}>{profession}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mg-subtitle block mb-1 text-xs">COUNT</label>
                      <div className="flex items-center">
                        <button
                          onClick={() => onUpdatePersonnel(index, 'count', Math.max(1, personnel.count - 1))}
                          className="px-3 py-2 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-l border border-r-0 border-[rgba(var(--mg-secondary),0.3)] hover:bg-[rgba(var(--mg-secondary),0.1)]"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={personnel.count}
                          onChange={(e) => onUpdatePersonnel(index, 'count', parseInt(e.target.value) || 1)}
                          className="mg-input w-full text-center rounded-none border-x-0"
                        />
                        <button
                          onClick={() => onUpdatePersonnel(index, 'count', Math.min(50, personnel.count + 1))}
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
        </div>
      </MobiGlasPanel>

      {/* Required Equipment */}
      <MobiGlasPanel title="Required Equipment">
        <div className="space-y-4">
          <div className="text-[rgba(var(--mg-text),0.6)] text-sm">
            List specific equipment, gear, or supplies required for this mission type.
          </div>
          <div className="mg-input-group">
            <textarea
              value={formData.requiredEquipment || ''}
              onChange={(e) => onInputChange('requiredEquipment', e.target.value)}
              className="mg-input w-full h-32 resize-vertical"
              placeholder="e.g.&#10;• Mining lasers (Lancet MH1)&#10;• Tractor beams&#10;• Cargo containers&#10;• Security armor (medium)&#10;• Medical supplies"
              maxLength={2000}
            />
            <div className="text-xs text-[rgba(var(--mg-text),0.5)] mt-1">
              {(formData.requiredEquipment || '').length}/2000 characters
            </div>
          </div>
        </div>
      </MobiGlasPanel>

      {/* Summary Preview */}
      <MobiGlasPanel title="Template Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded bg-[rgba(var(--mg-panel-dark),0.3)]">
            <div className="text-2xl font-bold text-[rgba(var(--mg-primary),1)]">
              {formData.shipRoster?.reduce((total, s) => total + s.count, 0) || 0}
            </div>
            <div className="text-xs text-[rgba(var(--mg-text),0.6)] mt-1">Ships Required</div>
          </div>
          <div className="text-center p-4 rounded bg-[rgba(var(--mg-panel-dark),0.3)]">
            <div className="text-2xl font-bold text-[rgba(var(--mg-secondary),1)]">
              {formData.personnelRoster?.reduce((total, p) => total + p.count, 0) || 0}
            </div>
            <div className="text-xs text-[rgba(var(--mg-text),0.6)] mt-1">Personnel Required</div>
          </div>
          <div className="text-center p-4 rounded bg-[rgba(var(--mg-panel-dark),0.3)]">
            <div className="text-lg font-bold text-[rgba(var(--mg-text),0.9)]">
              {formData.operationType?.split(' ')[0] || '-'}
            </div>
            <div className="text-xs text-[rgba(var(--mg-text),0.6)] mt-1">Operation Type</div>
          </div>
          <div className="text-center p-4 rounded bg-[rgba(var(--mg-panel-dark),0.3)]">
            <div className="text-lg font-bold text-[rgba(var(--mg-text),0.9)]">
              {[formData.primaryActivity, formData.secondaryActivity, formData.tertiaryActivity].filter(Boolean).length}
            </div>
            <div className="text-xs text-[rgba(var(--mg-text),0.6)] mt-1">Activities</div>
          </div>
        </div>
      </MobiGlasPanel>

      {/* Action Buttons */}
      <MobiGlasPanel title="Actions">
        <div className="flex justify-end space-x-4">
          <MobiGlasButton
            onClick={onCancel}
            variant="secondary"
            size="md"
            disabled={isLoading}
          >
            Cancel
          </MobiGlasButton>
          <MobiGlasButton
            onClick={onSave}
            variant="primary"
            size="md"
            disabled={isLoading}
            isLoading={isLoading}
            withGlow={!isLoading}
          >
            {isEditing ? 'Update Template' : 'Save Template'}
          </MobiGlasButton>
        </div>
      </MobiGlasPanel>
    </div>
  );
};

export default MissionTemplateForm;
