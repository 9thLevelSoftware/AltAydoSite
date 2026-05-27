// ---------------------------------------------------------------------------
// Ship Image Resolution
// ---------------------------------------------------------------------------

/**
 * Supported view angles for ship images.
 * Maps to the image URL fields stored in ShipDocument.images.
 */
export type ShipImageView = 'angled' | 'side' | 'top' | 'front' | 'store' | 'fleetchart';

/**
 * Shape of the images sub-document on ShipDocument.
 * Each field is either a FleetYards CDN URL string or null.
 */
export type ShipImages = {
  store: string | null;
  angledView: string | null;
  angledViewMedium: string | null;
  sideView: string | null;
  sideViewMedium: string | null;
  topView: string | null;
  topViewMedium: string | null;
  frontView: string | null;
  frontViewMedium: string | null;
  fleetchartImage: string | null;
};

/**
 * Map each ShipImageView to ordered candidate keys on ShipImages.
 * Prefers full-resolution, falls back to medium variant.
 */
const viewMap: Record<ShipImageView, (keyof ShipImages)[]> = {
  angled: ['angledView', 'angledViewMedium'],
  side: ['sideView', 'sideViewMedium'],
  top: ['topView', 'topViewMedium'],
  front: ['frontView', 'frontViewMedium'],
  store: ['store'],
  fleetchart: ['fleetchartImage'],
};

/**
 * Resolve a displayable image URL from a ShipDocument.images object.
 *
 * Fallback chain:
 * 1. Try each candidate key for the requested view
 * 2. If view !== 'angled', try angledView as a cross-view fallback
 * 3. Try store image
 * 4. Return placeholder
 */
export function resolveShipImage(
  images: ShipImages | null | undefined,
  view: ShipImageView = 'angled',
): string {
  if (!images) return getShipPlaceholder();

  // 1. Try candidates for the requested view
  const candidates = viewMap[view];
  for (const key of candidates) {
    const url = images[key];
    if (url && url.trim().length > 0) return url;
  }

  // 2. Cross-view fallback to angled (skip if already tried)
  if (view !== 'angled') {
    const angled = images.angledView;
    if (angled && angled.trim().length > 0) return angled;
  }

  // 3. Store image fallback
  const store = images.store;
  if (store && store.trim().length > 0) return store;

  // 4. Placeholder
  return getShipPlaceholder();
}

// ---------------------------------------------------------------------------
// Placeholder
// ---------------------------------------------------------------------------

export function getShipPlaceholder(): string {
  return '';
}

export function isFleetYardsImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'api.fleetyards.net' ||
      hostname === 'cdn.fleetyards.net' ||
      hostname === 'fleetyards.net';
  } catch {
    return false;
  }
}

export function shouldOptimizeShipImage(url: string | null | undefined): boolean {
  return !!url && !isFleetYardsImageUrl(url);
}
