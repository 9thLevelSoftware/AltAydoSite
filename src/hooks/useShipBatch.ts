'use client';

import { useState, useEffect, useRef } from 'react';
import type { ShipDocument } from '@/types/ship';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Return type of the useShipBatch hook */
export interface UseShipBatchReturn {
  ships: Map<string, ShipDocument>;
  isLoading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of IDs per batch request (matches /api/ships/batch Zod limit) */
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Resolve an array of FleetYards UUIDs to a Map of ShipDocuments via
 * POST /api/ships/batch.
 *
 * - Deduplicates and filters empty/invalid IDs before fetching
 * - Chunks requests into batches of 50 to respect API limit
 * - Returns an empty Map immediately if no valid IDs are provided
 * - Uses AbortController for cleanup on unmount or when IDs change
 */
export function useShipBatch(ids: string[]): UseShipBatchReturn {
  const [ships, setShips] = useState<Map<string, ShipDocument>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to track the latest AbortController for cleanup
  const abortRef = useRef<AbortController | null>(null);

  // Normalize (filter empty + dedupe) and serialize into a collision-safe key.
  // JSON.stringify avoids the `join(',')` ambiguity (e.g. ['a,b'] vs ['a','b']
  // both serialize to the same comma-joined string) and is the real dependency
  // the effect reacts to, so no eslint-disable is needed below.
  const validIdsKey = JSON.stringify([...new Set(ids.filter((id) => id.trim().length > 0))]);

  useEffect(() => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    // Reconstruct the normalized IDs from the serialized key
    const validIds: string[] = JSON.parse(validIdsKey);

    // No valid IDs -- return empty Map immediately
    if (validIds.length === 0) {
      setShips(new Map());
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    async function fetchBatch() {
      setIsLoading(true);
      setError(null);

      try {
        // Chunk valid IDs into arrays of BATCH_SIZE
        const chunks: string[][] = [];
        for (let i = 0; i < validIds.length; i += BATCH_SIZE) {
          chunks.push(validIds.slice(i, i + BATCH_SIZE));
        }

        const merged = new Map<string, ShipDocument>();

        // Fetch each chunk sequentially to avoid overwhelming the API
        for (const chunk of chunks) {
          const response = await fetch('/api/ships/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: chunk }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.error || `Failed to fetch ships batch (${response.status})`);
          }

          const result: { items: ShipDocument[] } = await response.json();

          for (const ship of result.items) {
            merged.set(ship.fleetyardsId, ship);
          }
        }

        setShips(merged);
        setError(null);
      } catch (err: unknown) {
        // Don't update state if this request was aborted
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to fetch ships batch';
        // Clear any stale results so a genuine failure doesn't leave
        // previously-resolved ships visible to consumers.
        setShips(new Map());
        setError(message);
      } finally {
        // Only update loading if this controller is still current
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchBatch();

    return () => {
      controller.abort();
    };
  }, [validIdsKey]);

  return { ships, isLoading, error };
}
