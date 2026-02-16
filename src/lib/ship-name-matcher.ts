/**
 * Ship Name Matching Engine
 *
 * Resolves codebase ship names to FleetYards UUIDs using a multi-pass
 * matching strategy. This is the foundational module for the data migration
 * -- every collection migration function calls resolveShipName() to convert
 * name strings to FleetYards UUIDs.
 *
 * Matching order (highest priority first):
 * 1. Manual override (known discrepancies between codebase and FleetYards names)
 * 2. Exact match (case-sensitive name lookup)
 * 3. Case-insensitive match (lowercase name lookup)
 * 4. Slug match (convert name to slug format, look up in slug index)
 * 5. Contains match (substring match in either direction)
 *
 * If no match is found in any pass, returns null.
 */

import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatchStrategy =
  | 'manual-override'
  | 'exact'
  | 'case-insensitive'
  | 'slug'
  | 'contains';

export interface MatchResult {
  fleetyardsId: string;
  matchedName: string;
  strategy: MatchStrategy;
}

export interface ShipRef {
  fleetyardsId: string;
  name: string;
  slug: string;
}

export interface ShipsIndex {
  byName: Map<string, ShipRef>;
  byNameLower: Map<string, ShipRef>;
  bySlug: Map<string, ShipRef>;
  byFleetyardsId: Map<string, ShipRef>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** UUID v4 pattern for distinguishing FleetYards UUIDs from slugs/names */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Manual override map: codebase name -> FleetYards slug.
 *
 * These cover all known discrepancies between ship names used in the
 * codebase (operations, missions, fleet data) and the canonical names
 * in the FleetYards API / ships collection.
 */
export const MANUAL_OVERRIDES: Record<string, string> = {
  // Extra words in codebase name
  'Ares Star Fighter Inferno': 'ares-inferno',
  'Ares Star Fighter Ion': 'ares-ion',
  'C8R Pisces Rescue': 'c8r-pisces',

  // Missing suffix in codebase
  'Gladius Pirate': 'gladius-pirate-edition',

  // Punctuation differences
  'F7C M Super Hornet Mk II': 'f7c-m-super-hornet-mk-ii',

  // Misspelling in codebase
  'F8C Lightening': 'f8c-lightning',

  // "Best In Show" editions (map to base variant)
  'Hammerhead Best In Show Edition': 'hammerhead',
  'Reclaimer Best In Show Edition': 'reclaimer',
  'Cutlass Black Best In Show Edition': 'cutlass-black',
  'Caterpillar Best In Show Edition': 'caterpillar',
  'Caterpillar Pirate Edition': 'caterpillar',

  // Special editions
  'Constellation Phoenix Emerald': 'constellation-phoenix',

  // Heartseeker Mk II -> closest match
  'F7C-M Hornet Heartseeker Mk II': 'f7c-m-super-hornet-heartseeker',

  // Kit variants (not in FleetYards, map to base hull)
  'Idris-K': 'idris-p',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a ship name to FleetYards slug format.
 *
 * Lowercases, replaces non-alphanumeric runs with hyphens, and trims
 * leading/trailing hyphens. This must match the FleetYards slug convention.
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+$/, '')
    .replace(/^-+/, '');
}

// ---------------------------------------------------------------------------
// Index Builder
// ---------------------------------------------------------------------------

/**
 * Load all ships from MongoDB and build an in-memory lookup index.
 *
 * The index provides four maps for O(1) lookups by name, lowercase name,
 * slug, and FleetYards UUID. This is called once at the start of a
 * migration run and reused for all name resolutions.
 */
export async function buildShipsIndex(): Promise<ShipsIndex> {
  const { db } = await connectToDatabase();
  const shipsCollection = db.collection('ships');

  const ships = await shipsCollection
    .find(
      {},
      { projection: { _id: 0, fleetyardsId: 1, name: 1, slug: 1 } }
    )
    .toArray();

  const byName = new Map<string, ShipRef>();
  const byNameLower = new Map<string, ShipRef>();
  const bySlug = new Map<string, ShipRef>();
  const byFleetyardsId = new Map<string, ShipRef>();

  for (const doc of ships) {
    const ref: ShipRef = {
      fleetyardsId: doc.fleetyardsId as string,
      name: doc.name as string,
      slug: doc.slug as string,
    };

    byName.set(ref.name, ref);
    byNameLower.set(ref.name.toLowerCase(), ref);
    bySlug.set(ref.slug, ref);
    byFleetyardsId.set(ref.fleetyardsId, ref);
  }

  logger.info('Built ship name matcher index', { module: 'ship-matcher', shipCount: ships.length });

  return { byName, byNameLower, bySlug, byFleetyardsId };
}

// ---------------------------------------------------------------------------
// Multi-Pass Matcher
// ---------------------------------------------------------------------------

/**
 * Resolve a codebase ship name to a FleetYards UUID using multi-pass matching.
 *
 * @param name      - The ship name from the codebase (operations, missions, etc.)
 * @param index     - The pre-built ships index from buildShipsIndex()
 * @param overrides - Optional override map (defaults to MANUAL_OVERRIDES)
 * @returns         - MatchResult with fleetyardsId, matched name, and strategy used;
 *                    or null if no match found in any pass
 */
export function resolveShipName(
  name: string,
  index: ShipsIndex,
  overrides: Record<string, string> = MANUAL_OVERRIDES
): MatchResult | null {
  if (!name || name.trim().length === 0) {
    return null;
  }

  // Pass 1: Manual override (highest priority)
  const overrideSlug = overrides[name];
  if (overrideSlug) {
    const ref = index.bySlug.get(overrideSlug);
    if (ref) {
      return {
        fleetyardsId: ref.fleetyardsId,
        matchedName: ref.name,
        strategy: 'manual-override',
      };
    }
  }

  // Pass 2: Exact match (case-sensitive)
  const exactRef = index.byName.get(name);
  if (exactRef) {
    return {
      fleetyardsId: exactRef.fleetyardsId,
      matchedName: exactRef.name,
      strategy: 'exact',
    };
  }

  // Pass 3: Case-insensitive match
  const lowerRef = index.byNameLower.get(name.toLowerCase());
  if (lowerRef) {
    return {
      fleetyardsId: lowerRef.fleetyardsId,
      matchedName: lowerRef.name,
      strategy: 'case-insensitive',
    };
  }

  // Pass 4: Slug match
  const slug = nameToSlug(name);
  const slugRef = index.bySlug.get(slug);
  if (slugRef) {
    return {
      fleetyardsId: slugRef.fleetyardsId,
      matchedName: slugRef.name,
      strategy: 'slug',
    };
  }

  // Pass 5: Contains match (substring in either direction)
  const nameLower = name.toLowerCase();
  for (const [, shipRef] of index.byName) {
    const shipNameLower = shipRef.name.toLowerCase();
    if (shipNameLower.includes(nameLower) || nameLower.includes(shipNameLower)) {
      return {
        fleetyardsId: shipRef.fleetyardsId,
        matchedName: shipRef.name,
        strategy: 'contains',
      };
    }
  }

  // No match found in any pass
  return null;
}
