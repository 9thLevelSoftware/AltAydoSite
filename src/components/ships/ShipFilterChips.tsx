'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

/** Display-friendly label mapping for each filter key. */
const FILTER_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer',
  size: 'Size',
  classification: 'Classification',
  productionStatus: 'Status',
};

interface ShipFilterChipsProps {
  /** Current filter state -- key/value pairs where value is the raw filter value. */
  filters: Record<string, string>;
  /**
   * Maps each active filter key to its human-readable display value.
   * For example: { manufacturer: "Aegis Dynamics", size: "Large" }
   * The parent component resolves slugs to display names.
   */
  labels: Record<string, string>;
  /** Called when a filter chip is removed -- parent should clear that filter key. */
  onRemove: (key: string) => void;
}

/**
 * Displays active filter selections as removable chip tags.
 *
 * Renders a flex-wrap row of animated chips for each non-empty filter.
 * Each chip shows the filter category and display value with a remove button.
 * Returns null if no filters are active.
 */
export default function ShipFilterChips({ filters, labels, onRemove }: ShipFilterChipsProps) {
  const activeKeys = Object.keys(filters).filter((key) => filters[key] !== '');

  if (activeKeys.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence mode="popLayout">
        {activeKeys.map((key) => (
          <motion.span
            key={key}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs
              bg-[rgba(var(--mg-primary),0.15)]
              border border-[rgba(var(--mg-primary),0.3)]
              text-[rgba(var(--mg-primary),0.9)]
              rounded-sm"
          >
            <span>
              {FILTER_LABELS[key] || key}: {labels[key] || filters[key]}
            </span>
            <button
              type="button"
              onClick={() => onRemove(key)}
              className="ml-0.5 text-[rgba(var(--mg-primary),0.6)] hover:text-[rgba(var(--mg-danger),0.9)] transition-colors"
              aria-label={`Remove ${FILTER_LABELS[key] || key} filter`}
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
