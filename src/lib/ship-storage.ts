/**
 * Ship Storage Module -- MongoDB CRUD for ships and sync-status collections
 *
 * Unlike user-storage.ts, this module does NOT provide a local JSON fallback.
 * Ships are cached reference data from the FleetYards API. If MongoDB is
 * unavailable, ship data is simply not accessible until the connection is
 * restored.
 *
 * Key design decisions:
 * - Upsert-never-delete pattern: ships are inserted or updated, never removed
 * - createdAt is set only on first insert via $setOnInsert
 * - Sync status is append-only (insertOne, never updateOne)
 * - bulkWrite with ordered:false for maximum throughput, with individual
 *   upsert fallback for Cosmos DB compatibility
 */

import { connectToDatabase } from '@/lib/mongodb';
import type { Sort } from 'mongodb';
import type { ShipDocument, SyncStatusDocument } from '@/types/ship';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';

/** UUID v4 pattern for distinguishing FleetYards UUIDs from slugs */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Get the ships collection from the database.
 */
async function getShipsCollection() {
  const { db } = await connectToDatabase();
  return db.collection('ships');
}

/**
 * Get the sync-status collection from the database.
 */
async function getSyncStatusCollection() {
  const { db } = await connectToDatabase();
  return db.collection('sync-status');
}

interface SyncLockDocument {
  _id: string;
  ownerId: string;
  type: 'ship-sync';
  acquiredAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

async function getSyncLocksCollection() {
  const { db } = await connectToDatabase();
  return db.collection<SyncLockDocument>('sync-locks');
}

export interface ShipSyncState {
  fleetyardsId: string;
  fleetyardsUpdatedAt: string;
  images: ShipDocument['images'];
  manufacturer: ShipDocument['manufacturer'];
  imageMirrors?: ShipDocument['imageMirrors'];
}

export interface AcquiredSyncLock {
  ownerId: string;
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// Ship CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Bulk upsert ships into the ships collection.
 *
 * Uses bulkWrite with ordered:false for maximum throughput. If bulkWrite
 * fails (e.g. Cosmos DB compatibility issue), falls back to individual
 * updateOne calls with per-document error handling.
 *
 * - New ships are inserted with createdAt set via $setOnInsert
 * - Existing ships are updated (createdAt is preserved)
 * - No ships are ever deleted
 */
export async function upsertShips(
  ships: Omit<ShipDocument, '_id' | 'createdAt'>[]
): Promise<{ newShips: number; updatedShips: number; unchangedShips: number }> {
  if (ships.length === 0) {
    return { newShips: 0, updatedShips: 0, unchangedShips: 0 };
  }

  logger.info('Upserting ships', { collection: 'ships', operation: 'upsert', count: ships.length });

  const shipsCollection = await getShipsCollection();

  // Build bulkWrite operations
  const operations = ships.map((ship) => ({
    updateOne: {
      filter: { fleetyardsId: ship.fleetyardsId },
      update: {
        $set: { ...ship },
        $setOnInsert: { createdAt: new Date() },
      },
      upsert: true,
    },
  }));

  try {
    // Attempt bulkWrite for maximum throughput
    const result = await shipsCollection.bulkWrite(operations, { ordered: false });

    const newShips = result.upsertedCount;
    const updatedShips = result.modifiedCount;
    const unchangedShips = result.matchedCount - result.modifiedCount;

    logger.info('Bulk upsert complete', { storage: 'MongoDB', collection: 'ships', newShips, updatedShips, unchangedShips });

    return { newShips, updatedShips, unchangedShips };
  } catch (bulkError) {
    logger.error('bulkWrite failed, falling back to individual upserts', bulkError instanceof Error ? bulkError : new Error(String(bulkError)), { collection: 'ships' });

    // Fallback: individual upserts with per-document error handling
    let newShips = 0;
    let updatedShips = 0;
    let unchangedShips = 0;
    let errorCount = 0;

    for (const ship of ships) {
      try {
        const result = await shipsCollection.updateOne(
          { fleetyardsId: ship.fleetyardsId },
          {
            $set: { ...ship },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          newShips++;
        } else if (result.modifiedCount > 0) {
          updatedShips++;
        } else {
          unchangedShips++;
        }
      } catch (docError) {
        errorCount++;
        logger.error('Error upserting ship', docError instanceof Error ? docError : new Error(String(docError)), { collection: 'ships', fleetyardsId: ship.fleetyardsId, shipName: ship.name });
      }
    }

    if (errorCount > 0) {
      logger.error('Individual upsert completed with errors', undefined, { collection: 'ships', errorCount, totalShips: ships.length });
    }

    logger.info('Individual upsert complete', { storage: 'MongoDB', collection: 'ships', newShips, updatedShips, unchangedShips });

    return { newShips, updatedShips, unchangedShips };
  }
}

/**
 * Get a lightweight map of fleetyardsId → fleetyardsUpdatedAt for all ships.
 * Used by the sync pipeline for delta detection: only ships whose upstream
 * updatedAt differs from the stored value need to be validated and upserted.
 */
export async function getShipTimestamps(): Promise<Map<string, string>> {
  try {
    const shipsCollection = await getShipsCollection();
    const docs = await shipsCollection
      .find({}, { projection: { fleetyardsId: 1, fleetyardsUpdatedAt: 1, _id: 0 } })
      .toArray();

    const map = new Map<string, string>();
    for (const doc of docs) {
      if (doc.fleetyardsId) {
        map.set(doc.fleetyardsId as string, (doc.fleetyardsUpdatedAt as string) || '');
      }
    }
    return map;
  } catch (error) {
    logger.error('Error in getShipTimestamps', error instanceof Error ? error : new Error(String(error)), { collection: 'ships' });
    return new Map();
  }
}

/**
 * Get the stored source/mirror state needed to decide whether a ship must be
 * refreshed. This keeps delta decisions out of the hot public ship APIs.
 */
export async function getShipSyncStates(): Promise<Map<string, ShipSyncState>> {
  try {
    const shipsCollection = await getShipsCollection();
    const docs = await shipsCollection
      .find(
        {},
        {
          projection: {
            fleetyardsId: 1,
            fleetyardsUpdatedAt: 1,
            images: 1,
            manufacturer: 1,
            imageMirrors: 1,
            _id: 0,
          },
        }
      )
      .toArray();

    const map = new Map<string, ShipSyncState>();
    for (const doc of docs) {
      if (typeof doc.fleetyardsId === 'string') {
        map.set(doc.fleetyardsId, doc as unknown as ShipSyncState);
      }
    }
    return map;
  } catch (error) {
    logger.error('Error in getShipSyncStates', error instanceof Error ? error : new Error(String(error)), { collection: 'ships' });
    return new Map();
  }
}

/**
 * Get the total number of ships in the collection.
 * Used for pre/post-sync sanity checks.
 */
export async function getShipCount(): Promise<number> {
  try {
    const shipsCollection = await getShipsCollection();
    return await shipsCollection.countDocuments({});
  } catch (error) {
    logger.error('Error in getShipCount', error instanceof Error ? error : new Error(String(error)), { collection: 'ships' });
    return 0;
  }
}

/**
 * Find a ship by its FleetYards UUID.
 */
export async function getShipByFleetyardsId(
  fleetyardsId: string
): Promise<ShipDocument | null> {
  try {
    const shipsCollection = await getShipsCollection();
    const doc = await shipsCollection.findOne(
      { fleetyardsId },
      { projection: { _id: 0 } }
    );
    return doc as ShipDocument | null;
  } catch (error) {
    logger.error('Error in getShipByFleetyardsId', error instanceof Error ? error : new Error(String(error)), { collection: 'ships', fleetyardsId });
    return null;
  }
}

/**
 * Find a ship by its URL-friendly slug.
 */
export async function getShipBySlug(slug: string): Promise<ShipDocument | null> {
  try {
    const shipsCollection = await getShipsCollection();
    const doc = await shipsCollection.findOne(
      { slug },
      { projection: { _id: 0 } }
    );
    return doc as ShipDocument | null;
  } catch (error) {
    logger.error('Error in getShipBySlug', error instanceof Error ? error : new Error(String(error)), { collection: 'ships', slug });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sync Status Audit Log
// ---------------------------------------------------------------------------

/**
 * Save a sync status audit record. This is an append-only log --
 * each sync run creates a new document, never updates an existing one.
 */
export async function saveSyncStatus(
  status: Omit<SyncStatusDocument, '_id'>
): Promise<void> {
  try {
    const syncStatusCollection = await getSyncStatusCollection();
    await syncStatusCollection.insertOne(status);
    logger.info('Sync status saved', { storage: 'MongoDB', collection: 'sync-status', status: status.status, syncVersion: status.syncVersion });
  } catch (error) {
    logger.error('Error in saveSyncStatus', error instanceof Error ? error : new Error(String(error)), { collection: 'sync-status' });
    throw error;
  }
}

/**
 * Retrieve the most recent sync status record.
 * Returns null if no sync has ever been recorded.
 */
export async function getLatestSyncStatus(): Promise<SyncStatusDocument | null> {
  try {
    const syncStatusCollection = await getSyncStatusCollection();
    const doc = await syncStatusCollection.findOne(
      { type: 'ship-sync' },
      { sort: { lastSyncAt: -1 }, projection: { _id: 0 } }
    );
    return doc as SyncStatusDocument | null;
  } catch (error) {
    logger.error('Error in getLatestSyncStatus', error instanceof Error ? error : new Error(String(error)), { collection: 'sync-status' });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sync Locking
// ---------------------------------------------------------------------------

/**
 * Acquire a coarse MongoDB lock for the ship sync job.
 *
 * The lock prevents deploy hooks, manual triggers, and scheduled workflows from
 * running overlapping FleetYards/R2 jobs. Expiry makes it self-healing if the
 * process dies mid-sync.
 */
export async function acquireShipSyncLock(ttlMs = 2 * 60 * 60 * 1000): Promise<AcquiredSyncLock | null> {
  const syncLocksCollection = await getSyncLocksCollection();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const ownerId = randomUUID();
  const lockId = 'ship-sync';

  const updateResult = await syncLocksCollection.updateOne(
    {
      _id: lockId,
      $or: [
        { expiresAt: { $lte: now } },
        { expiresAt: { $exists: false } },
      ],
    },
    {
      $set: {
        ownerId,
        type: 'ship-sync',
        acquiredAt: now,
        updatedAt: now,
        expiresAt,
      },
    }
  );

  if (updateResult.modifiedCount > 0) {
    return { ownerId, expiresAt };
  }

  try {
    await syncLocksCollection.insertOne({
      _id: lockId,
      ownerId,
      type: 'ship-sync',
      acquiredAt: now,
      updatedAt: now,
      expiresAt,
    });
    return { ownerId, expiresAt };
  } catch {
    return null;
  }
}

/**
 * Release a previously acquired sync lock. The owner check prevents a stale
 * worker from deleting a newer lock after expiry/reacquire.
 */
export async function releaseShipSyncLock(lock: AcquiredSyncLock): Promise<void> {
  try {
    const syncLocksCollection = await getSyncLocksCollection();
    await syncLocksCollection.deleteOne({ _id: 'ship-sync', ownerId: lock.ownerId });
  } catch (error) {
    logger.warn('Failed to release ship sync lock', {
      collection: 'sync-locks',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ---------------------------------------------------------------------------
// Ship Query Operations
// ---------------------------------------------------------------------------

/** Options for the paginated ship search/filter query */
export interface ShipQueryOptions {
  page: number;
  pageSize: number;
  /** Filter by manufacturer.slug */
  manufacturer?: string;
  /** Filter by size field */
  size?: string;
  /** Filter by classification field */
  classification?: string;
  /** Filter by productionStatus field */
  productionStatus?: string;
  /** $text search on name + manufacturer.name */
  search?: string;
}

/** Paginated result set returned by findShips */
export interface ShipQueryResult {
  items: ShipDocument[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Manufacturer summary with ship count */
export interface ManufacturerInfo {
  name: string;
  code: string;
  slug: string;
  logo: string | null;
  shipCount: number;
}

/**
 * Find ships with optional text search, field filters, and pagination.
 *
 * When `search` is provided the query uses the $text index for relevance-ranked
 * results. If the $text index is unavailable (e.g. index creation failed), the
 * function falls back to a case-insensitive $regex match on the name field.
 *
 * Filtering and pagination are pushed to MongoDB -- no in-memory filtering.
 */
export async function findShips(options: ShipQueryOptions): Promise<ShipQueryResult> {
  const { page, pageSize, manufacturer, size, classification, productionStatus, search } = options;

  const shipsCollection = await getShipsCollection();

  // Build filter object
  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$text = { $search: search };
  }
  if (manufacturer) {
    filter['manufacturer.slug'] = manufacturer;
  }
  if (size) {
    filter.size = size;
  }
  if (classification) {
    filter.classification = classification;
  }
  if (productionStatus) {
    filter.productionStatus = productionStatus;
  }

  // Sort and projection depend on whether we are doing a text search
  const sort: Sort = search
    ? { score: { $meta: 'textScore' } }
    : { name: 1 };
  // Keep full ship documents in search responses; projecting only `score`
  // would strip fields needed by UI renderers (name, manufacturer, etc.).
  const projection: Record<string, unknown> = { _id: 0 };

  const skip = (page - 1) * pageSize;

  try {
    const [items, total] = await Promise.all([
      shipsCollection
        .find(filter, { projection })
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .toArray() as Promise<ShipDocument[]>,
      shipsCollection.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  } catch (error) {
    // If the $text index is missing, the $text query will fail.
    // Fall back to a $regex search on the name field.
    if (search) {
      logger.error('$text query failed, falling back to $regex', error instanceof Error ? error : new Error(String(error)), { collection: 'ships' });

      // Rebuild filter replacing $text with $regex on name
      delete filter.$text;
      filter.name = { $regex: search, $options: 'i' };

      const fallbackSort = { name: 1 as const };
      const fallbackProjection: Record<string, unknown> = { _id: 0 };

      const [items, total] = await Promise.all([
        shipsCollection
          .find(filter, { projection: fallbackProjection })
          .sort(fallbackSort)
          .skip(skip)
          .limit(pageSize)
          .toArray() as Promise<ShipDocument[]>,
        shipsCollection.countDocuments(filter),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    }

    // Non-search query failure -- rethrow
    logger.error('Error in findShips', error instanceof Error ? error : new Error(String(error)), { collection: 'ships' });
    throw error;
  }
}

/**
 * Look up a ship by either its FleetYards UUID or its URL slug.
 *
 * If the input matches UUID v4 format, delegates to getShipByFleetyardsId.
 * Otherwise, delegates to getShipBySlug.
 */
export async function getShipByIdOrSlug(idOrSlug: string): Promise<ShipDocument | null> {
  if (UUID_REGEX.test(idOrSlug)) {
    return getShipByFleetyardsId(idOrSlug);
  }
  return getShipBySlug(idOrSlug);
}

/**
 * Retrieve multiple ships by an array of FleetYards UUIDs in a single
 * database round-trip using $in.
 *
 * Returns an empty array if the input is empty or on failure.
 */
export async function getShipsByFleetyardsIds(ids: string[]): Promise<ShipDocument[]> {
  if (ids.length === 0) {
    return [];
  }

  try {
    const shipsCollection = await getShipsCollection();
    const docs = await shipsCollection
      .find(
        { fleetyardsId: { $in: ids } },
        { projection: { _id: 0 } }
      )
      .toArray();
    return docs as ShipDocument[];
  } catch (error) {
    logger.error('Error in getShipsByFleetyardsIds', error instanceof Error ? error : new Error(String(error)), { collection: 'ships', idCount: ids.length });
    return [];
  }
}

/**
 * Aggregate distinct manufacturers from the ships collection with ship counts.
 *
 * Returns an alphabetically sorted list of manufacturers, each with their
 * name, code, slug, and the number of ships they produce.
 */
export async function getManufacturers(): Promise<ManufacturerInfo[]> {
  try {
    const shipsCollection = await getShipsCollection();
    const results = await shipsCollection
      .aggregate([
        {
          $group: {
            _id: '$manufacturer.slug',
            name: { $first: '$manufacturer.name' },
            code: { $first: '$manufacturer.code' },
            slug: { $first: '$manufacturer.slug' },
            logo: { $first: '$manufacturer.logo' },
            shipCount: { $sum: 1 },
          },
        },
        { $sort: { name: 1 } },
        {
          $project: {
            _id: 0,
            name: 1,
            code: 1,
            slug: 1,
            logo: 1,
            shipCount: 1,
          },
        },
      ])
      .toArray();
    return results as ManufacturerInfo[];
  } catch (error) {
    logger.error('Error in getManufacturers', error instanceof Error ? error : new Error(String(error)), { collection: 'ships' });
    return [];
  }
}
