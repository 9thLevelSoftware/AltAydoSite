'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { CategoryCount } from '@/hooks/useOrgFleet';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface FleetBreakdownTableProps {
  data: CategoryCount[];
  totalShips: number;
}

export function FleetBreakdownTable({ data, totalShips }: FleetBreakdownTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  if (data.length === 0) {
    return (
      <div className="mg-text text-center opacity-50 py-8">
        No data available.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="mg-title text-lg font-quantify tracking-wider text-[rgba(var(--mg-primary),0.9)] mb-4">
        Detail Breakdown
      </h3>

      <div className="border border-[rgba(var(--mg-primary),0.2)] rounded-sm overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_90px_40px] sm:grid-cols-[1fr_80px_90px_40px] bg-[rgba(var(--mg-panel-dark),0.6)] px-4 py-2 border-b border-[rgba(var(--mg-primary),0.2)]">
          <span className="mg-text text-xs uppercase tracking-wider opacity-60">Category</span>
          <span className="mg-text text-xs uppercase tracking-wider opacity-60 text-right">Count</span>
          <span className="mg-text text-xs uppercase tracking-wider opacity-60 text-right">Percent</span>
          <span />
        </div>

        {/* Data rows */}
        {data.map((category) => {
          const isExpanded = expanded.has(category.name);
          const percent = totalShips > 0
            ? ((category.count / totalShips) * 100).toFixed(1)
            : '0.0';

          return (
            <div key={category.name}>
              {/* Category row */}
              <button
                type="button"
                onClick={() => toggleExpand(category.name)}
                className="w-full grid grid-cols-[1fr_80px_90px_40px] sm:grid-cols-[1fr_80px_90px_40px] px-4 py-3 bg-[rgba(var(--mg-panel-dark),0.3)] hover:bg-[rgba(var(--mg-primary),0.08)] border-b border-[rgba(var(--mg-primary),0.1)] transition-colors cursor-pointer text-left"
              >
                <span className="mg-text text-sm font-medium truncate pr-2">
                  {category.name}
                </span>
                <span className="mg-text text-sm text-right tabular-nums text-[rgba(var(--mg-primary),1)]">
                  {category.count}
                </span>
                <span className="mg-text text-sm text-right tabular-nums opacity-70">
                  {percent}%
                </span>
                <span className="flex items-center justify-center">
                  <svg
                    className={`w-4 h-4 mg-text opacity-50 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>

              {/* Expanded ship list */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[rgba(var(--mg-panel-dark),0.5)] border-b border-[rgba(var(--mg-primary),0.1)]">
                      {category.ships.map((ship) => (
                        <div
                          key={ship.name}
                          className="grid grid-cols-[1fr_80px_90px_40px] sm:grid-cols-[1fr_80px_90px_40px] px-4 py-2 pl-8 border-b border-[rgba(var(--mg-primary),0.05)] last:border-b-0"
                        >
                          <span className="mg-text text-xs opacity-70 truncate pr-2">
                            {ship.name}
                          </span>
                          <span className="mg-text text-xs text-right tabular-nums opacity-70">
                            {ship.count}
                          </span>
                          <span className="mg-text text-xs text-right tabular-nums opacity-50">
                            {totalShips > 0
                              ? ((ship.count / totalShips) * 100).toFixed(1)
                              : '0.0'}%
                          </span>
                          <span />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
