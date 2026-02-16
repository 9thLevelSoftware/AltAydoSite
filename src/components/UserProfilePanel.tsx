'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { useUserProfile } from '../hooks/useUserProfile';
import {
  subsidiaryOptions,
  payGradeOptions,
  timezoneOptions,
  gameplayLoopOptions
} from '../types/UserProfile';
import { UserShip } from '../types/user';
import UserFleetBuilder from './UserFleetBuilder';
import { useShipBatch } from '@/hooks/useShipBatch';
import Image from 'next/image';

export default function UserProfilePanel() {
  const { profile, isLoading, updateProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch resolve fleet ship data for FleetYards CDN images (must be before early return -- hooks rule)
  const fleetyardsIds = useMemo(
    () => (profile?.ships || []).map(s => s.fleetyardsId).filter(Boolean),
    [profile?.ships]
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
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateProfile({ photo: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleMultiSelect = (option: string) => {
    const currentLoops = [...profile.preferredGameplayLoops];
    if (currentLoops.includes(option)) {
      updateProfile({ 
        preferredGameplayLoops: currentLoops.filter(loop => loop !== option) 
      });
    } else {
      updateProfile({ 
        preferredGameplayLoops: [...currentLoops, option] 
      });
    }
  };

  // Handler for adding a ship to the fleet
  const handleAddShip = (ship: UserShip) => {
    const currentShips = [...(profile?.ships || [])];
    updateProfile({
      ships: [...currentShips, ship]
    });
  };

  // Handler for removing a ship from the fleet
  const handleRemoveShip = (index: number) => {
    if (!profile?.ships) return;
    
    const currentShips = [...profile.ships];
    currentShips.splice(index, 1);
    updateProfile({
      ships: currentShips
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
      
      <div className="flex flex-col space-y-6">
        {/* Photo and basic info */}
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="relative">
            <div className="w-28 h-28 rounded-sm overflow-hidden border border-[rgba(var(--mg-primary),0.3)] relative">
              <Image 
                src={profile.photo || '/assets/avatar-placeholder.png'} 
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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
                <label className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-1">NAME</label>
                <input 
                  type="text" 
                  value={profile.name} 
                  onChange={(e) => updateProfile({ name: e.target.value })}
                  className="mg-input w-full text-base"
                  placeholder="Enter your name"
                />
              </div>
            ) : (
              <div className="font-quantify tracking-wide text-xl mb-2">{profile.name}</div>
            )}
            
            <div className="text-sm text-[rgba(var(--mg-text),0.7)] mb-3">
              <span className="text-xs text-[rgba(var(--mg-text),0.5)]">HANDLE: </span>
              {profile.handle}
            </div>
            
            <div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="mg-button-small text-xs px-5 py-1.5"
              >
                {isEditing ? 'SAVE CHANGES' : 'EDIT PROFILE'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Detailed Profile Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
          {/* Subsidiary/Division */}
          <div>
            <label className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-2">SUBSIDIARY/DIVISION</label>
            {isEditing ? (
              <select 
                value={profile.subsidiary}
                onChange={(e) => updateProfile({ subsidiary: e.target.value })}
                className="mg-select w-full text-base"
              >
                {subsidiaryOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <div className="text-base font-light border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] p-2 rounded-sm">
                {profile.subsidiary}
              </div>
            )}
          </div>
          
          {/* Pay Grade */}
          <div>
            <label className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-2">PAY GRADE</label>
            {isEditing ? (
              <select 
                value={profile.payGrade}
                onChange={(e) => updateProfile({ payGrade: e.target.value })}
                className="mg-select w-full text-base"
              >
                {payGradeOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <div className="text-base font-light border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] p-2 rounded-sm">
                {profile.payGrade}
              </div>
            )}
          </div>
          
          {/* Position */}
          <div>
            <label className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-2">POSITION</label>
            {isEditing ? (
              <input 
                type="text" 
                value={profile.position} 
                onChange={(e) => updateProfile({ position: e.target.value })}
                className="mg-input w-full text-base"
                placeholder="Enter your position"
              />
            ) : (
              <div className="text-base font-light border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] p-2 rounded-sm">
                {profile.position || 'Not specified'}
              </div>
            )}
          </div>
          
          {/* Email Address */}
          <div>
            <label className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-2">EMAIL ADDRESS</label>
            {isEditing ? (
              <input 
                type="email" 
                value={profile.email} 
                onChange={(e) => updateProfile({ email: e.target.value })}
                className="mg-input w-full text-base"
                placeholder="Enter your email"
              />
            ) : (
              <div className="text-base font-light border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] p-2 rounded-sm">
                {profile.email}
              </div>
            )}
          </div>
          
          {/* Timezone */}
          <div>
            <label className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-2">TIMEZONE</label>
            {isEditing ? (
              <select 
                value={profile.timezone}
                onChange={(e) => updateProfile({ timezone: e.target.value })}
                className="mg-select w-full text-base"
              >
                {timezoneOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <div className="text-base font-light border border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.4)] p-2 rounded-sm">
                {profile.timezone}
              </div>
            )}
          </div>
        </div>
        
        {/* Preferred Gameplay Loops */}
        <div className="mt-2">
          <label className="block text-xs text-[rgba(var(--mg-text),0.6)] mb-3">PREFERRED GAMEPLAY LOOP(S)</label>
          {isEditing ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gameplayLoopOptions.map(option => {
                const isSelected = profile.preferredGameplayLoops.includes(option);
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
              {profile.preferredGameplayLoops.length > 0 ? (
                profile.preferredGameplayLoops.map(loop => (
                  <div 
                    key={loop}
                    className="text-xs px-3 py-2 rounded-sm bg-[rgba(var(--mg-primary),0.1)] text-[rgba(var(--mg-primary),0.9)] border border-[rgba(var(--mg-primary),0.3)]"
                  >
                    {loop.toUpperCase()}
                  </div>
                ))
              ) : (
                <div className="text-sm text-[rgba(var(--mg-text),0.5)] py-2">No gameplay loops selected</div>
              )}
            </div>
          )}
        </div>

        {/* Fleet Builder / Ship Management Section */}
        <UserFleetBuilder
          isEditing={isEditing}
          userShips={profile.ships}
          resolvedShips={resolvedShips}
          onAddShip={handleAddShip}
          onRemoveShip={handleRemoveShip}
        />
      </div>
    </motion.div>
  );
} 