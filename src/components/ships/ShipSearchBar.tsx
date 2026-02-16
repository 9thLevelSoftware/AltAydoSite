'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
  const isExternalUpdate = useRef(false);

  // Sync localValue when the external value prop changes
  // (e.g., parent clears all filters)
  useEffect(() => {
    isExternalUpdate.current = true;
    setLocalValue(value);
  }, [value]);

  // Debounce: fire onChange 300ms after localValue stops changing
  useEffect(() => {
    // Skip debounce when value was set from external prop sync
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  const handleClear = () => {
    setLocalValue('');
    // Immediately notify parent on explicit clear action
    onChange('');
  };

  return (
    <div className="relative">
      {/* Search icon */}
      <MagnifyingGlassIcon
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(var(--mg-text),0.4)] pointer-events-none"
      />

      <label htmlFor="ship-search" className="sr-only">Search ships by name</label>
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
      <div className="absolute top-0 left-0 w-[6px] h-[6px] border-l border-t border-[rgba(var(--mg-primary),0.4)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[6px] h-[6px] border-r border-t border-[rgba(var(--mg-primary),0.4)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[6px] h-[6px] border-l border-b border-[rgba(var(--mg-primary),0.4)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[6px] h-[6px] border-r border-b border-[rgba(var(--mg-primary),0.4)] pointer-events-none" />
    </div>
  );
}
