'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FunnelIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { formatSize, formatProductionStatus } from '@/lib/ships/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShipFilters {
  manufacturer: string;
  size: string;
  classification: string;
  productionStatus: string;
}

interface ManufacturerOption {
  name: string;
  code: string;
  slug: string;
  logo: string | null;
  shipCount: number;
}

export interface ShipFilterPanelProps {
  filters: ShipFilters;
  onFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

// ---------------------------------------------------------------------------
// Static option lists
// ---------------------------------------------------------------------------

const SIZE_OPTIONS = ['vehicle', 'snub', 'small', 'medium', 'large', 'capital'];

const CLASSIFICATION_OPTIONS = [
  'combat',
  'transport',
  'exploration',
  'industrial',
  'support',
  'competition',
  'multi_role',
  'ground',
];

const PRODUCTION_STATUS_OPTIONS = ['flight-ready', 'in-production', 'in-concept'];

/** Title-case a classification key (e.g. "multi_role" -> "Multi Role"). */
function formatClassification(value: string): string {
  if (!value) return 'Unknown';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Shared select styling
// ---------------------------------------------------------------------------

const selectClasses = `
  w-full appearance-none
  bg-[rgba(var(--mg-background),0.6)]
  border border-[rgba(var(--mg-primary),0.3)] rounded-sm
  text-[rgba(var(--mg-text),0.8)] text-sm
  py-2 px-3 pr-8
  focus:outline-none focus:ring-1
  focus:ring-[rgba(var(--mg-primary),0.5)]
  focus:border-[rgba(var(--mg-primary),0.5)]
  transition-all cursor-pointer
`.trim();

const labelClasses =
  'block text-[rgba(var(--mg-text),0.6)] text-xs uppercase tracking-wider font-quantify mb-1';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Collapsible filter panel for narrowing ship browse results.
 *
 * Provides four filter axes:
 *   1. Manufacturer -- fetched from /api/ships/manufacturers (sends slug)
 *   2. Size -- hardcoded Star Citizen size categories
 *   3. Classification -- hardcoded common ship roles
 *   4. Production Status -- hardcoded lifecycle statuses
 *
 * The panel toggles open/closed with Framer Motion animations.
 * A "Clear All" button appears when any filter is active.
 */
export default function ShipFilterPanel({
  filters,
  onFilterChange,
  onClearAll,
  isOpen,
  onToggle,
}: ShipFilterPanelProps) {
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([]);

  // Fetch manufacturer list once on mount
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
          console.error('[ShipFilterPanel] Failed to fetch manufacturers:', err);
        }
      });

    return () => controller.abort();
  }, []);

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="w-full">
      {/* Toggle button row */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm
            text-[rgba(var(--mg-text),0.8)] hover:text-[rgba(var(--mg-primary),1)]
            hover:bg-[rgba(var(--mg-primary),0.1)] rounded-sm transition-all
            font-quantify tracking-wider"
        >
          <FunnelIcon className="w-4 h-4" />
          <span>Filters</span>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="inline-flex"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </motion.span>
        </button>

        {/* Clear All (visible only when filters are active) */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="px-3 py-1.5 text-xs
              text-[rgba(var(--mg-text),0.6)] hover:text-[rgba(var(--mg-danger),0.9)]
              hover:bg-[rgba(var(--mg-danger),0.1)] rounded-sm transition-all
              font-quantify tracking-wider"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Collapsible filter dropdowns */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="filter-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
              {/* Manufacturer (from API) */}
              <div>
                <label className={labelClasses}>Manufacturer</label>
                <div className="relative">
                  <select
                    value={filters.manufacturer}
                    onChange={(e) => onFilterChange('manufacturer', e.target.value)}
                    className={selectClasses}
                  >
                    <option value="">All Manufacturers</option>
                    {manufacturers.map((m) => (
                      <option key={m.slug} value={m.slug}>
                        {m.name} ({m.shipCount})
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(var(--mg-text),0.4)] pointer-events-none" />
                </div>
              </div>

              {/* Size */}
              <div>
                <label className={labelClasses}>Size</label>
                <div className="relative">
                  <select
                    value={filters.size}
                    onChange={(e) => onFilterChange('size', e.target.value)}
                    className={selectClasses}
                  >
                    <option value="">All Sizes</option>
                    {SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {formatSize(s)}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(var(--mg-text),0.4)] pointer-events-none" />
                </div>
              </div>

              {/* Classification */}
              <div>
                <label className={labelClasses}>Classification</label>
                <div className="relative">
                  <select
                    value={filters.classification}
                    onChange={(e) => onFilterChange('classification', e.target.value)}
                    className={selectClasses}
                  >
                    <option value="">All Classifications</option>
                    {CLASSIFICATION_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {formatClassification(c)}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(var(--mg-text),0.4)] pointer-events-none" />
                </div>
              </div>

              {/* Production Status */}
              <div>
                <label className={labelClasses}>Production Status</label>
                <div className="relative">
                  <select
                    value={filters.productionStatus}
                    onChange={(e) => onFilterChange('productionStatus', e.target.value)}
                    className={selectClasses}
                  >
                    <option value="">All Statuses</option>
                    {PRODUCTION_STATUS_OPTIONS.map((ps) => (
                      <option key={ps} value={ps}>
                        {formatProductionStatus(ps)}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(var(--mg-text),0.4)] pointer-events-none" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
