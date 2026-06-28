'use client';

import { useState, useEffect, useRef } from 'react';
import type { ShipDocument } from '@/types/ship';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Return type of the useShipDetail hook */
export interface UseShipDetailReturn {
  ship: ShipDocument | null;
  isLoading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetch a single ship by its FleetYards UUID or URL slug from GET /api/ships/[id].
 *
 * Only fetches when shipId is truthy (non-null, non-empty string).
 * When shipId changes to null, resets ship to null without fetching.
 * Uses AbortController for cleanup on unmount or shipId change.
 */
export function useShipDetail(shipId: string | null): UseShipDetailReturn {
  const [ship, setShip] = useState<ShipDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    // When shipId is null/empty, reset state without fetching
    if (!shipId) {
      setShip(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    async function fetchShip() {
      setIsLoading(true);
      setError(null);
      // Blank the view while loading a new ship so stale data is never shown
      setShip(null);

      try {
        const response = await fetch(`/api/ships/${encodeURIComponent(shipId!)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || `Failed to fetch ship (${response.status})`);
        }

        const result: ShipDocument = await response.json();
        setShip(result);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to fetch ship';
        setError(message);
        // Clear stale ship so a failed fetch never displays the previous ship
        setShip(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchShip();

    return () => {
      controller.abort();
    };
  }, [shipId]);

  return { ship, isLoading, error };
}
