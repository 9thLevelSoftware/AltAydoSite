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
  timezone: 'UTC',
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
    preferredGameplayLoops:
      (serverData.preferredGameplayLoops as string[]) || DEFAULT_PROFILE.preferredGameplayLoops,
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
  if (updates.preferredGameplayLoops !== undefined)
    mapped.preferredGameplayLoops = updates.preferredGameplayLoops;
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
  // Identity (email) of the profile currently loaded, so a direct account switch
  // triggers a reload instead of retaining the previous user's profile (hooks-&-ty-11).
  const fetchedForRef = useRef<string | null>(null);
  // Serializes profile saves so versionRef advances deterministically and
  // concurrent edits cannot overwrite newer ones (hooks-&-ty-13).
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const saveSeqRef = useRef(0);

  // Load profile: server-first with localStorage fallback
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setIsLoading(false);
      fetchedForRef.current = null;
      return;
    }

    const email = session.user.email || '';

    // Only (re)load when the signed-in identity changes. On a direct account
    // switch the email differs, so reset state before loading the new profile
    // instead of retaining the previous user's data (hooks-&-ty-11).
    if (email === fetchedForRef.current) return;
    fetchedForRef.current = email;
    setProfile(null);
    versionRef.current = 0;
    setIsLoading(true);

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
                (!serverData.preferredGameplayLoops ||
                  serverData.preferredGameplayLoops.length === 0) &&
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
  }, [session?.user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update profile: optimistic local update + serialized server save
  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      if (!profile) return;

      const profileKey = getProfileKey(profile.email);

      // Capture prior state so a failed save can be rolled back (hooks-&-ty-12).
      const previousProfile = profile;
      const previousLocal = localStorage.getItem(profileKey);

      const rollback = () => {
        setProfile(previousProfile);
        if (previousLocal !== null) {
          localStorage.setItem(profileKey, previousLocal);
        } else {
          localStorage.removeItem(profileKey);
        }
      };

      // 1. Optimistic local state update + write-through cache.
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      localStorage.setItem(profileKey, JSON.stringify(updatedProfile));

      // 2. Map to server fields; skip the API call if nothing server-relevant changed.
      const serverUpdates = clientToServer(updates);
      if (Object.keys(serverUpdates).length === 0) return;

      // Identity used to reconcile the server-returned profile (name/handle/email
      // are session-derived and never part of the API payload).
      const identity = {
        name: profile.handle,
        email: profile.email,
        image: profile.photo,
      };

      // 3. Serialize saves through a promise chain and tag each with a sequence
      //    id so only the latest mutation reconciles client state. This keeps
      //    versionRef advancing deterministically and prevents an earlier save's
      //    response from overwriting a newer edit (hooks-&-ty-13).
      const seq = ++saveSeqRef.current;
      saveChainRef.current = saveChainRef.current
        .catch(() => {}) // isolate prior failures so the chain keeps flowing
        .then(async () => {
          try {
            const res = await fetch('/api/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...serverUpdates, __v: versionRef.current }),
            });

            if (res.ok) {
              const data = await res.json();
              versionRef.current = data.__v ?? versionRef.current;
              // Reconcile from the server's full profile rather than trusting the
              // optimistic merge; only the most recent save applies its result.
              if (seq === saveSeqRef.current) {
                const serverProfile = serverToClient(data, identity);
                setProfile(serverProfile);
                localStorage.setItem(profileKey, JSON.stringify(serverProfile));
              }
            } else if (res.status === 409) {
              // Conflict -- re-fetch authoritative server state.
              toast.info('Profile was modified elsewhere -- refreshed');
              const refreshRes = await fetch('/api/profile');
              if (refreshRes.ok) {
                const serverData = await refreshRes.json();
                versionRef.current = serverData.__v ?? 0;
                if (seq === saveSeqRef.current) {
                  const refreshedProfile = serverToClient(serverData, identity);
                  setProfile(refreshedProfile);
                  localStorage.setItem(profileKey, JSON.stringify(refreshedProfile));
                }
              }
            } else {
              // Save failed -- roll back the optimistic update so localStorage
              // is not left as the source of truth (hooks-&-ty-12).
              toast.error('Failed to save profile');
              if (seq === saveSeqRef.current) rollback();
            }
          } catch {
            toast.error('Failed to save profile');
            if (seq === saveSeqRef.current) rollback();
          }
        });
    },
    [profile, toast]
  );

  return {
    profile,
    isLoading,
    updateProfile,
  };
}
