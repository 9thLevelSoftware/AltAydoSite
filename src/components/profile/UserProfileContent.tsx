'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import Image from 'next/image';
import UserFleetBuilderWrapper from '../UserFleetBuilderWrapper';
import { UserShip } from '@/types/user';
import { TIMEZONE_OPTIONS, detectUserTimezone } from '@/lib/timezone';
import { MobiGlasButton, MobiGlasFormError } from '@/components/ui/mobiglas';
import CornerAccents from '@/components/ui/mobiglas/CornerAccents';
import { useShipBatch } from '@/hooks/useShipBatch';
import ProfileShipCard from '@/components/ships/ProfileShipCard';

interface UserData {
  name: string;
  email: string;
  aydoHandle: string;
  discordName: string;
  rsiAccountName: string;
  bio: string;
  photo: string;
  payGrade: string;
  position: string;
  division: string;
  timezone: string;
}

export default function UserProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userShips, setUserShips] = useState<UserShip[]>([]);
  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: '',
    aydoHandle: '',
    discordName: '',
    rsiAccountName: '',
    bio: '',
    photo: '',
    payGrade: '',
    position: '',
    division: '',
    timezone: ''
  });

  // Batch-resolve fleet ships from FleetYards API
  const fleetyardsIds = useMemo(
    () => userShips.map((s) => s.fleetyardsId).filter(Boolean),
    [userShips]
  );
  const { ships: resolvedShips, isLoading: shipsResolving } = useShipBatch(fleetyardsIds);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/userprofile');
    }
  }, [status, router]);

  // Fetch profile data when authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Set basic data from session
      setUserData(prevData => ({
        ...prevData,
        name: session.user.name || '',
        email: session.user.email || '',
        aydoHandle: session.user.aydoHandle || '',
        discordName: session.user.discordName || '',
        rsiAccountName: session.user.rsiAccountName || '',
      }));

      // Fetch complete profile data from API
      fetchProfileData();
    }
  }, [session, status]);

  // Refresh profile data periodically while editing to catch potential ship updates
  // But only refresh ships data, not form fields that user might be actively editing
  useEffect(() => {
    if (isEditing) {
      const interval = setInterval(() => {
        console.log('Refreshing ships data only (preserving form state)');
        fetchShipsData();
      }, 10000); // Check every 10 seconds while in edit mode (less frequent)

      return () => clearInterval(interval);
    }
  }, [isEditing]);

  const fetchProfileData = async () => {
    try {
      const response = await fetch('/api/profile', {
        headers: {
          'Cache-Control': 'no-cache' // Prevent caching issues
        },
        credentials: 'include' // Include session cookies
      });

      if (!response.ok) {
        // Special handling for 401 errors - just continue with default values
        if (response.status === 401) {
          console.log('User not authenticated, using default profile values');
          return;
        }
        const errorText = `Failed to fetch profile data: ${response.status} ${response.statusText}`;
        console.error('Error fetching profile data:', new Error(errorText));
        setErrorMessage('Could not load profile data. Using local data only.');
        return;
      }

      const profileData = await response.json();
      setUserData(prevData => ({
        ...prevData,
        discordName: profileData.discordName || '',
        rsiAccountName: profileData.rsiAccountName || '',
        bio: profileData.bio || '',
        photo: profileData.photo || '',
        payGrade: profileData.payGrade || '',
        position: profileData.position || '',
        division: profileData.division || '',
        timezone: profileData.timezone || ''
      }));

      // Set ships from profile data if available
      if (profileData.ships) {
        console.log('Fetched ships from API:', profileData.ships);
        setUserShips(profileData.ships);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      // Don't show errors for auth issues
      if (!String(error).includes('401')) {
        setErrorMessage('Could not load profile data. Using local data only.');
      }
    }
  };

  // Fetch only ships data without overwriting form fields (for background refresh)
  const fetchShipsData = async () => {
    try {
      const response = await fetch('/api/profile', {
        headers: {
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        return; // Silently fail for background refresh
      }

      const profileData = await response.json();

      // Only update ships, not form fields
      if (profileData.ships) {
        console.log('Background refresh: Updated ships data');
        setUserShips(profileData.ships);
      }
    } catch (error) {
      console.error('Background ships refresh failed:', error);
      // Silently fail for background refresh
    }
  };

  // Handler for ship changes from the fleet builder
  const handleShipsChange = (ships: UserShip[]) => {
    console.log('Profile received ship changes:', ships);
    setUserShips(ships);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size before upload (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage("Image size must be less than 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const img = document.createElement('img');
          img.onload = () => {
            // Create a canvas to resize image if necessary
            const canvas = document.createElement('canvas');

            // Define max dimensions for uniformity
            const MAX_WIDTH = 300;
            const MAX_HEIGHT = 300;

            let width = img.width;
            let height = img.height;

            // Resize if image is too large
            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
              const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
              width = width * ratio;
              height = height * ratio;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            // Convert to base64 with reduced quality
            const resizedImage = canvas.toDataURL('image/jpeg', 0.8);

            setUserData(prev => ({
              ...prev,
              photo: resizedImage
            }));
            setErrorMessage(null);
          };
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditToggle = () => {
    setIsEditing(prev => !prev);
    // Don't auto-revert changes when toggling edit mode
    // User can manually cancel if needed
  };

  const handleCancelEdit = () => {
    // Revert changes by refetching profile data
    fetchProfileData();
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      console.log('Saving profile with ships:', userShips);

      // Submit data to API
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // Prevent caching issues
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({
          discordName: userData.discordName,
          rsiAccountName: userData.rsiAccountName,
          bio: userData.bio,
          photo: userData.photo,
          payGrade: userData.payGrade,
          position: userData.position,
          division: userData.division,
          timezone: userData.timezone, // Include timezone in the update
          ships: userShips // Include the ships data in the update
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        const message = errorData.error || 'Failed to update profile';
        setErrorMessage(message);
        console.error('Error saving profile:', new Error(message));
        return;
      }

      // Update local state with the response
      const updatedProfile = await response.json();
      setUserData(prev => ({
        ...prev,
        discordName: updatedProfile.discordName || '',
        rsiAccountName: updatedProfile.rsiAccountName || '',
        bio: updatedProfile.bio || '',
        photo: updatedProfile.photo || '',
        payGrade: updatedProfile.payGrade || '',
        position: updatedProfile.position || '',
        division: updatedProfile.division || '',
        timezone: updatedProfile.timezone || ''
      }));

      // Update ships if provided in the response
      if (updatedProfile.ships) {
        console.log('Received updated ships from API:', updatedProfile.ships);
        setUserShips(updatedProfile.ships);
      }

      // Exit edit mode
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setErrorMessage(error.message || 'Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mg-loading-spinner">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 border border-[rgba(var(--mg-primary),0.2)] rounded-sm"></div>
              <div className="absolute inset-0 border-t-2 border-l-2 border-[rgba(var(--mg-primary),0.8)] rounded-sm animate-spin"></div>
            </div>
            <div className="mt-4 font-quantify tracking-wider text-xs">LOADING PROFILE</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-12">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="mg-title text-2xl mb-1">Employee Profile</h1>
        <div className="mg-subtitle text-xs tracking-wider">PERSONAL DATA MANAGEMENT</div>
      </motion.div>

      <div className="max-w-3xl mx-auto">
        {/* Profile Content */}
        <motion.div
          className="mg-panel bg-[rgba(var(--mg-panel),0.8)] backdrop-blur-md p-6 rounded-sm relative mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Corner brackets */}
          <CornerAccents size="md" color="primary" opacity="medium" />

          {/* Edit/Save Buttons */}
          <div className="flex justify-end mb-4">
            {isEditing ? (
              <div className="flex space-x-2">
                <MobiGlasButton
                  onClick={handleCancelEdit}
                  variant="secondary"
                  size="sm"
                  disabled={isSaving}
                >
                  CANCEL
                </MobiGlasButton>
                <MobiGlasButton
                  onClick={handleSaveProfile}
                  variant="primary"
                  size="sm"
                  disabled={isSaving}
                  isLoading={isSaving}
                >
                  SAVE CHANGES
                </MobiGlasButton>
              </div>
            ) : (
              <MobiGlasButton
                onClick={handleEditToggle}
                variant="primary"
                size="sm"
              >
                EDIT PROFILE
              </MobiGlasButton>
            )}
          </div>

          {errorMessage && (
            <MobiGlasFormError
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
              className="mb-4"
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Photo */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-40 h-40 rounded-sm overflow-hidden border border-[rgba(var(--mg-primary),0.3)] mb-2">
                  <div className="w-full h-full relative">
                    {userData.photo ? (
                      <Image
                        src={userData.photo}
                        alt="Profile"
                        width={160}
                        height={160}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[rgba(var(--mg-panel-dark),0.4)]">
                        <span className="text-[rgba(var(--mg-text),0.5)] text-xs">No Photo</span>
                      </div>
                    )}
                  </div>
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

              <div className="mt-2 text-center">
                <div className="mg-title text-lg">{userData.aydoHandle}</div>
                <div className="mg-subtitle text-xs tracking-wider">AYDOCORP EMPLOYEE</div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="md:col-span-2">
              <h2 className="mg-subtitle text-lg mb-4 tracking-wider">ACCOUNT INFORMATION</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                  <label htmlFor="profile-email" className="mg-subtitle text-xs mb-1 block tracking-wider">EMAIL ADDRESS</label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="profile-email"
                      name="email"
                      value={userData.email}
                      disabled
                      className="w-full py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm border border-[rgba(var(--mg-panel-dark),0.6)] text-[rgba(var(--mg-text),0.7)]"
                    />
                  ) : (
                    <div className="mg-value py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm">
                      {userData.email}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="profile-discord" className="mg-subtitle text-xs mb-1 block tracking-wider">DISCORD NAME</label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="profile-discord"
                      name="discordName"
                      value={userData.discordName}
                      onChange={handleInputChange}
                      className="w-full py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm border border-[rgba(var(--mg-primary),0.2)] focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none"
                    />
                  ) : (
                    <div className="mg-value py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm">
                      {userData.discordName || 'Not set'}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="profile-rsi" className="mg-subtitle text-xs mb-1 block tracking-wider">RSI ACCOUNT</label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="profile-rsi"
                      name="rsiAccountName"
                      value={userData.rsiAccountName}
                      onChange={handleInputChange}
                      className="w-full py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm border border-[rgba(var(--mg-primary),0.2)] focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none"
                    />
                  ) : (
                    <div className="mg-value py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm">
                      {userData.rsiAccountName || 'Not set'}
                    </div>
                  )}
                </div>

                <div className="mb-4 md:col-span-2">
                  <label htmlFor="profile-timezone" className="mg-subtitle text-xs mb-1 block tracking-wider">TIMEZONE</label>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <select
                        id="profile-timezone"
                        name="timezone"
                        value={userData.timezone}
                        onChange={handleInputChange}
                        className="flex-1 py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm border border-[rgba(var(--mg-primary),0.2)] focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none"
                      >
                        <option value="">Select Timezone</option>
                        {TIMEZONE_OPTIONS.map(tz => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const detectedTz = detectUserTimezone();
                          setUserData(prev => ({ ...prev, timezone: detectedTz }));
                        }}
                        className="px-3 py-2 bg-[rgba(var(--mg-primary),0.1)] hover:bg-[rgba(var(--mg-primary),0.2)] rounded-sm text-xs tracking-wider text-[rgba(var(--mg-primary),0.9)]"
                        title="Auto-detect timezone"
                      >
                        AUTO
                      </button>
                    </div>
                  ) : (
                    <div className="mg-value py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm">
                      {userData.timezone ?
                        TIMEZONE_OPTIONS.find(tz => tz.value === userData.timezone)?.label || userData.timezone
                        : 'Not set (UTC default)'}
                    </div>
                  )}
                </div>
              </div>

              {/* Employment Information */}
              <h2 className="mg-subtitle text-lg mt-6 mb-4 tracking-wider">EMPLOYMENT DETAILS</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                  <label htmlFor="profile-division" className="mg-subtitle text-xs mb-1 block tracking-wider">DIVISION</label>
                  {isEditing ? (
                    <select
                      id="profile-division"
                      name="division"
                      value={userData.division}
                      onChange={handleInputChange}
                      className="w-full py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm border border-[rgba(var(--mg-primary),0.2)] focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none"
                    >
                      <option value="">Select Division</option>
                      <option value="AydoCorp HQ">AydoCorp HQ</option>
                      <option value="Aydo Express">Aydo Express</option>
                      <option value="Aydo Mining">Aydo Mining</option>
                      <option value="Aydo Salvage">Aydo Salvage</option>
                      <option value="Aydo Security">Aydo Security</option>
                      <option value="Aydo Research">Aydo Research</option>
                      <option value="Aydo Medical">Aydo Medical</option>
                      <option value="Aydo Exploration">Aydo Exploration</option>
                    </select>
                  ) : (
                    <div className="mg-value py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm">
                      {userData.division || 'Not assigned'}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="profile-position" className="mg-subtitle text-xs mb-1 block tracking-wider">POSITION</label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="profile-position"
                      name="position"
                      value={userData.position}
                      onChange={handleInputChange}
                      className="w-full py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm border border-[rgba(var(--mg-primary),0.2)] focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none"
                    />
                  ) : (
                    <div className="mg-value py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm">
                      {userData.position || 'Not assigned'}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="profile-paygrade" className="mg-subtitle text-xs mb-1 block tracking-wider">PAY GRADE</label>
                  {isEditing ? (
                    <select
                      id="profile-paygrade"
                      name="payGrade"
                      value={userData.payGrade}
                      onChange={handleInputChange}
                      className="w-full py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm border border-[rgba(var(--mg-primary),0.2)] focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none"
                    >
                      <option value="">Select Pay Grade</option>
                      <option value="Entry Level">Entry Level</option>
                      <option value="Junior">Junior</option>
                      <option value="Senior">Senior</option>
                      <option value="Lead">Lead</option>
                      <option value="Director">Director</option>
                      <option value="Executive">Executive</option>
                    </select>
                  ) : (
                    <div className="mg-value py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm">
                      {userData.payGrade || 'Not assigned'}
                    </div>
                  )}
                </div>
              </div>

              {/* Biography Section */}
              <div className="mt-4">
                <label htmlFor="profile-bio" className="mg-subtitle text-xs mb-1 block tracking-wider">BIOGRAPHY</label>
                {isEditing ? (
                  <textarea
                    id="profile-bio"
                    name="bio"
                    value={userData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm border border-[rgba(var(--mg-primary),0.2)] focus:border-[rgba(var(--mg-primary),0.5)] focus:outline-none"
                  />
                ) : (
                  <div className="mg-value py-2 px-3 bg-[rgba(var(--mg-panel-dark),0.4)] rounded-sm min-h-[80px]">
                    {userData.bio || 'No biography provided'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {session?.user.role === 'admin' && (
            <div className="mt-6 pt-6 border-t border-[rgba(var(--mg-primary),0.2)]">
              <div className="mg-subtitle text-xs mb-2 tracking-wider text-[rgba(var(--mg-warning),0.8)]">ADMIN ACCESS</div>
              <p className="text-sm text-[rgba(var(--mg-text),0.7)]">You have administrative privileges. Access the admin dashboard for system management.</p>
              <div className="mt-3">
                <MobiGlasButton
                  onClick={() => router.push('/admin')}
                  variant="primary"
                  size="sm"
                >
                  ADMIN DASHBOARD
                </MobiGlasButton>
              </div>
            </div>
          )}

          {/* Fleet Builder Section (edit mode only) */}
          {isEditing && (
            <UserFleetBuilderWrapper
              isEditing={isEditing}
              onShipsChange={handleShipsChange}
            />
          )}

          {/* MY FLEET view-only section (read mode) */}
          {!isEditing && (
            <div className="mt-6 pt-6 border-t border-[rgba(var(--mg-primary),0.2)]">
              <h2 className="mg-subtitle text-xs mb-4 tracking-wider">MY FLEET</h2>

              {shipsResolving ? (
                <div className="space-y-2">
                  {Array.from({ length: Math.min(userShips.length || 3, 6) }).map((_, i) => (
                    <div
                      key={i}
                      className="h-24 bg-[rgba(var(--mg-panel-dark),0.4)] border border-[rgba(var(--mg-primary),0.1)] rounded-sm animate-pulse"
                    />
                  ))}
                </div>
              ) : userShips.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-[rgba(var(--mg-text),0.4)]">No ships in fleet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userShips.map((ship, index) => (
                    <ProfileShipCard
                      key={`${ship.fleetyardsId || ship.name}-${index}`}
                      ship={ship}
                      resolved={resolvedShips.get(ship.fleetyardsId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}