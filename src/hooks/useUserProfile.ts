'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile } from '../types/UserProfile';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/useToast';

const PROFILE_VERSION = 'v1';

const DEFAULT_PROFILE: Omit<UserProfile, 'handle' | 'email'> = {
  name: '',
  photo: '/assets/avatar-placeholder.png',
  subsidiary: 'AydoCorp HQ',
  payGrade: 'Entry Level',
  position: '',
  timezone: 'UTC+00:00',
  preferredGameplayLoops: [],
  ships: [],
};

function getProfileKey(email: string): string {
  return `user_profile_${PROFILE_VERSION}_${email}`;
}

/**
 * Maps server User fields to client UserProfile fields.
 */
function serverToClient(
  serverData: Record<string, unknown>,
  session: { name?: string | null; email?: string | null; image?: string | null }
): UserProfile {
  return {
    name: (session.name as string) || '',
    handle: (session.name as string) || '',
    email: (session.email as string) || '',
    photo: (serverData.photo as string) || session.image || DEFAULT_PROFILE.photo,
    subsidiary: (serverData.division as string) || DEFAULT_PROFILE.subsidiary,
    payGrade: (serverData.payGrade as string) || DEFAULT_PROFILE.payGrade,
    position: (serverData.position as string) || DEFAULT_PROFILE.position,
    timezone: (serverData.timezone as string) || DEFAULT_PROFILE.timezone,
    preferredGameplayLoops: (serverData.preferredGameplayLoops as string[]) || DEFAULT_PROFILE.preferredGameplayLoops,
    ships: (serverData.ships as UserProfile['ships']) || DEFAULT_PROFILE.ships,
  };
}

/**
 * Maps client UserProfile update fields to server User fields.
 * Only includes fields that should be sent to the API.
 */
function clientToServer(updates: Partial<UserProfile>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  if (updates.subsidiary !== undefined) mapped.division = updates.subsidiary;
  if (updates.photo !== undefined) mapped.photo = updates.photo;
  if (updates.payGrade !== undefined) mapped.payGrade = updates.payGrade;
  if (updates.position !== undefined) mapped.position = updates.position;
  if (updates.timezone !== undefined) mapped.timezone = updates.timezone;
  if (updates.preferredGameplayLoops !== undefined) mapped.preferredGameplayLoops = updates.preferredGameplayLoops;
  if (updates.ships !== undefined) mapped.ships = updates.ships;

  // name, handle, email are derived from session -- do not send to API
  return mapped;
}

export function useUserProfile() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const versionRef = useRef<number>(0);
  const hasFetchedRef = useRef(false);

  // Load profile: server-first with localStorage fallback
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setIsLoading(false);
      hasFetchedRef.current = false;
      return;
    }

    // Prevent duplicate fetches for same session
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const email = session.user.email || '';
    const profileKey = getProfileKey(email);

    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');

        if (res.ok) {
          const serverData = await res.json();
          versionRef.current = serverData.__v ?? 0;

          const clientProfile = serverToClient(serverData, session!.user!);

          // One-time localStorage migration: if server has no gameplay loops but localStorage does
          const savedLocal = localStorage.getItem(profileKey);
          if (savedLocal) {
            try {
              const parsed = JSON.parse(savedLocal);
              if (
                (!serverData.preferredGameplayLoops || serverData.preferredGameplayLoops.length === 0) &&
                parsed.preferredGameplayLoops &&
                parsed.preferredGameplayLoops.length > 0
              ) {
                // Migrate localStorage gameplay loops to server
                await fetch('/api/profile', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    preferredGameplayLoops: parsed.preferredGameplayLoops,
                    __v: versionRef.current,
                  }),
                });
                clientProfile.preferredGameplayLoops = parsed.preferredGameplayLoops;
              }
            } catch {
              // Ignore parse errors from old localStorage data
            }
            // Clear old localStorage profile after successful server load
            localStorage.removeItem(profileKey);
          }

          // Write server data to localStorage as cache
          localStorage.setItem(profileKey, JSON.stringify(clientProfile));
          setProfile(clientProfile);
        } else {
          // API error -- fall back to localStorage
          fallbackToLocalStorage(email, profileKey);
        }
      } catch {
        // Network error -- fall back to localStorage
        fallbackToLocalStorage(email, profileKey);
      } finally {
        setIsLoading(false);
      }
    }

    function fallbackToLocalStorage(email: string, profileKey: string) {
      const saved = localStorage.getItem(profileKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (!parsed.ships) parsed.ships = [];
          if (!parsed.preferredGameplayLoops) parsed.preferredGameplayLoops = [];
          setProfile(parsed);
          return;
        } catch {
          // Fall through to defaults
        }
      }
      // Create default profile from session
      setProfile({
        ...DEFAULT_PROFILE,
        name: session!.user!.name || '',
        handle: session!.user!.name || '',
        email,
        photo: session!.user!.image || DEFAULT_PROFILE.photo,
      });
    }

    loadProfile();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update profile: optimistic local update + server save
  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      if (!profile) return;

      // 1. Optimistic local state update
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);

      // 2. Write-through to localStorage cache
      const profileKey = getProfileKey(profile.email);
      localStorage.setItem(profileKey, JSON.stringify(updatedProfile));

      // 3. Map to server fields and save via API
      const serverUpdates = clientToServer(updates);

      // Skip API call if no server-relevant fields changed
      if (Object.keys(serverUpdates).length === 0) return;

      fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...serverUpdates, __v: versionRef.current }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            versionRef.current = data.__v ?? versionRef.current;
          } else if (res.status === 409) {
            // Conflict -- re-fetch from server
            toast.info('Profile was modified elsewhere -- refreshed');
            hasFetchedRef.current = false;
            const refreshRes = await fetch('/api/profile');
            if (refreshRes.ok) {
              const serverData = await refreshRes.json();
              versionRef.current = serverData.__v ?? 0;
              const refreshedProfile = serverToClient(serverData, {
                name: profile.handle,
                email: profile.email,
                image: profile.photo,
              });
              setProfile(refreshedProfile);
              localStorage.setItem(profileKey, JSON.stringify(refreshedProfile));
            }
          } else {
            toast.error('Failed to save profile');
          }
        })
        .catch(() => {
          toast.error('Failed to save profile');
        });
    },
    [profile, toast],
  );

  return {
    profile,
    isLoading,
    updateProfile,
  };
}
