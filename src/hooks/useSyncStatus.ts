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
 * indicator current. No error state is exposed -- sync freshness is
 * non-critical UI; on error the hook simply returns null.
 *
 * Cleans up interval and in-flight requests on unmount.
 */
export function useSyncStatus(): {
  syncStatus: SyncStatus | null;
  isLoading: boolean;
} {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        }
      } catch {
        // Silently swallow errors -- freshness indicator is non-critical
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

  return { syncStatus, isLoading };
}
