'use client';

import { useState, useEffect, useRef } from 'react';
import type { ShipDocument } from '@/types/ship';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Filter parameters for the ship list query */
export interface ShipFilters {
  page: number;
  pageSize: number;
  manufacturer?: string;
  size?: string;
  classification?: string;
  productionStatus?: string;
  search?: string;
  /**
   * When false, the hook skips fetching entirely (e.g. while a modal that
   * owns this query is closed). Defaults to true.
   */
  enabled?: boolean;
}

/** Paginated result set matching the GET /api/ships response shape */
export interface ShipQueryResult {
  items: ShipDocument[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Return type of the useShips hook */
export interface UseShipsReturn {
  data: ShipQueryResult | null;
  isLoading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated, filtered list of ships from GET /api/ships.
 *
 * Re-fetches whenever any filter value changes. Uses AbortController to
 * cancel in-flight requests when filters change (prevents race conditions).
 */
export function useShips(filters: ShipFilters): UseShipsReturn {
  const [data, setData] = useState<ShipQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref to track the latest AbortController for cleanup
  const abortRef = useRef<AbortController | null>(null);

  const enabled = filters.enabled ?? true;

  useEffect(() => {
    // Skip fetching while disabled (e.g. the owning modal is closed)
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    async function fetchShips() {
      setIsLoading(true);
      setError(null);

      try {
        // Build query string from filters, skipping undefined/empty values
        const params = new URLSearchParams();
        params.set('page', String(filters.page));
        params.set('pageSize', String(filters.pageSize));

        if (filters.manufacturer) params.set('manufacturer', filters.manufacturer);
        if (filters.size) params.set('size', filters.size);
        if (filters.classification) params.set('classification', filters.classification);
        if (filters.productionStatus) params.set('productionStatus', filters.productionStatus);
        if (filters.search) params.set('search', filters.search);

        const response = await fetch(`/api/ships?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || `Failed to fetch ships (${response.status})`);
        }

        const result: ShipQueryResult = await response.json();
        setData(result);
        setError(null);
      } catch (err: unknown) {
        // Don't update state if this request was aborted
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to fetch ships';
        // Clear any previous results so a genuine failure can't display
        // stale data that no longer matches the current filters.
        setData(null);
        setError(message);
      } finally {
        // Only update loading if this controller is still current
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchShips();

    return () => {
      controller.abort();
    };
  }, [
    filters.page,
    filters.pageSize,
    filters.manufacturer,
    filters.size,
    filters.classification,
    filters.productionStatus,
    filters.search,
    enabled,
  ]);

  return { data, isLoading, error };
}
