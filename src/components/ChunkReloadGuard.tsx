'use client';

import { useEffect } from 'react';

/**
 * Self-heals "stale tab after deploy" failures.
 *
 * When a new build is deployed, code-split chunk filenames change hash. A tab
 * that was loaded before the deploy still holds the old chunk map, so a
 * client-side navigation lazy-loads a chunk URL that no longer exists on the
 * server -> webpack throws a ChunkLoadError -> the link appears broken.
 *
 * This guard listens for that specific error and reloads the page ONCE, which
 * fetches the current (no-store) HTML and its up-to-date chunk map, so the link
 * then works.
 *
 * Loop safety: a reload is recorded in sessionStorage with a timestamp. If
 * another chunk error fires within RELOAD_COOLDOWN_MS (e.g. because a deploy is
 * still mid-propagation and the fresh HTML also references a not-yet-available
 * chunk), we do NOT reload again and let the error surface normally. This makes
 * an infinite reload loop impossible.
 */
const RELOAD_KEY = 'chunkReloadGuard:lastReloadAt';
const RELOAD_COOLDOWN_MS = 30_000;

function isChunkLoadError(reason: unknown): boolean {
  if (!reason) return false;
  const name =
    typeof reason === 'object' && reason !== null ? (reason as { name?: unknown }).name : undefined;
  if (name === 'ChunkLoadError') return true;
  const message =
    typeof reason === 'string'
      ? reason
      : typeof reason === 'object' &&
          reason !== null &&
          typeof (reason as { message?: unknown }).message === 'string'
        ? (reason as { message: string }).message
        : '';
  // Covers webpack JS chunk and CSS chunk load failures, and dynamic import() failures.
  return (
    /Loading chunk [\w-]+ failed/i.test(message) ||
    /Loading CSS chunk [\w-]+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

export default function ChunkReloadGuard() {
  useEffect(() => {
    const handle = (reason: unknown) => {
      if (!isChunkLoadError(reason)) return;

      let lastReloadAt = 0;
      try {
        lastReloadAt = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
      } catch {
        // sessionStorage may be unavailable (privacy mode); fall through and
        // attempt a single reload rather than risk no recovery.
      }

      const now = Date.now();
      if (now - lastReloadAt < RELOAD_COOLDOWN_MS) {
        // Already reloaded very recently — do not loop. Let the error surface.
        return;
      }

      try {
        sessionStorage.setItem(RELOAD_KEY, String(now));
      } catch {
        // ignore
      }

      window.location.reload();
    };

    const onError = (event: ErrorEvent) => handle(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => handle(event.reason);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
