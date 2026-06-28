import { useEffect, useRef, RefObject, useCallback } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  onEscape: () => void
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const stableOnEscape = useCallback(onEscape, [onEscape]);

  useEffect(() => {
    if (!isActive) return;
    const container = containerRef.current;
    if (!container) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    // Make the container itself programmatically focusable so we always have a
    // place to keep focus even when it has no focusable children. Remember
    // whether it already had an explicit tabIndex so we can restore on cleanup.
    const hadTabIndex = container.hasAttribute('tabindex');
    const previousTabIndex = container.getAttribute('tabindex');
    if (!hadTabIndex) {
      container.tabIndex = -1;
    }

    // Focus first focusable element after portal renders, falling back to the
    // container itself when there is nothing focusable inside it.
    requestAnimationFrame(() => {
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (first) {
        first.focus();
      } else {
        container.focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stableOnEscape();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

      // No focusable children: trap focus on the container itself so Tab can't
      // escape the trap.
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      // Focus has already escaped the container (e.g. it leaked out before the
      // trap mounted, or a click moved it away). Pull it back in.
      if (!container.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // Attach at the document level (capture phase) so focus that has already
    // escaped the container can still be pulled back in.
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);

      // Restore the container's original tabIndex state.
      if (!hadTabIndex) {
        container.removeAttribute('tabindex');
      } else if (previousTabIndex !== null) {
        container.setAttribute('tabindex', previousTabIndex);
      }

      const prev = previousFocusRef.current;
      if (prev && document.body.contains(prev)) {
        prev.focus();
      }
    };
  }, [isActive, containerRef, stableOnEscape]);
}
