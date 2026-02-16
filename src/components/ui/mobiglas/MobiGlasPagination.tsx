'use client';

import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MobiGlasPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute page numbers to display with ellipsis gaps.
 *
 * Always shows first, last, and a window around the current page.
 * Returns numbers for page buttons and `null` for ellipsis placeholders.
 */
function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [];
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(total - 1, current + 1);

  // First page
  pages.push(1);

  // Ellipsis before window
  if (windowStart > 2) {
    pages.push(null);
  }

  // Window pages
  for (let i = windowStart; i <= windowEnd; i++) {
    pages.push(i);
  }

  // Ellipsis after window
  if (windowEnd < total - 1) {
    pages.push(null);
  }

  // Last page
  pages.push(total);

  return pages;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const pageButtonBase =
  'min-w-[32px] h-8 flex items-center justify-center text-sm rounded-sm transition-all font-quantify';

const pageButtonActive =
  'bg-[rgba(var(--mg-primary),0.2)] border border-[rgba(var(--mg-primary),0.5)] text-[rgba(var(--mg-primary),1)]';

const pageButtonGhost =
  'text-[rgba(var(--mg-text),0.6)] hover:text-[rgba(var(--mg-primary),0.9)] hover:bg-[rgba(var(--mg-primary),0.1)]';

const navButtonBase =
  'w-8 h-8 flex items-center justify-center rounded-sm transition-all text-[rgba(var(--mg-text),0.6)] hover:text-[rgba(var(--mg-primary),0.9)] hover:bg-[rgba(var(--mg-primary),0.1)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[rgba(var(--mg-text),0.6)]';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * MobiGlas-styled pagination component with prev/next controls
 * and page number buttons. Shows item range when totalItems and
 * pageSize are provided.
 *
 * Hides page buttons when there is only one page.
 */
export function MobiGlasPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className = '',
}: MobiGlasPaginationProps) {
  const showItemRange = totalItems !== undefined && pageSize !== undefined;
  const start = showItemRange && totalItems! > 0 ? (currentPage - 1) * pageSize! + 1 : 0;
  const end = showItemRange ? Math.min(currentPage * pageSize!, totalItems!) : 0;

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col sm:flex-row justify-between items-center gap-3 ${className}`}
    >
      {/* Item range / page info */}
      <div className="text-[rgba(var(--mg-text),0.7)] text-sm font-quantify">
        {showItemRange && totalItems! > 0
          ? `Showing ${start}-${end} of ${totalItems} items`
          : showItemRange
            ? 'No items found'
            : `Page ${currentPage} of ${totalPages}`}
      </div>

      {/* Page buttons (hidden when only 1 page) */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Previous */}
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className={navButtonBase}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          {pageNumbers.map((p, idx) =>
            p === null ? (
              <span
                key={`ellipsis-${idx}`}
                className="min-w-[32px] h-8 flex items-center justify-center text-[rgba(var(--mg-text),0.4)] text-sm"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`${pageButtonBase} ${
                  p === currentPage ? pageButtonActive : pageButtonGhost
                }`}
                aria-current={p === currentPage ? 'page' : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            )
          )}

          {/* Next */}
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className={navButtonBase}
            aria-label="Next page"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </nav>
  );
}

export default MobiGlasPagination;
