'use client';

import React, { useReducer, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { useShips, type ShipFilters } from '@/hooks/useShips';
import ShipFilterPanel from '@/components/ships/ShipFilterPanel';
import ShipSearchBar from '@/components/ships/ShipSearchBar';
import ShipPagination from '@/components/ships/ShipPagination';
import { resolveShipImage } from '@/lib/ships/image';
import { formatSize } from '@/lib/ships/format';
import type { ShipDocument } from '@/types/ship';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MissionShipPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShips: (ships: ShipDocument[]) => void;
  existingShipNames: string[];
}

// ---------------------------------------------------------------------------
// State Management (useReducer -- matches ShipBrowsePage pattern)
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
// Component
// ---------------------------------------------------------------------------

/**
 * Modal ship picker for the mission planner context.
 *
 * Provides multi-select with checkboxes backed by the paginated /api/ships
 * endpoint. Reuses ShipFilterPanel, ShipSearchBar, and ShipPagination from
 * the ship browse system. Dense list rows (not full cards) optimise for
 * scanning many ships during multi-selection.
 */
export default function MissionShipPickerModal({
  isOpen,
  onClose,
  onSelectShips,
  existingShipNames,
}: MissionShipPickerModalProps) {
  const [state, dispatch] = useReducer(pickerReducer, initialState);
  const [pendingSelections, setPendingSelections] = useState<Map<string, ShipDocument>>(new Map());

  // Build filter params for useShips hook
  const filters: ShipFilters = {
    page: state.page,
    pageSize: state.pageSize,
    manufacturer: state.manufacturer || undefined,
    size: state.size || undefined,
    classification: state.classification || undefined,
    productionStatus: state.productionStatus || undefined,
    search: state.search || undefined,
  };

  const { data, isLoading, error } = useShips(filters);

  // -- Callbacks --

  const handleFilterChange = useCallback((key: string, value: string) => {
    dispatch({ type: 'SET_FILTER', key, value });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    dispatch({ type: 'SET_SEARCH', search: value });
  }, []);

  const handleClearAll = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const handleToggleFilterPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_FILTER_PANEL' });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', page });
  }, []);

  const toggleShipSelection = useCallback((ship: ShipDocument) => {
    setPendingSelections(prev => {
      const next = new Map(prev);
      if (next.has(ship.fleetyardsId)) {
        next.delete(ship.fleetyardsId);
      } else {
        next.set(ship.fleetyardsId, ship);
      }
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(() => {
    if (pendingSelections.size > 0) {
      onSelectShips(Array.from(pendingSelections.values()));
    }
    setPendingSelections(new Map());
    onClose();
  }, [pendingSelections, onSelectShips, onClose]);

  const handleClose = useCallback(() => {
    setPendingSelections(new Map());
    onClose();
  }, [onClose]);

  const isShipAlreadyAdded = useCallback(
    (name: string) => existingShipNames.includes(name),
    [existingShipNames],
  );

  // -- Render --

  if (!isOpen) return null;

  const shipFilterProps = {
    manufacturer: state.manufacturer,
    size: state.size,
    classification: state.classification,
    productionStatus: state.productionStatus,
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="mission-picker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/60"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="mission-picker-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-[rgba(var(--mg-panel-dark),0.98)] border border-[rgba(var(--mg-primary),0.3)] rounded-lg shadow-2xl pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(var(--mg-primary),0.2)]">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-medium text-[rgba(var(--mg-text),0.9)] font-quantify tracking-wider">
                    Select Ships
                  </h2>
                  {pendingSelections.size > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(var(--mg-primary),0.2)] text-[rgba(var(--mg-primary),1)]">
                      {pendingSelections.size} selected
                    </span>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 hover:bg-[rgba(var(--mg-primary),0.2)] rounded transition-colors text-[rgba(var(--mg-text),0.6)] hover:text-[rgba(var(--mg-text),0.9)]"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Filters */}
              <div className="px-4 py-3 border-b border-[rgba(var(--mg-primary),0.15)] space-y-2">
                <ShipSearchBar value={state.search} onChange={handleSearchChange} />
                <ShipFilterPanel
                  filters={shipFilterProps}
                  onFilterChange={handleFilterChange}
                  onClearAll={handleClearAll}
                  isOpen={state.filterPanelOpen}
                  onToggle={handleToggleFilterPanel}
                />
              </div>

              {/* Ship list */}
              <div className="flex-1 overflow-auto min-h-0">
                {isLoading && !data && (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-[rgba(var(--mg-primary),0.3)] border-t-[rgba(var(--mg-primary),0.9)] rounded-full animate-spin" />
                    <span className="ml-3 text-sm text-[rgba(var(--mg-text),0.5)]">Loading ships...</span>
                  </div>
                )}

                {error && (
                  <div className="text-center py-12 text-[rgba(var(--mg-danger),0.8)] text-sm">
                    Failed to load ships: {error}
                  </div>
                )}

                {data && data.items.length === 0 && (
                  <div className="text-center py-12 text-[rgba(var(--mg-text),0.5)]">
                    No ships found matching your criteria.
                  </div>
                )}

                {data && data.items.length > 0 && (
                  <div className="divide-y divide-[rgba(var(--mg-primary),0.1)]">
                    {data.items.map((ship) => {
                      const isAdded = isShipAlreadyAdded(ship.name);
                      const isPending = pendingSelections.has(ship.fleetyardsId);
                      const imageUrl = resolveShipImage(ship.images, 'store');

                      return (
                        <div
                          key={ship.fleetyardsId}
                          onClick={() => !isAdded && toggleShipSelection(ship)}
                          className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${
                            isAdded
                              ? 'opacity-50 bg-[rgba(var(--mg-success),0.05)] cursor-not-allowed'
                              : isPending
                                ? 'bg-[rgba(var(--mg-primary),0.15)]'
                                : 'hover:bg-[rgba(var(--mg-primary),0.08)]'
                          }`}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isPending || isAdded}
                            disabled={isAdded}
                            onChange={() => !isAdded && toggleShipSelection(ship)}
                            className="w-4 h-4 accent-[rgba(var(--mg-primary),1)] flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          />

                          {/* Thumbnail (64x40) */}
                          <div className="w-16 h-10 relative rounded overflow-hidden bg-[rgba(var(--mg-panel-dark),0.5)] flex-shrink-0">
                            <Image
                              src={imageUrl}
                              alt={ship.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>

                          {/* Ship name + manufacturer */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[rgba(var(--mg-text),0.9)] truncate">
                              {ship.name}
                            </div>
                            <div className="text-xs text-[rgba(var(--mg-text),0.5)]">
                              {ship.manufacturer.name}
                            </div>
                          </div>

                          {/* Size */}
                          <div className="hidden sm:block text-xs text-[rgba(var(--mg-text),0.5)] w-16 text-center flex-shrink-0">
                            {ship.size ? formatSize(ship.size) : ''}
                          </div>

                          {/* Crew */}
                          <div className="hidden md:block text-xs text-[rgba(var(--mg-text),0.5)] w-16 text-center flex-shrink-0">
                            {ship.crew.min === ship.crew.max
                              ? `${ship.crew.max} crew`
                              : `${ship.crew.min}-${ship.crew.max}`}
                          </div>

                          {/* Status badge */}
                          <div className="text-xs flex-shrink-0 w-14 text-right">
                            {isAdded ? (
                              <span className="text-[rgba(var(--mg-success),0.8)]">Added</span>
                            ) : isPending ? (
                              <span className="text-[rgba(var(--mg-primary),0.9)]">
                                <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="px-4 py-2 border-t border-[rgba(var(--mg-primary),0.15)]">
                  <ShipPagination
                    page={data.page}
                    totalPages={data.totalPages}
                    total={data.total}
                    pageSize={data.pageSize}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}

              {/* Footer: Add Selected button */}
              {pendingSelections.size > 0 && (
                <div className="px-4 py-3 border-t border-[rgba(var(--mg-primary),0.2)] bg-[rgba(var(--mg-panel-dark),0.5)]">
                  <button
                    onClick={handleAddSelected}
                    className="w-full py-2.5 text-sm font-medium rounded bg-[rgba(var(--mg-primary),0.3)] text-[rgba(var(--mg-primary),1)] hover:bg-[rgba(var(--mg-primary),0.4)] transition-colors font-quantify tracking-wider"
                  >
                    Add {pendingSelections.size} Ship{pendingSelections.size > 1 ? 's' : ''} to Roster
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
