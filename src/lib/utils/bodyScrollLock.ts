'use client';

/**
 * Reference-counted body scroll lock.
 *
 * Multiple overlays (modals, slide-out panels) can be mounted at the same
 * time. If each one naively set and cleared `document.body.style.overflow`,
 * the first overlay to unmount would unlock scrolling even while another
 * overlay is still open. To avoid that, locks are reference-counted:
 *
 * - The first lock captures the previous `overflow` value and sets `hidden`.
 * - Each subsequent lock only increments the counter.
 * - Scrolling is restored to the captured value only once the counter
 *   returns to zero (i.e. the last overlay has released its lock).
 */

import { useEffect } from 'react';

let lockCount = 0;
let previousOverflow = '';

function lock(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlock(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
  }
}

/**
 * Lock body scroll for as long as `enabled` is true.
 *
 * Acquires a shared, reference-counted lock on mount/enable and releases it
 * on unmount/disable, so overlapping overlays don't unlock each other.
 */
export function useBodyScrollLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    lock();
    return unlock;
  }, [enabled]);
}
