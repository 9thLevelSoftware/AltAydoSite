'use client';

import React, { useReducer, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useShips } from '@/hooks/useShips';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import ShipFilterPanel from '@/components/ships/ShipFilterPanel';
import ShipSearchBar from '@/components/ships/ShipSearchBar';
import ShipCard from '@/components/ships/ShipCard';
import type { ShipDocument } from '@/types/ship';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FleetShipPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ship: ShipDocument) => void;
}

// ---------------------------------------------------------------------------
// State Management (useReducer pattern from 05-05 decision)
// ---------------------------------------------------------------------------

interface PickerState {
  page: number;
  pageSize: number;
  manufacturer: string;
  size: string;
  classification: string;
  productionStatus: string;
  search: string;
  filterPanelOpen: boolean;
}

type PickerAction =
  | { type: 'SET_FILTER'; key: string; value: string }
  | { type: 'SET_SEARCH'; search: string }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'TOGGLE_FILTER_PANEL' }
  | { type: 'RESET' };

const initialState: PickerState = {
  page: 1,
  pageSize: 12,
  manufacturer: '',
  size: '',
  classification: '',
  productionStatus: '',
  search: '',
  filterPanelOpen: false,
};

function pickerReducer(state: PickerState, action: PickerAction): PickerState {
  switch (action.type) {
    case 'SET_FILTER':
      return { ...state, [action.key]: action.value, page: 1 };
    case 'SET_SEARCH':
      return { ...state, search: action.search, page: 1 };
    case 'SET_PAGE':
      return { ...state, page: action.page };
    case 'TOGGLE_FILTER_PANEL':
      return { ...state, filterPanelOpen: !state.filterPanelOpen };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Skeleton Grid
// ---------------------------------------------------------------------------

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-[rgba(var(--mg-primary),0.08)] rounded-sm">
            <div className="aspect-[16/9] bg-[rgba(var(--mg-primary),0.08)] rounded-sm" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-[rgba(var(--mg-primary),0.08)] rounded-sm w-3/4" />
              <div className="h-3 bg-[rgba(var(--mg-primary),0.06)] rounded-sm w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Modal ship picker specifically for the fleet builder context.
 *
 * Opens as a full overlay with search, filter panel, and a paginated
 * 3-column grid of ShipCards. Clicking a ship instantly selects it,
 * calls onSelect, and closes the modal.
 *
 * Uses createPortal to render at document.body (consistent with existing
 * ShipDropdownPortal pattern in the codebase).
 */
export default function FleetShipPickerModal({
  isOpen,
  onClose,
  onSelect,
}: FleetShipPickerModalProps) {
  const [state, dispatch] = useReducer(pickerReducer, initialState);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen, onClose);

  // Fetch ships with current filter state
  const { data, isLoading } = useShips({
    page: state.page,
    pageSize: state.pageSize,
    manufacturer: state.manufacturer || undefined,
    size: state.size || undefined,
    classification: state.classification || undefined,
    productionStatus: state.productionStatus || undefined,
    search: state.search || undefined,
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      dispatch({ type: 'RESET' });
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Stable callbacks
  const handleFilterChange = useCallback((key: string, value: string) => {
    dispatch({ type: 'SET_FILTER', key, value });
  }, []);

  const handleClearFilters = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const handleToggleFilterPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_FILTER_PANEL' });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    dispatch({ type: 'SET_SEARCH', search: value });
  }, []);

  const handleShipClick = useCallback(
    (ship: ShipDocument) => {
      onSelect(ship);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Derived values
  const ships = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  // Don't render anything when closed (portal not created)
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="fleet-picker-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            key="fleet-picker-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-sm border border-[rgba(var(--mg-primary),0.3)] bg-[rgba(var(--mg-panel-dark),0.95)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(var(--mg-primary),0.2)]">
              <h2 className="text-[rgba(var(--mg-primary),0.9)] font-quantify text-lg tracking-wider">
                Select Ship
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-[rgba(var(--mg-text),0.5)] hover:text-[rgba(var(--mg-primary),0.9)] transition-colors p-1"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Section */}
            <div className="px-6 py-3 space-y-3 border-b border-[rgba(var(--mg-primary),0.1)]">
              <ShipSearchBar value={state.search} onChange={handleSearchChange} />
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
            </div>

            {/* Ship Grid (scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              {isLoading ? (
                <SkeletonGrid />
              ) : ships.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-[rgba(var(--mg-text),0.6)] text-sm">
                    No ships found matching your filters
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ships.map((ship) => (
                    <ShipCard
                      key={ship.fleetyardsId}
                      ship={ship}
                      onClick={handleShipClick}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 px-6 py-3 border-t border-[rgba(var(--mg-primary),0.2)]">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_PAGE', page: state.page - 1 })}
                  disabled={state.page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-quantify tracking-wider
                    text-[rgba(var(--mg-text),0.7)] hover:text-[rgba(var(--mg-primary),0.9)]
                    disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                  Prev
                </button>
                <span className="text-[rgba(var(--mg-text),0.6)] text-xs font-quantify">
                  Page {state.page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_PAGE', page: state.page + 1 })}
                  disabled={state.page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-quantify tracking-wider
                    text-[rgba(var(--mg-text),0.7)] hover:text-[rgba(var(--mg-primary),0.9)]
                    disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
