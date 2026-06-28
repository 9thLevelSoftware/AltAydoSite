'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { useUserProfile } from '../hooks/useUserProfile';
import {
  UserProfile,
  subsidiaryOptions,
  payGradeOptions,
  timezoneOptions,
  gameplayLoopOptions,
} from '../types/UserProfile';
import { UserShip } from '../types/user';
import UserFleetBuilder from './UserFleetBuilder';
import { useShipBatch } from '@/hooks/useShipBatch';
import { MobiGlasButton, MobiGlasFormError } from '@/components/ui/mobiglas';
import Image from 'next/image';

// Max accepted upload size before resizing (2MB)
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
// Bounded output dimensions for the stored avatar
const MAX_PHOTO_DIMENSION = 300;

export default function UserProfilePanel() {
  const { profile, isLoading, updateProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  // Draft holds unsaved edits while in edit mode; null when viewing.
  const [draft, setDraft] = useState<UserProfile | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // While editing, the fleet shown/edited comes from the draft so adds/removes
  // are only persisted on Save (matches the rest of the edit flow).
  const shipsSource = isEditing && draft ? draft.ships : profile?.ships;

  // Batch resolve fleet ship data for FleetYards CDN images (must be before early return -- hooks rule)
  const fleetyardsIds = useMemo(
    () => (shipsSource || []).map((s) => s.fleetyardsId).filter(Boolean),
    [shipsSource]
  );
  const { ships: resolvedShips } = useShipBatch(fleetyardsIds);

  if (isLoading || !profile) {
    return (
      <div className="mg-panel p-6 relative">
        <div className="flex items-center space-x-2 animate-pulse">
          <div className="w-20 h-20 bg-[rgba(var(--mg-primary),0.1)] rounded-sm"></div>
          <div className="space-y-2">
            <div className="h-5 w-32 bg-[rgba(var(--mg-primary),0.1)] rounded-sm"></div>
            <div className="h-3 w-48 bg-[rgba(var(--mg-primary),0.1)] rounded-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  // Source of truth for rendering: the live draft while editing, otherwise the saved profile.
  const view: UserProfile = isEditing && draft ? draft : profile;

  // Apply a field change to the in-memory draft (not persisted until Save).
  const updateDraft = (updates: Partial<UserProfile>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  // Enter edit mode -- seed the draft from the current saved profile.
  const handleEdit = () => {
    setDraft({ ...profile });
    setPhotoError(null);
    setIsEditing(true);
  };

  // Persist the draft via the hook (server + localStorage), then exit edit mode.
  const handleSave = () => {
    if (draft) {
      updateProfile(draft);
    }
    setIsEditing(false);
    setDraft(null);
    setPhotoError(null);
  };

  // Discard the draft without persisting.
  const handleCancel = () => {
    setIsEditing(false);
    setDraft(null);
    setPhotoError(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size before doing any work.
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      setPhotoError('Failed to read the selected image');
    };

    reader.onload = (event) => {
      if (!event.target?.result) {
        setPhotoError('Failed to read the selected image');
        return;
      }

      const img = document.createElement('img');

      img.onerror = () => {
        setPhotoError('The selected file could not be loaded as an image');
      };

      img.onload = () => {
        try {
          // Resize/compress to a bounded data URL to avoid unbounded base64 payloads.
          const canvas = document.createElement('canvas');

          let width = img.width;
          let height = img.height;

          if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
            const ratio = Math.min(MAX_PHOTO_DIMENSION / width, MAX_PHOTO_DIMENSION / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setPhotoError('Could not process the image');
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // JPEG at 0.8 quality keeps the stored data URL small.
          const resizedImage = canvas.toDataURL('image/jpeg', 0.8);
          updateDraft({ photo: resizedImage });
          setPhotoError(null);
        } catch {
          setPhotoError('Could not process the image');
        }
      };

      img.src = event.target.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleMultiSelect = (option: string) => {
    if (!draft) return;
    const currentLoops = draft.preferredGameplayLoops;
    if (currentLoops.includes(option)) {
      updateDraft({
        preferredGameplayLoops: currentLoops.filter((loop) => loop !== option),
      });
    } else {
      updateDraft({
        preferredGameplayLoops: [...currentLoops, option],
      });
    }
  };

  // Handler for adding a ship to the fleet (draft only -- persisted on Save)
  const handleAddShip = (ship: UserShip) => {
    if (!draft) return;
    updateDraft({
      ships: [...draft.ships, ship],
    });
  };

  // Handler for removing a ship from the fleet (draft only -- persisted on Save)
  const handleRemoveShip = (index: number) => {
    if (!draft) return;
    const currentShips = [...draft.ships];
    currentShips.splice(index, 1);
    updateDraft({
      ships: currentShips,
    });
  };

  return (
    <motion.div
      className="mg-panel p-6 relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-[rgba(var(--mg-primary),0.5)]"></div>
      <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-[rgba(var(--mg-primary),0.5)]"></div>
      <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-[rgba(var(--mg-primary),0.5)]"></div>
      <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-[rgba(var(--mg-primary),0.5)]"></div>

      <div className="mb-5 flex items-center justify-between">
        <h3 className="mg-subtitle text-sm tracking-wider">EMPLOYEE PROFILE</h3>
        <div className="mg-status-indicator text-[11px] px-3 py-0.5 bg-[rgba(var(--mg-success),0.1)] text-[rgba(var(--mg-success),0.8)] border border-[rgba(var(--mg-success),0.2)] rounded-sm">
          ACTIVE
        </div>
      </div>

      {photoError && (
        <MobiGlasFormError
          message={photoError}
          onDismiss={() => setPhotoError(null)}
          className="mb-4"
        />
      )}

      <div className="flex flex-col space-y-6">
        {/* Photo and basic info */}
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="relative">
            <div className="w-28 h-28 rounded-sm overflow-hidden border border-[rgba(var(--mg-primary),0.3)] relative">
              <Image
                src={view.photo || '/assets/avatar-placeholder.png'}
                alt="Profile"
                width={112}
                height={112}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border border-[rgba(var(--mg-primary),0.2)]"></div>
            </div>

            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-[rgba(var(--mg-panel-dark),0.9)] p-1.5 rounded-bl-sm text-[rgba(var(--mg-primary),0.9)] hover:text-[rgba(var(--mg-primary),1)]"
                title="Upload Photo"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </button>
            )}
          </div>

          <div className="flex-1">
            {isEditing ? (
              <div className="mb-4">
                <label
                  htmlFor="panel-name"
                  className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-1"
                >
                  NAME
                </label>
                <input
                  type="text"
                  id="panel-name"
                  value={view.name}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                  className="mg-input w-full text-base"
                  placeholder="Enter your name"
                />
              </div>
            ) : (
              <div className="font-quantify tracking-wide text-xl mb-2">{view.name}</div>
            )}

            <div className="text-sm text-[rgba(var(--mg-text),0.7)] mb-3">
              <span className="text-xs text-[rgba(var(--mg-text),0.5)]">HANDLE: </span>
              {view.handle}
            </div>

            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  <MobiGlasButton onClick={handleSave} variant="primary" size="sm">
                    SAVE CHANGES
                  </MobiGlasButton>
                  <MobiGlasButton onClick={handleCancel} variant="secondary" size="sm">
                    CANCEL
                  </MobiGlasButton>
                </>
              ) : (
                <MobiGlasButton onClick={handleEdit} variant="primary" size="sm">
                  EDIT PROFILE
                </MobiGlasButton>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Profile Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
          {/* Subsidiary/Division */}
          <div>
            <label
              htmlFor="panel-subsidiary"
              className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-2"
            >
              SUBSIDIARY/DIVISION
            </label>
            {isEditing ? (
              <select
                id="panel-subsidiary"
                value={view.subsidiary}
                onChange={(e) => updateDraft({ subsidiary: e.target.value })}
                className="mg-select w-full text-base"
              >
                {subsidiaryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-base font-light border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] p-2 rounded-sm">
                {view.subsidiary}
              </div>
            )}
          </div>

          {/* Pay Grade */}
          <div>
            <label
              htmlFor="panel-paygrade"
              className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-2"
            >
              PAY GRADE
            </label>
            {isEditing ? (
              <select
                id="panel-paygrade"
                value={view.payGrade}
                onChange={(e) => updateDraft({ payGrade: e.target.value })}
                className="mg-select w-full text-base"
              >
                {payGradeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-base font-light border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] p-2 rounded-sm">
                {view.payGrade}
              </div>
            )}
          </div>

          {/* Position */}
          <div>
            <label
              htmlFor="panel-position"
              className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-2"
            >
              POSITION
            </label>
            {isEditing ? (
              <input
                type="text"
                id="panel-position"
                value={view.position}
                onChange={(e) => updateDraft({ position: e.target.value })}
                className="mg-input w-full text-base"
                placeholder="Enter your position"
              />
            ) : (
              <div className="text-base font-light border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] p-2 rounded-sm">
                {view.position || 'Not specified'}
              </div>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="panel-email"
              className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-2"
            >
              EMAIL ADDRESS
            </label>
            {isEditing ? (
              <input
                type="email"
                id="panel-email"
                value={view.email}
                onChange={(e) => updateDraft({ email: e.target.value })}
                className="mg-input w-full text-base"
                placeholder="Enter your email"
              />
            ) : (
              <div className="text-base font-light border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] p-2 rounded-sm">
                {view.email}
              </div>
            )}
          </div>

          {/* Timezone */}
          <div>
            <label
              htmlFor="panel-timezone"
              className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-2"
            >
              TIMEZONE
            </label>
            {isEditing ? (
              <select
                id="panel-timezone"
                value={view.timezone}
                onChange={(e) => updateDraft({ timezone: e.target.value })}
                className="mg-select w-full text-base"
              >
                {timezoneOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-base font-light border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] p-2 rounded-sm">
                {view.timezone}
              </div>
            )}
          </div>
        </div>

        {/* Preferred Gameplay Loops */}
        <div className="mt-2">
          <label className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-3">
            PREFERRED GAMEPLAY LOOP(S)
          </label>
          {isEditing ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gameplayLoopOptions.map((option) => {
                const isSelected = view.preferredGameplayLoops.includes(option);
                return (
                  <div
                    key={option}
                    onClick={() => handleMultiSelect(option)}
                    className={`cursor-pointer text-xs px-3 py-2 rounded-sm border transition-colors duration-200 ${
                      isSelected
                        ? 'border-[rgba(var(--mg-primary),0.6)] bg-[rgba(var(--mg-primary),0.2)]'
                        : 'border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] hover:bg-[rgba(var(--mg-panel-dark),0.6)]'
                    }`}
                  >
                    {option.toUpperCase()}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {view.preferredGameplayLoops.length > 0 ? (
                view.preferredGameplayLoops.map((loop) => (
                  <div
                    key={loop}
                    className="text-xs px-3 py-2 rounded-sm bg-[rgba(var(--mg-primary),0.1)] text-[rgba(var(--mg-primary),0.9)] border border-[rgba(var(--mg-primary),0.3)]"
                  >
                    {loop.toUpperCase()}
                  </div>
                ))
              ) : (
                <div className="text-sm text-[rgba(var(--mg-text),0.5)] py-2">
                  No gameplay loops selected
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fleet Builder / Ship Management Section */}
        <UserFleetBuilder
          isEditing={isEditing}
          userShips={view.ships}
          resolvedShips={resolvedShips}
          onAddShip={handleAddShip}
          onRemoveShip={handleRemoveShip}
        />
      </div>
    </motion.div>
  );
}
