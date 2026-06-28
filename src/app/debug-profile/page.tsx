'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import UserProfilePanel from '../../components/UserProfilePanel';
import Link from 'next/link';

interface ServerProfile {
  id: string;
  aydoHandle: string;
  email: string;
  discordName?: string | null;
  rsiAccountName?: string | null;
  bio?: string | null;
  photo?: string | null;
  payGrade?: string | null;
  position?: string | null;
  division?: string | null;
  timezone?: string | null;
  preferredGameplayLoops?: string[];
  ships?: unknown[];
  __v?: number;
}

// localStorage keys whose values are non-sensitive (simple UI flags) and may be
// displayed verbatim. Any other key has its value masked below.
const SAFE_LOCALSTORAGE_KEYS = new Set(['hideFooter', 'loginAnimationShown']);

/**
 * Redacts the sensitive portion of a localStorage key. The profile cache key
 * embeds the user's email (`user_profile_<version>_<email>`), so collapse it to
 * a generic label.
 */
function redactStorageKey(key: string): string {
  if (key.startsWith('user_profile_')) {
    return 'user_profile_[redacted]';
  }
  return key;
}

/**
 * Builds a sanitized, non-sensitive view of the server profile. Email, photo,
 * raw id and ship payloads are redacted; only whitelisted fields are surfaced.
 */
function sanitizeServerProfile(p: ServerProfile) {
  return {
    aydoHandle: p.aydoHandle,
    discordName: p.discordName ?? null,
    rsiAccountName: p.rsiAccountName ?? null,
    bio: p.bio ?? null,
    payGrade: p.payGrade ?? null,
    position: p.position ?? null,
    division: p.division ?? null,
    timezone: p.timezone ?? null,
    preferredGameplayLoops: p.preferredGameplayLoops ?? [],
    // Redacted / summarized fields -- never dump raw sensitive values.
    email: '[redacted]',
    photo: p.photo ? '[redacted]' : null,
    id: '[redacted]',
    ships: Array.isArray(p.ships) ? `[${p.ships.length} item(s)]` : '[redacted]',
  };
}

export default function DebugUserProfilePage() {
  // NOTE: Access control is enforced server-side in layout.tsx (feature flag +
  // admin session gate). This component only renders for authorized users.
  const { data: session, status } = useSession();
  const [showDebugInfo, setShowDebugInfo] = useState(true);
  const [storageItems, setStorageItems] = useState<{ key: string; value: string }[]>([]);
  const [serverProfile, setServerProfile] = useState<ServerProfile | null>(null);
  const [serverLoading, setServerLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  // Safely access localStorage on the client side. Values are sanitized at
  // collection time so raw/sensitive contents are never held in React state or
  // rendered: known-safe flags are shown verbatim, everything else is masked.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const items: { key: string; value: string }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const rawValue = localStorage.getItem(key) || '';
          const value = SAFE_LOCALSTORAGE_KEYS.has(key)
            ? rawValue
            : `[masked -- ${rawValue.length} chars]`;
          items.push({ key: redactStorageKey(key), value });
        }
      }
      setStorageItems(items);
    }
  }, []);

  // Fetch server-side profile data
  useEffect(() => {
    if (status !== 'authenticated') {
      setServerLoading(false);
      return;
    }

    async function fetchServerProfile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setServerProfile(data);
        } else if (res.status === 401) {
          setServerError('Not authenticated');
        } else {
          setServerError(`API returned ${res.status}`);
        }
      } catch (err) {
        setServerError(`Network error: ${err instanceof Error ? err.message : 'unknown'}`);
      } finally {
        setServerLoading(false);
      }
    }

    fetchServerProfile();
  }, [status]);

  return (
    <div className="min-h-screen relative bg-[rgba(var(--mg-bg),1)] p-0 md:p-6">
      {/* Debugging Toolbar */}
      <div className="fixed top-0 left-0 w-full bg-[rgba(0,0,0,0.8)] p-3 z-50 text-white text-xs">
        <div className="flex items-center justify-between">
          <div>
            Debug Mode | Session Status: <span className="text-cyan-400">{status}</span>
            {session?.user?.role && (
              <>
                {' '}
                | Role: <span className="text-cyan-400">{session.user.role}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
            >
              {showDebugInfo ? 'Hide Debug' : 'Show Debug'}
            </button>
            <Link
              href="/reset-profile"
              className="px-2 py-1 bg-red-800 hover:bg-red-700 rounded text-xs"
            >
              Reset Profile
            </Link>
            <Link
              href="/userprofile"
              className="px-2 py-1 bg-blue-800 hover:bg-blue-700 rounded text-xs"
            >
              Normal Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto max-w-4xl pt-12 pb-8">
        {showDebugInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Server Profile Section */}
            <div className="p-4 bg-[rgba(0,0,0,0.6)] text-white rounded overflow-auto max-h-[300px] text-xs">
              <h3 className="font-bold mb-2 text-green-400">Server Profile (API):</h3>
              {serverLoading ? (
                <p className="text-gray-400">Loading...</p>
              ) : serverError ? (
                <p className="text-red-400">{serverError}</p>
              ) : serverProfile ? (
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(sanitizeServerProfile(serverProfile), null, 2)}
                </pre>
              ) : (
                <p className="text-gray-400">No server profile data</p>
              )}
            </div>

            {/* LocalStorage Section */}
            <div className="p-4 bg-[rgba(0,0,0,0.6)] text-white rounded overflow-auto max-h-[300px] text-xs">
              <h3 className="font-bold mb-2 text-cyan-400">LocalStorage Contents (Cache):</h3>
              <pre className="whitespace-pre-wrap">
                {storageItems.length > 0 ? (
                  storageItems.map(({ key, value }, index) => (
                    <div key={index} className="mb-2">
                      <div>
                        <span className="text-cyan-400">{key}</span>
                      </div>
                      <div className="pl-4">{value}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No localStorage items</p>
                )}
              </pre>
            </div>
          </div>
        )}

        <UserProfilePanel />
      </div>
    </div>
  );
}
