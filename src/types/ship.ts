/**
 * Ship Sync Data Types and Validation Schemas
 *
 * This module defines:
 * - ShipDocument: The MongoDB document shape for ships in our database
 * - SyncStatusDocument: Audit log records for each sync run
 * - FleetYardsShipSchema: Zod runtime validation for FleetYards API responses
 * - ValidatedFleetYardsShip: Inferred type from Zod validation
 *
 * The Zod schema serves as the trust boundary between the external FleetYards
 * API and our internal pipeline. It validates minimum required fields while
 * allowing unknown fields to pass through via .passthrough().
 */

import { z } from 'zod';
import type { ObjectId } from 'mongodb';

// ---------------------------------------------------------------------------
// Internal MongoDB Document Types
// ---------------------------------------------------------------------------

/**
 * Ship document as stored in the MongoDB `ships` collection.
 * This is our internal representation -- transformed and normalized
 * from the raw FleetYards API response.
 */
export interface ShipDocument {
  _id?: ObjectId;
  /** FleetYards UUID -- canonical external identifier */
  fleetyardsId: string;
  /** URL-friendly identifier */
  slug: string;
  /** Display name */
  name: string;
  /** Star Citizen in-game identifier (may be null for concept ships) */
  scIdentifier: string | null;
  /** Simplified manufacturer info (longName dropped from API response) */
  manufacturer: {
    name: string;
    code: string;
    slug: string;
    logo: string | null;
  };
  /** Ship classification key (e.g., "combat", "transport") */
  classification: string;
  /** Human-readable classification label */
  classificationLabel: string;
  /** Ship focus/role description */
  focus: string;
  /** Ship size category */
  size: string;
  /** Production status (e.g., "flight-ready", "in-concept") */
  productionStatus: string;
  /** Crew capacity range */
  crew: {
    min: number;
    max: number;
  };
  /** Cargo capacity in SCU */
  cargo: number;
  /** Length in meters */
  length: number;
  /** Beam (width) in meters */
  beam: number;
  /** Height in meters */
  height: number;
  /** Mass in kg */
  mass: number;
  /** Standard Combat Maneuvering speed */
  scmSpeed: number | null;
  /** Hydrogen fuel tank size */
  hydrogenFuelTankSize: number | null;
  /** Quantum fuel tank size */
  quantumFuelTankSize: number | null;
  /** Pledge price in USD */
  pledgePrice: number | null;
  /** In-game price in aUEC */
  price: number | null;
  /** Ship description text */
  description: string | null;
  /** RSI store URL */
  storeUrl: string | null;
  /** Pre-processed image URLs at various resolutions */
  images: {
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
   * Source and mirror metadata for external images. `images` remains the
   * display contract; this metadata lets sync compare source URLs and preserve
   * previous mirrored URLs when a refresh fails.
   */
  imageMirrors?: ShipImageMirrorMetadata;
  /** When this document was last synced from FleetYards */
  syncedAt: Date;
  /** Incrementing sync version number */
  syncVersion: number;
  /** FleetYards updatedAt timestamp (ISO 8601 string) for change detection */
  fleetyardsUpdatedAt: string;
  /** When this document was first created in our database */
  createdAt: Date;
  /** When this document was last modified */
  updatedAt: Date;
}

export type ShipImageField =
  | 'store'
  | 'angledView'
  | 'angledViewMedium'
  | 'sideView'
  | 'sideViewMedium'
  | 'topView'
  | 'topViewMedium'
  | 'frontView'
  | 'frontViewMedium'
  | 'fleetchartImage';

export interface ShipImageMirrorEntry {
  sourceUrl: string | null;
  mirroredUrl: string | null;
  contentHash: string | null;
  contentType: string | null;
  byteLength: number | null;
  mirroredAt: Date | null;
  error: string | null;
}

export interface ShipImageMirrorMetadata {
  images: Partial<Record<ShipImageField, ShipImageMirrorEntry>>;
  manufacturerLogo?: ShipImageMirrorEntry;
}

/**
 * Sync status audit log document stored in the `sync_status` collection.
 * One record is created per sync run for observability and debugging.
 */
export interface SyncStatusDocument {
  _id?: ObjectId;
  /** Discriminator for sync type */
  type: 'ship-sync';
  /** Sync version number matching ShipDocument.syncVersion */
  syncVersion: number;
  /** When this sync run occurred */
  lastSyncAt: Date;
  /** Total number of ships processed */
  shipCount: number;
  /** Number of newly inserted ships */
  newShips: number;
  /** Number of ships updated with changed data */
  updatedShips: number;
  /** Number of ships with no changes detected */
  unchangedShips: number;
  /** Number of ships skipped due to validation errors */
  skippedShips: number;
  /** Changed/new ships deferred because this run hit its processing limit */
  deferredShips?: number;
  /** Number of image objects successfully mirrored into owned storage */
  mirroredImages?: number;
  /** Number of image objects that failed to mirror */
  failedImages?: number;
  /** Whether this run exited because another sync already held the lock */
  lockSkipped?: boolean;
  /** Total sync duration in milliseconds */
  durationMs: number;
  /** Overall sync result status */
  status: 'success' | 'partial' | 'failed';
  /** Error messages collected during sync */
  errors: string[];
  /** Number of API pages successfully fetched */
  pagesProcessed: number;
}

// ---------------------------------------------------------------------------
// Zod Validation Schemas (Trust Boundary)
// ---------------------------------------------------------------------------

/**
 * Zod schema for validating a single ship from the FleetYards API response.
 *
 * Required fields (must exist with correct type):
 * - id (UUID), name, slug, manufacturer (name + code + slug)
 *
 * All other fields are typed but nullable/optional so that ships missing
 * non-critical data are not rejected. Uses .passthrough() to allow unknown
 * fields through without validation failures.
 */
/** Reusable schema for a FleetYards image object (multiple API generations). */
const ImageViewSchema = z
  .object({
    source: z.string().optional(),
    url: z.string().optional(),
    small: z.string().optional(),
    smallUrl: z.string().optional(),
    medium: z.string().optional(),
    mediumUrl: z.string().optional(),
    large: z.string().optional(),
    largeUrl: z.string().optional(),
    xlargeUrl: z.string().optional(),
  })
  .passthrough();

/**
 * A view field can be either a full resolution object (old API / nested media)
 * or a flat URL string (current API top-level format).
 */
const ViewFieldSchema = z.union([ImageViewSchema, z.string()]).nullable().optional();

export const FleetYardsShipSchema = z
  .object({
    // Required fields -- sync fails for this ship if these are missing
    id: z.string().uuid(),
    name: z.string().min(1),
    slug: z.string().min(1),
    manufacturer: z
      .object({
        name: z.string(),
        code: z.string().optional().default(''),
        slug: z.string(),
        logo: ViewFieldSchema.default(null),
      })
      .passthrough(),

    // Optional/nullable fields -- ship is still valid without these
    scIdentifier: z.string().nullable().optional(),
    rsiId: z.number().nullable().optional(),
    rsiName: z.string().nullable().optional(),
    rsiSlug: z.string().nullable().optional(),
    classification: z.string().optional().default(''),
    classificationLabel: z.string().optional().default(''),
    focus: z.string().optional().default(''),
    productionStatus: z.string().optional().default(''),
    size: z.string().optional().default(''),
    crew: z
      .object({
        min: z.number().nullable().optional().default(0),
        max: z.number().nullable().optional().default(0),
        minLabel: z.string().optional(),
        maxLabel: z.string().optional(),
      })
      .optional()
      .default({ min: 0, max: 0 }),
    cargo: z.number().optional().default(0),
    mass: z.number().optional().default(0),
    length: z.number().optional().default(0),
    beam: z.number().optional().default(0),
    height: z.number().optional().default(0),
    hydrogenFuelTankSize: z.number().nullable().optional(),
    quantumFuelTankSize: z.number().nullable().optional(),
    scmSpeed: z.number().nullable().optional(),
    pledgePrice: z.number().nullable().optional(),
    price: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    storeImage: ViewFieldSchema,
    storeUrl: z.string().nullable().optional(),
    links: z
      .object({
        salesPageUrl: z.string().nullable().optional(),
        storeUrl: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),

    // View fields: current API returns flat strings at top level, objects under media
    angledView: ViewFieldSchema,
    sideView: ViewFieldSchema,
    topView: ViewFieldSchema,
    frontView: ViewFieldSchema,

    // Nested media object with full resolution image views (current API format)
    media: z
      .object({
        angledView: ViewFieldSchema,
        sideView: ViewFieldSchema,
        topView: ViewFieldSchema,
        frontView: ViewFieldSchema,
        storeImage: ViewFieldSchema,
        fleetchartImage: ViewFieldSchema,
      })
      .passthrough()
      .optional(),

    fleetchartImage: ViewFieldSchema,
    metrics: z
      .object({
        beam: z.number().nullable().optional(),
        cargo: z.number().nullable().optional(),
        height: z.number().nullable().optional(),
        hydrogenFuelTankSize: z.number().nullable().optional(),
        length: z.number().nullable().optional(),
        mass: z.number().nullable().optional(),
        quantumFuelTankSize: z.number().nullable().optional(),
        size: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
    speeds: z
      .object({
        scmSpeed: z.number().nullable().optional(),
      })
      .passthrough()
      .optional(),
    onSale: z.boolean().optional().default(false),
    hasImages: z.boolean().optional().default(false),
    hasPaints: z.boolean().optional().default(false),
    lastUpdatedAt: z.string().optional().default(''),
    createdAt: z.string().optional().default(''),
    updatedAt: z.string().optional().default(''),
  })
  .passthrough();

/**
 * Inferred TypeScript type from the Zod schema.
 * Use this as the type for validated API responses within the sync pipeline.
 */
export type ValidatedFleetYardsShip = z.infer<typeof FleetYardsShipSchema>;

/**
 * Zod schema for validating ShipDocument before database insertion.
 * This is a secondary validation layer for internal consistency.
 */
export const ShipDocumentSchema = z.object({
  fleetyardsId: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  scIdentifier: z.string().nullable(),
  manufacturer: z.object({
    name: z.string(),
    code: z.string(),
    slug: z.string(),
    logo: z.string().nullable(),
  }),
  classification: z.string(),
  classificationLabel: z.string(),
  focus: z.string(),
  size: z.string(),
  productionStatus: z.string(),
  crew: z.object({
    min: z.number(),
    max: z.number(),
  }),
  cargo: z.number(),
  length: z.number(),
  beam: z.number(),
  height: z.number(),
  mass: z.number(),
  scmSpeed: z.number().nullable(),
  hydrogenFuelTankSize: z.number().nullable(),
  quantumFuelTankSize: z.number().nullable(),
  pledgePrice: z.number().nullable(),
  price: z.number().nullable(),
  description: z.string().nullable(),
  storeUrl: z.string().nullable(),
  images: z.object({
    store: z.string().nullable(),
    angledView: z.string().nullable(),
    angledViewMedium: z.string().nullable(),
    sideView: z.string().nullable(),
    sideViewMedium: z.string().nullable(),
    topView: z.string().nullable(),
    topViewMedium: z.string().nullable(),
    frontView: z.string().nullable(),
    frontViewMedium: z.string().nullable(),
    fleetchartImage: z.string().nullable(),
  }),
  imageMirrors: z
    .object({
      images: z.record(
        z.object({
          sourceUrl: z.string().nullable(),
          mirroredUrl: z.string().nullable(),
          contentHash: z.string().nullable(),
          contentType: z.string().nullable(),
          byteLength: z.number().nullable(),
          mirroredAt: z.date().nullable(),
          error: z.string().nullable(),
        })
      ),
      manufacturerLogo: z
        .object({
          sourceUrl: z.string().nullable(),
          mirroredUrl: z.string().nullable(),
          contentHash: z.string().nullable(),
          contentType: z.string().nullable(),
          byteLength: z.number().nullable(),
          mirroredAt: z.date().nullable(),
          error: z.string().nullable(),
        })
        .optional(),
    })
    .optional(),
  syncedAt: z.date(),
  syncVersion: z.number().int().positive(),
  fleetyardsUpdatedAt: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
