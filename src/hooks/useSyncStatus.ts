'use client';

import { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the GET /api/ships/sync-status response */
export interface SyncStatus {
  lastSyncAt: string | null;
  shipCount: number;
  status: string;
  syncVersion: number;
  deferredShips?: number;
  mirroredImages?: number;
  failedImages?: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Polling interval for sync status refresh: 5 minutes */
const POLL_INTERVAL_MS = 300_000;

/**
 * Fetch the latest ship sync status from GET /api/ships/sync-status.
 *
 * Fetches on mount and re-fetches every 5 minutes to keep freshness
 * indicator current. On error the last known `syncStatus` is retained
 * (rather than cleared) so the UI does not flicker, but `isStale` is set
 * and `lastCheckedAt` tracks the most recent successful poll so the UI can
 * indicate that freshness is unknown.
 *
 * Cleans up interval and in-flight requests on unmount.
 */
export function useSyncStatus(): {
  syncStatus: SyncStatus | null;
  isLoading: boolean;
  /** Timestamp (ms) of the most recent successful poll, or null if none yet. */
  lastCheckedAt: number | null;
  /** True when the latest poll failed and the retained data may be stale. */
  isStale: boolean;
} {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function fetchSyncStatus() {
      // Cancel any in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch('/api/ships/sync-status', {
          signal: controller.signal,
        });

        if (response.ok) {
          const data: SyncStatus = await response.json();
          setSyncStatus(data);
          setLastCheckedAt(Date.now());
          setIsStale(false);
        } else {
          // Non-OK response: retain last known data but flag it as stale
          setIsStale(true);
        }
      } catch {
        // Network/abort error -- retain last known data but flag as stale.
        // Ignore aborts triggered by a superseding poll or unmount.
        if (!controller.signal.aborted) {
          setIsStale(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    // Initial fetch
    fetchSyncStatus();

    // Poll every 5 minutes
    const intervalId = setInterval(fetchSyncStatus, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return { syncStatus, isLoading, lastCheckedAt, isStale };
}
