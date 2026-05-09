'use client';

import React, { useReducer, useEffect, useState, useCallback } from 'react';
import { useShips } from '@/hooks/useShips';
import ShipSearchBar from '@/components/ships/ShipSearchBar';
import ShipFilterPanel from '@/components/ships/ShipFilterPanel';
import ShipFilterChips from '@/components/ships/ShipFilterChips';
import ShipGrid from '@/components/ships/ShipGrid';
import ShipPagination from '@/components/ships/ShipPagination';
import ShipDetailPanel from '@/components/ships/ShipDetailPanel';
import SyncStatusIndicator from '@/components/ships/SyncStatusIndicator';
import { formatSize, formatProductionStatus } from '@/lib/ships/format';
import type { ShipDocument } from '@/types/ship';

// ---------------------------------------------------------------------------
// State Management
// ---------------------------------------------------------------------------

interface FilterState {
  page: number;
  pageSize: number;
  manufacturer: string;
  size: string;
  classification: string;
  productionStatus: string;
  search: string;
  viewMode: 'grid' | 'list';
  filterPanelOpen: boolean;
  selectedShipId: string | null;
}

type FilterAction =
  | { type: 'SET_FILTER'; key: string; value: string }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_VIEW_MODE'; mode: 'grid' | 'list' }
  | { type: 'TOGGLE_FILTER_PANEL' }
  | { type: 'SELECT_SHIP'; shipId: string | null }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_SEARCH'; search: string };

const initialState: FilterState = {
  page: 1,
  pageSize: 24,
  manufacturer: '',
  size: '',
  classification: '',
  productionStatus: '',
  search: '',
  viewMode: 'grid',
  filterPanelOpen: false,
  selectedShipId: null,
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_FILTER':
      return {
        ...state,
        [action.key]: action.value,
        page: 1, // Reset page when filter changes
      };
    case 'SET_PAGE':
      return { ...state, page: action.page };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    case 'TOGGLE_FILTER_PANEL':
      return { ...state, filterPanelOpen: !state.filterPanelOpen };
    case 'SELECT_SHIP':
      return { ...state, selectedShipId: action.shipId };
    case 'CLEAR_FILTERS':
      return {
        ...state,
        manufacturer: '',
        size: '',
        classification: '',
        productionStatus: '',
        search: '',
        page: 1,
      };
    case 'SET_SEARCH':
      return { ...state, search: action.search, page: 1 };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Manufacturer lookup types
// ---------------------------------------------------------------------------

interface ManufacturerOption {
  name: string;
  slug: string;
}

/** Title-case a classification key (e.g. "multi_role" -> "Multi Role"). */
function formatClassification(value: string): string {
  if (!value) return '';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Main orchestrator for the ship browsing experience.
 *
 * Manages all state (filters, pagination, view mode, detail panel selection)
 * via useReducer to avoid stale closures. Connects the useShips data hook
 * to all display components: search bar, filter panel, filter chips, grid,
 * pagination, detail panel, and sync status indicator.
 */
export default function ShipBrowsePage() {
  const [state, dispatch] = useReducer(filterReducer, initialState);

  // Manufacturer lookup for resolving slugs to display names in filter chips
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/ships/manufacturers', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { items: ManufacturerOption[] }) => {
        setManufacturers(data.items);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('[ShipBrowsePage] Failed to fetch manufacturers:', err);
        }
      });

    return () => controller.abort();
  }, []);

  // Fetch ships with current filter state
  const { data, isLoading, error } = useShips({
    page: state.page,
    pageSize: state.pageSize,
    manufacturer: state.manufacturer || undefined,
    size: state.size || undefined,
    classification: state.classification || undefined,
    productionStatus: state.productionStatus || undefined,
    search: state.search || undefined,
  });

  // ---------------------------------------------------------------------------
  // Callbacks (stable references via useCallback)
  // ---------------------------------------------------------------------------

  const handleFilterChange = useCallback((key: string, value: string) => {
    dispatch({ type: 'SET_FILTER', key, value });
  }, []);

  const handleClearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  const handleToggleFilterPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_FILTER_PANEL' });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    dispatch({ type: 'SET_SEARCH', search: value });
  }, []);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    dispatch({ type: 'SET_VIEW_MODE', mode });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', page });
    // Scroll to top on page change for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleShipClick = useCallback((ship: ShipDocument) => {
    dispatch({ type: 'SELECT_SHIP', shipId: ship.fleetyardsId });
  }, []);

  const handleCloseDetail = useCallback(() => {
    dispatch({ type: 'SELECT_SHIP', shipId: null });
  }, []);

  const handleRemoveChip = useCallback((key: string) => {
    dispatch({ type: 'SET_FILTER', key, value: '' });
  }, []);

  // ---------------------------------------------------------------------------
  // Derived values for filter chips
  // ---------------------------------------------------------------------------

  const chipFilters: Record<string, string> = {
    manufacturer: state.manufacturer,
    size: state.size,
    classification: state.classification,
    productionStatus: state.productionStatus,
  };

  // Resolve filter values to human-readable labels
  const chipLabels: Record<string, string> = {};
  if (state.manufacturer) {
    const match = manufacturers.find((m) => m.slug === state.manufacturer);
    chipLabels.manufacturer = match ? match.name : state.manufacturer;
  }
  if (state.size) {
    chipLabels.size = formatSize(state.size);
  }
  if (state.classification) {
    chipLabels.classification = formatClassification(state.classification);
  }
  if (state.productionStatus) {
    chipLabels.productionStatus = formatProductionStatus(state.productionStatus);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const ships = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Page Header */}
      <div>
        <h1 className="text-[rgba(var(--mg-primary),0.9)] text-2xl md:text-3xl font-quantify tracking-wider">
          Fleet Database
        </h1>
        <p className="text-[rgba(var(--mg-text),0.5)] text-sm mt-1">
          Browse and explore the complete Star Citizen ship database
        </p>
      </div>

      {/* Search Bar */}
      <ShipSearchBar value={state.search} onChange={handleSearchChange} />

      {/* Filter Panel */}
      <ShipFilterPanel
        filters={{
          manufacturer: state.manufacturer,
          size: state.size,
          classification: state.classification,
          productionStatus: state.productionStatus,
        }}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearFilters}
        isOpen={state.filterPanelOpen}
        onToggle={handleToggleFilterPanel}
      />

      {/* Filter Chips (show active filters when panel is collapsed) */}
      {!state.filterPanelOpen && (
        <ShipFilterChips filters={chipFilters} labels={chipLabels} onRemove={handleRemoveChip} />
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-6">
          <p className="text-[rgba(var(--mg-danger),0.9)] text-sm">{error}</p>
          <p className="text-[rgba(var(--mg-text),0.4)] text-xs mt-1">
            Check your connection and try again
          </p>
        </div>
      )}

      {/* Ship Grid */}
      <ShipGrid
        ships={ships}
        total={total}
        isLoading={isLoading}
        viewMode={state.viewMode}
        onViewModeChange={handleViewModeChange}
        onShipClick={handleShipClick}
      />

      {/* Pagination */}
      {!isLoading && totalPages > 0 && (
        <ShipPagination
          page={state.page}
          totalPages={totalPages}
          total={total}
          pageSize={state.pageSize}
          onPageChange={handlePageChange}
        />
      )}

      {/* Sync Status Footer */}
      <div className="flex justify-center pt-2 pb-4">
        <SyncStatusIndicator />
      </div>

      {/* Detail Panel (slide-out overlay) */}
      <ShipDetailPanel shipId={state.selectedShipId} onClose={handleCloseDetail} />
    </div>
  );
}
