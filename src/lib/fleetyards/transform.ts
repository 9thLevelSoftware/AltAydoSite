/**
 * FleetYards-to-ShipDocument Transform
 *
 * Maps a validated FleetYards API response object into our internal
 * ShipDocument shape. This function is the clean boundary between external
 * API data and internal storage format.
 *
 * Input:  ValidatedFleetYardsShip (Zod-validated, defaults applied)
 * Output: ShipDocument without _id and createdAt (set by MongoDB upsert)
 */

import type { ValidatedFleetYardsShip, ShipDocument } from '@/types/ship';

// ---------------------------------------------------------------------------
// Image URL Extraction Helper
// ---------------------------------------------------------------------------

type ImageSize = 'source' | 'small' | 'medium' | 'large';

type ImageObject = {
  source?: string;
  url?: string;
  small?: string;
  smallUrl?: string;
  medium?: string;
  mediumUrl?: string;
  large?: string;
  largeUrl?: string;
  xlargeUrl?: string;
};

type ImageField = ImageObject | string | null | undefined;

const imageUrlKeys: Record<ImageSize, (keyof ImageObject)[]> = {
  source: [
    'source',
    'url',
    'largeUrl',
    'large',
    'mediumUrl',
    'medium',
    'smallUrl',
    'small',
    'xlargeUrl',
  ],
  small: [
    'small',
    'smallUrl',
    'url',
    'source',
    'mediumUrl',
    'medium',
    'largeUrl',
    'large',
    'xlargeUrl',
  ],
  medium: [
    'medium',
    'mediumUrl',
    'largeUrl',
    'large',
    'url',
    'source',
    'smallUrl',
    'small',
    'xlargeUrl',
  ],
  large: [
    'large',
    'largeUrl',
    'xlargeUrl',
    'url',
    'source',
    'mediumUrl',
    'medium',
    'smallUrl',
    'small',
  ],
};

/**
 * Safely extracts an image URL from a view field.
 *
 * Handles both API formats:
 * - Object format (from media.*View): { source, small, medium, large }
 * - String format (top-level flat field): just the URL string
 *
 * @param view - The image view (object with resolutions, string URL, null, or undefined)
 * @param size - The resolution to extract when view is an object: 'source' or 'medium'
 * @returns The URL string, or null if not available
 */
export function extractImageUrl(view: ImageField, size: ImageSize = 'source'): string | null {
  if (!view) return null;
  if (typeof view === 'string') {
    const trimmed = view.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  for (const key of imageUrlKeys[size]) {
    const url = view[key];
    if (typeof url === 'string' && url.trim().length > 0) {
      return url;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main Transform
// ---------------------------------------------------------------------------

/**
 * Transforms a validated FleetYards API ship into our internal ShipDocument shape.
 *
 * Field mapping is explicit and one-to-one -- no spread operators on raw API data.
 * Every field is mapped individually for full visibility and type safety.
 *
 * Note: `_id` and `createdAt` are intentionally omitted from the return type.
 * - `_id` is assigned by MongoDB on insert
 * - `createdAt` is set via `$setOnInsert` in the upsert operation (Plan 03)
 *   so it is only written on first insert, never overwritten on update
 *
 * @param raw - A Zod-validated FleetYards ship object (defaults already applied)
 * @param syncVersion - The current sync run version number
 * @returns A ShipDocument-shaped object ready for MongoDB upsert
 */
export function transformFleetYardsShip(
  raw: ValidatedFleetYardsShip,
  syncVersion: number
): Omit<ShipDocument, '_id' | 'createdAt'> {
  return {
    // Identity
    fleetyardsId: raw.id,
    slug: raw.slug,
    name: raw.name,
    scIdentifier: raw.scIdentifier ?? null,

    // Manufacturer (simplified from API -- longName dropped)
    manufacturer: {
      name: raw.manufacturer.name,
      code: raw.manufacturer.code,
      slug: raw.manufacturer.slug,
      logo: extractImageUrl(raw.manufacturer.logo, 'small'),
    },

    // Classification and status
    classification: raw.classification ?? '',
    classificationLabel: raw.classificationLabel ?? '',
    focus: raw.focus ?? '',
    size: raw.size ?? '',
    productionStatus: raw.productionStatus ?? '',

    // Crew
    crew: {
      min: raw.crew?.min ?? 0,
      max: raw.crew?.max ?? 0,
    },

    // Physical attributes
    cargo: raw.cargo ?? 0,
    length: raw.length ?? 0,
    beam: raw.beam ?? 0,
    height: raw.height ?? 0,
    mass: raw.mass ?? 0,

    // Performance
    scmSpeed: raw.scmSpeed ?? null,
    hydrogenFuelTankSize: raw.hydrogenFuelTankSize ?? null,
    quantumFuelTankSize: raw.quantumFuelTankSize ?? null,

    // Pricing
    pledgePrice: raw.pledgePrice ?? null,
    price: raw.price ?? null,

    // Content
    description: raw.description ?? null,
    storeUrl: raw.storeUrl ?? null,

    // Images -- prefer media.*View objects (full resolutions) over flat string URLs
    images: {
      store: extractImageUrl(raw.media?.storeImage ?? raw.storeImage, 'source'),
      angledView: extractImageUrl(raw.media?.angledView ?? raw.angledView, 'source'),
      angledViewMedium: extractImageUrl(raw.media?.angledView ?? raw.angledView, 'medium'),
      sideView: extractImageUrl(raw.media?.sideView ?? raw.sideView, 'source'),
      sideViewMedium: extractImageUrl(raw.media?.sideView ?? raw.sideView, 'medium'),
      topView: extractImageUrl(raw.media?.topView ?? raw.topView, 'source'),
      topViewMedium: extractImageUrl(raw.media?.topView ?? raw.topView, 'medium'),
      frontView: extractImageUrl(raw.media?.frontView ?? raw.frontView, 'source'),
      frontViewMedium: extractImageUrl(raw.media?.frontView ?? raw.frontView, 'medium'),
      fleetchartImage: extractImageUrl(raw.media?.fleetchartImage ?? raw.fleetchartImage, 'source'),
    },

    // Sync metadata
    syncedAt: new Date(),
    syncVersion,
    fleetyardsUpdatedAt: raw.updatedAt ?? raw.lastUpdatedAt ?? '',
    updatedAt: new Date(),
  };
}
