'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import CornerAccents from '@/components/ui/mobiglas/CornerAccents';

interface ShipSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Debounced search input for filtering ships by name.
 *
 * Maintains a local input value that syncs to the parent via onChange
 * after a 300ms debounce delay. Styled to match the MobiGlas theme
 * with search icon, clear button, and corner accents.
 */
export default function ShipSearchBar({ value, onChange }: ShipSearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  // Tracks the last value that is already in sync with the parent (either
  // pushed up via onChange or received down via the value prop). Comparing
  // against this by value — rather than relying on a one-shot boolean flag —
  // avoids dropping a subsequent edit when an external sync is a no-op.
  const lastSyncedValue = useRef(value);

  // Sync localValue when the external value prop changes
  // (e.g., parent clears all filters)
  useEffect(() => {
    lastSyncedValue.current = value;
    setLocalValue(value);
  }, [value]);

  // Debounce: fire onChange 300ms after localValue stops changing
  useEffect(() => {
    // Skip when localValue already matches what the parent has, so external
    // prop syncs (and explicit clears) don't trigger a redundant onChange.
    if (localValue === lastSyncedValue.current) {
      return;
    }

    const timer = setTimeout(() => {
      lastSyncedValue.current = localValue;
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  const handleClear = () => {
    lastSyncedValue.current = '';
    setLocalValue('');
    // Immediately notify parent on explicit clear action
    onChange('');
  };

  return (
    <div className="relative">
      {/* Search icon */}
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(var(--mg-text),0.4)] pointer-events-none" />

      <label htmlFor="ship-search" className="sr-only">
        Search ships by name
      </label>
      <input
        type="text"
        id="ship-search"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder="Search ships by name..."
        aria-label="Search ships by name"
        className={`
          w-full pl-10 pr-10 py-2.5
          bg-[rgba(var(--mg-background),0.6)]
          border border-[rgba(var(--mg-primary),0.3)] rounded-sm
          text-white text-sm
          placeholder:text-[rgba(var(--mg-text),0.4)]
          focus:outline-none focus:ring-1
          focus:ring-[rgba(var(--mg-primary),0.5)]
          focus:border-[rgba(var(--mg-primary),0.5)]
          transition-all
        `}
      />

      {/* Clear button */}
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(var(--mg-text),0.4)] hover:text-[rgba(var(--mg-primary),0.9)] transition-colors"
          aria-label="Clear search"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}

      {/* Corner accents */}
      <CornerAccents size="xs" color="primary" opacity="low" className="pointer-events-none" />
    </div>
  );
}
