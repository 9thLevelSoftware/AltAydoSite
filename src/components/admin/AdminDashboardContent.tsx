'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cdn } from '@/lib/cdn';

/**
 * Discord auto-sync health, derived from a read-only admin status endpoint.
 * Until that endpoint reports a verified state we render an honest "unknown"
 * indicator rather than claiming the sync is healthy.
 */
type SyncState = 'active' | 'degraded' | 'error' | 'unknown';

interface DiscordSyncStatus {
  state: SyncState;
  /** ISO timestamp of the last completed run, or null if never/unknown. */
  lastSyncAt: string | null;
  /** Human-readable schedule label (e.g. "Every 6 hours"), or null if unverified. */
  intervalLabel: string | null;
}

const UNKNOWN_STATUS: DiscordSyncStatus = {
  state: 'unknown',
  lastSyncAt: null,
  intervalLabel: null,
};

/**
 * Full literal className strings per state so Tailwind's JIT can see them at
 * build time (no runtime string concatenation of arbitrary values).
 */
const SYNC_STATE_DISPLAY: Record<
  SyncState,
  { label: string; dot: string; text: string; panel: string }
> = {
  active: {
    label: 'Auto-sync Active',
    dot: 'w-2 h-2 rounded-full bg-[rgba(var(--mg-success),0.8)] animate-pulse',
    text: 'text-sm text-[rgba(var(--mg-success),0.9)]',
    panel:
      'flex items-center justify-between p-3 rounded bg-[rgba(var(--mg-success),0.1)] border border-[rgba(var(--mg-success),0.3)]',
  },
  degraded: {
    label: 'Auto-sync Degraded',
    dot: 'w-2 h-2 rounded-full bg-[rgba(var(--mg-warning),0.9)]',
    text: 'text-sm text-[rgba(var(--mg-warning),0.9)]',
    panel:
      'flex items-center justify-between p-3 rounded bg-[rgba(var(--mg-warning),0.1)] border border-[rgba(var(--mg-warning),0.3)]',
  },
  error: {
    label: 'Auto-sync Error',
    dot: 'w-2 h-2 rounded-full bg-[rgba(var(--mg-danger),0.9)]',
    text: 'text-sm text-[rgba(var(--mg-danger),0.9)]',
    panel:
      'flex items-center justify-between p-3 rounded bg-[rgba(var(--mg-danger),0.1)] border border-[rgba(var(--mg-danger),0.3)]',
  },
  unknown: {
    label: 'Status Unverified',
    dot: 'w-2 h-2 rounded-full bg-gray-500',
    text: 'text-sm text-gray-400',
    panel:
      'flex items-center justify-between p-3 rounded bg-black/20 border border-[rgba(var(--mg-primary),0.2)]',
  },
};

/** Map a raw status string from the API into one of our display states. */
function toSyncState(raw: unknown): SyncState {
  switch (raw) {
    case 'success':
    case 'active':
    case 'ok':
      return 'active';
    case 'partial':
    case 'degraded':
      return 'degraded';
    case 'error':
    case 'failed':
      return 'error';
    default:
      return 'unknown';
  }
}

export default function AdminDashboardContent() {
  const [syncStatus, setSyncStatus] = useState<DiscordSyncStatus>(UNKNOWN_STATUS);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        // Read-only health endpoint. This must NOT be the trigger endpoint
        // (/api/admin/discord-sync GET runs a full sync as a side effect).
        const res = await fetch('/api/admin/discord-sync/status', {
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`Status request failed: ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;

        const intervalHours = typeof data.intervalHours === 'number' ? data.intervalHours : null;

        setSyncStatus({
          state: toSyncState(data.status ?? data.state),
          lastSyncAt: typeof data.lastSyncAt === 'string' ? data.lastSyncAt : null,
          intervalLabel:
            typeof data.intervalLabel === 'string'
              ? data.intervalLabel
              : intervalHours !== null
                ? `Every ${intervalHours} hours`
                : null,
        });
      } catch {
        // Endpoint missing/unreachable -> show an honest unknown state rather
        // than a hard-coded "healthy" indicator.
        if (!cancelled) setSyncStatus(UNKNOWN_STATUS);
      }
    }

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusDisplay = SYNC_STATE_DISPLAY[syncStatus.state];
  const lastSyncLabel = syncStatus.lastSyncAt
    ? `Last run ${new Date(syncStatus.lastSyncAt).toLocaleString()}`
    : 'Last run unknown';
  const intervalText = syncStatus.intervalLabel ?? 'Schedule unverified';

  return (
    <div className="relative min-h-[100vh] overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(0,20,40,0.9)] to-[rgba(0,10,20,0.95)] z-0"></div>
      <div className="absolute inset-0 hexagon-bg opacity-10 pointer-events-none z-0"></div>
      <div className="absolute inset-0 mg-grid-bg z-0"></div>

      {/* Space background */}
      <div className="absolute inset-0 z-0 opacity-20">
        <Image
          src={cdn('/spacebg.jpg')}
          alt="Space Background"
          fill
          className="object-cover"
          unoptimized
        />
      </div>

      {/* Organization Header */}
      <div className="relative z-10 pt-8 mb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <div className="text-center">
            <h1 className="text-2xl font-light text-[rgba(var(--mg-primary),1)] font-['Quantify'] tracking-wider">
              ADMIN CONSOLE
            </h1>
            <div className="w-40 h-1 mx-auto my-2 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.5)] to-transparent"></div>
          </div>
        </div>
      </div>

      {/* Admin Dashboard Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="mg-container p-6 backdrop-blur-md">
          {/* Top Controls with Logo */}
          <div className="relative mb-5">
            {/* Centered Logo - Positioned absolutely to break from parent height constraints */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 mt-1.5">
              <Image
                src={cdn('/Aydo_Corp_3x3k_RSI.png')}
                alt="AydoCorp"
                width={192}
                height={192}
                className="h-48 object-contain"
                style={{ filter: 'drop-shadow(0 0 14px rgba(0, 180, 230, 0.8))' }}
              />
            </div>

            {/* Admin controls container - reduced height */}
            <div className="flex justify-between items-center py-1">
              <div className="text-base text-[rgba(var(--mg-primary),1)]">
                Administrator Console
              </div>

              {/* Empty div for centering - to ensure logo stays centered */}
              <div className="flex-grow"></div>

              <Link
                href="/dashboard"
                className="px-3 py-1.5 bg-[rgba(var(--mg-primary),0.2)] hover:bg-[rgba(var(--mg-primary),0.3)] text-[rgba(var(--mg-primary),0.9)] rounded transition-colors text-xs"
              >
                Return to Employee Portal
              </Link>
            </div>
          </div>

          {/* Admin Section */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* User Management */}
            <div className="border border-[rgba(var(--mg-primary),0.3)] bg-black/30 rounded p-4">
              <div className="text-lg text-[rgba(var(--mg-primary),1)] mb-3 font-['Quantify']">
                User Management
              </div>
              <div className="text-sm text-gray-400 mb-4">
                Manage user roles, clearance levels, and organization assignments
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Coming soon"
                  className="px-4 py-2 bg-[rgba(var(--mg-primary),0.1)] text-[rgba(var(--mg-primary),0.5)] rounded cursor-not-allowed opacity-60"
                >
                  Configure Users
                </button>
                <span className="text-[10px] uppercase tracking-wider text-[rgba(var(--mg-warning),0.8)]">
                  Coming soon
                </span>
              </div>
            </div>

            {/* Clearance Levels */}
            <div className="border border-[rgba(var(--mg-primary),0.3)] bg-black/30 rounded p-4">
              <div className="text-lg text-[rgba(var(--mg-primary),1)] mb-3 font-['Quantify']">
                Clearance Levels
              </div>
              <div className="text-sm text-gray-400 mb-4">
                Define security clearance levels and access permissions
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Coming soon"
                  className="px-4 py-2 bg-[rgba(var(--mg-primary),0.1)] text-[rgba(var(--mg-primary),0.5)] rounded cursor-not-allowed opacity-60"
                >
                  Manage Clearances
                </button>
                <span className="text-[10px] uppercase tracking-wider text-[rgba(var(--mg-warning),0.8)]">
                  Coming soon
                </span>
              </div>
            </div>

            {/* Organization Structure */}
            <div className="border border-[rgba(var(--mg-primary),0.3)] bg-black/30 rounded p-4">
              <div className="text-lg text-[rgba(var(--mg-primary),1)] mb-3 font-['Quantify']">
                Organization Structure
              </div>
              <div className="text-sm text-gray-400 mb-4">
                Configure departments, divisions, and organizational units
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Coming soon"
                  className="px-4 py-2 bg-[rgba(var(--mg-primary),0.1)] text-[rgba(var(--mg-primary),0.5)] rounded cursor-not-allowed opacity-60"
                >
                  Edit Structure
                </button>
                <span className="text-[10px] uppercase tracking-wider text-[rgba(var(--mg-warning),0.8)]">
                  Coming soon
                </span>
              </div>
            </div>
          </div>

          {/* Discord Integration */}
          <div className="border border-[rgba(var(--mg-primary),0.3)] bg-black/30 rounded p-6">
            <div className="text-lg text-[rgba(var(--mg-primary),1)] mb-3 font-['Quantify']">
              Discord Integration
            </div>
            <div className="text-sm text-gray-400 mb-4">
              Automatic background sync keeps user profiles updated with Discord server roles
            </div>

            <div className="space-y-3">
              <div className={statusDisplay.panel}>
                <div className="flex items-center space-x-2">
                  <div className={statusDisplay.dot}></div>
                  <span className={statusDisplay.text}>{statusDisplay.label}</span>
                </div>
                <span className="text-xs text-gray-400">{intervalText}</span>
              </div>

              <div className="text-xs text-gray-500">{lastSyncLabel}</div>

              <div className="text-xs text-gray-500">
                • Automatically matches users with Discord members
                <br />
                • Updates divisions and positions based on current roles
                <br />• Runs in background without manual intervention
              </div>
            </div>
          </div>

          {/* Placeholder for more functionality */}
          <div className="border border-[rgba(var(--mg-primary),0.3)] bg-black/30 rounded p-6 text-center">
            <div className="text-lg text-[rgba(var(--mg-primary),1)] mb-3">
              Admin Dashboard Under Development
            </div>
            <div className="text-sm text-gray-400 mb-4">
              The controls above are placeholders and not yet wired up. This page will be expanded
              to include full admin functionality, including:
              <br />
              • User role management
              <br />
              • Clearance level configuration
              <br />
              • Organization structure customization
              <br />• Content management
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-6 pb-4 text-center text-xs text-gray-500">
        <div className="w-40 h-1 mx-auto mb-2 bg-gradient-to-r from-transparent via-[rgba(var(--mg-primary),0.2)] to-transparent"></div>
        © AydoCorp • Administrator Access • Security Level Alpha
      </div>
    </div>
  );
}
