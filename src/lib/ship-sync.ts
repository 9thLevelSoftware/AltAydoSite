/**
 * Ship Sync Orchestrator
 *
 * Ties together the FleetYards API client, Zod validation, transform, and
 * MongoDB storage into a complete sync pipeline. Also provides cron scheduling
 * for automatic periodic syncs.
 *
 * Pipeline: fetch -> sanity check -> validate (Zod) -> transform -> upsert -> audit log
 *
 * Exports:
 * - syncShipsFromFleetYards(): Run the full sync pipeline once
 * - startShipSyncCron(): Start the node-cron scheduler for automatic syncs
 */

import { logger } from '@/lib/logger';
import { fetchAllShips } from '@/lib/fleetyards/client';
import { transformFleetYardsShip } from '@/lib/fleetyards/transform';
import {
  upsertShips,
  getShipCount,
  getShipSyncStates,
  saveSyncStatus,
  getLatestSyncStatus,
  acquireShipSyncLock,
  releaseShipSyncLock,
} from '@/lib/ship-storage';
import { FleetYardsShipSchema } from '@/types/ship';
import type { SyncStatusDocument } from '@/types/ship';
import { mirrorShipAssets, needsImageMirrorBackfill } from '@/lib/ships/r2-image-mirror';

const DEFAULT_MAX_CHANGED_SHIPS_PER_RUN = 75;
const MAX_STATUS_ERRORS = 100;

function getNonNegativeIntegerEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return defaultValue;
  return Math.floor(parsed);
}

function compactErrors(errors: string[]): string[] {
  if (errors.length <= MAX_STATUS_ERRORS) return errors;
  return [
    ...errors.slice(0, MAX_STATUS_ERRORS),
    `Truncated ${errors.length - MAX_STATUS_ERRORS} additional sync errors`,
  ];
}

function rawShipIdentity(raw: unknown): { id?: string; upstreamUpdatedAt: string; name: string } {
  if (!raw || typeof raw !== 'object') {
    return { upstreamUpdatedAt: '', name: 'unknown' };
  }

  const record = raw as Record<string, unknown>;
  return {
    id: typeof record.id === 'string' ? record.id : undefined,
    upstreamUpdatedAt:
      typeof record.updatedAt === 'string'
        ? record.updatedAt
        : typeof record.lastUpdatedAt === 'string'
          ? record.lastUpdatedAt
          : '',
    name: typeof record.name === 'string' ? record.name : 'unknown',
  };
}

// ---------------------------------------------------------------------------
// Sync Pipeline
// ---------------------------------------------------------------------------

/**
 * Run the full ship sync pipeline: fetch all ships from the FleetYards API,
 * validate each with Zod, transform to internal format, upsert into MongoDB,
 * and record an audit log entry.
 *
 * Safety mechanisms:
 * - Aborts if fetch returns 0 ships (preserves existing data)
 * - Aborts if fetched count drops below 80% of previous sync count
 * - Malformed records are logged and skipped (do not block other ships)
 *
 * @returns The SyncStatusDocument written to the audit log
 */
export async function syncShipsFromFleetYards(): Promise<SyncStatusDocument> {
  const startTime = Date.now();

  const lockTtlMs = getNonNegativeIntegerEnv('SHIP_SYNC_LOCK_TTL_MS', 2 * 60 * 60 * 1000);
  const lock = await acquireShipSyncLock(lockTtlMs > 0 ? lockTtlMs : 2 * 60 * 60 * 1000);

  if (!lock) {
    const latestStatus = await getLatestSyncStatus();
    logger.warn('Ship sync skipped because another sync is already running', {
      module: 'ship-sync',
    });
    return {
      type: 'ship-sync',
      syncVersion: latestStatus?.syncVersion ?? 0,
      lastSyncAt: new Date(),
      shipCount: latestStatus?.shipCount ?? 0,
      newShips: 0,
      updatedShips: 0,
      unchangedShips: 0,
      skippedShips: 0,
      deferredShips: 0,
      mirroredImages: 0,
      failedImages: 0,
      durationMs: Date.now() - startTime,
      status: 'partial',
      errors: ['Another ship sync is already running'],
      pagesProcessed: 0,
      lockSkipped: true,
    };
  }

  try {
    // ── Step 1: Get previous sync status for sanity checking ──────────────
    const previousStatus = await getLatestSyncStatus();
    const previousShipCount = previousStatus?.shipCount ?? 0;

    // ── Step 2: Determine next sync version ───────────────────────────────
    const syncVersion = previousStatus ? previousStatus.syncVersion + 1 : 1;

    logger.info('Starting ship sync', {
      module: 'ship-sync',
      syncVersion,
      previousShipCount,
    });

    // ── Step 3: Fetch all ships from FleetYards API ───────────────────────
    const { ships: rawShips, pagesProcessed, errors: fetchErrors } = await fetchAllShips();

    // ── Step 4: Handle empty fetch (SYNC-05) ──────────────────────────────
    if (rawShips.length === 0) {
      logger.error('Fetch returned 0 ships, aborting sync to preserve existing data', undefined, {
        module: 'ship-sync',
      });

      const failedStatus: Omit<SyncStatusDocument, '_id'> = {
        type: 'ship-sync',
        syncVersion,
        lastSyncAt: new Date(),
        shipCount: previousShipCount,
        newShips: 0,
        updatedShips: 0,
        unchangedShips: 0,
        skippedShips: 0,
        deferredShips: 0,
        mirroredImages: 0,
        failedImages: 0,
        durationMs: Date.now() - startTime,
        status: 'failed',
        errors: ['Fetch returned 0 ships', ...fetchErrors],
        pagesProcessed,
      };

      await saveSyncStatus(failedStatus);
      return failedStatus;
    }

    // ── Step 5: Sanity check -- abort if count drops below 80% ────────────
    if (previousShipCount > 0 && rawShips.length < previousShipCount * 0.8) {
      logger.warn('Ship count dropped below 80% threshold, aborting sync', {
        module: 'ship-sync',
        fetchedCount: rawShips.length,
        expectedCount: previousShipCount,
      });

      const failedStatus: Omit<SyncStatusDocument, '_id'> = {
        type: 'ship-sync',
        syncVersion,
        lastSyncAt: new Date(),
        shipCount: previousShipCount,
        newShips: 0,
        updatedShips: 0,
        unchangedShips: 0,
        skippedShips: 0,
        deferredShips: 0,
        mirroredImages: 0,
        failedImages: 0,
        durationMs: Date.now() - startTime,
        status: 'failed',
        errors: ['Ship count dropped below 80% threshold', ...fetchErrors],
        pagesProcessed,
      };

      await saveSyncStatus(failedStatus);
      return failedStatus;
    }

    // ── Step 6: Delta filtering -- skip ships unchanged and already mirrored ─
    const storedSyncStates = await getShipSyncStates();
    let deltaUnchanged = 0;

    const dataChanges: typeof rawShips = [];
    const backfillChanges: typeof rawShips = [];

    for (const raw of rawShips) {
      const { id, upstreamUpdatedAt } = rawShipIdentity(raw);
      const existing = id ? storedSyncStates.get(id) : undefined;

      if (!id || !existing) {
        dataChanges.push(raw);
        continue;
      }

      const sourceTimestampChanged =
        !existing.fleetyardsUpdatedAt || existing.fleetyardsUpdatedAt !== upstreamUpdatedAt;
      if (sourceTimestampChanged) {
        dataChanges.push(raw);
        continue;
      }

      if (needsImageMirrorBackfill(existing)) {
        backfillChanges.push(raw);
        continue;
      }

      deltaUnchanged++;
    }

    const changedCandidates = [...dataChanges, ...backfillChanges];
    const dataChangedCandidates = dataChanges.length;
    const backfillCandidates = backfillChanges.length;

    const maxChangedShipsPerRun = getNonNegativeIntegerEnv(
      'SHIP_SYNC_MAX_CHANGED_SHIPS_PER_RUN',
      DEFAULT_MAX_CHANGED_SHIPS_PER_RUN
    );
    const changedRaw =
      maxChangedShipsPerRun === 0
        ? changedCandidates
        : changedCandidates.slice(0, maxChangedShipsPerRun);
    const deferredShips = changedCandidates.length - changedRaw.length;

    if (deferredShips > 0) {
      logger.warn('Ship sync deferred changed ships due to per-run processing limit', {
        module: 'ship-sync',
        processedChangedShips: changedRaw.length,
        deferredShips,
        dataChangedCandidates,
        backfillCandidates,
        maxChangedShipsPerRun,
      });
    }

    logger.info('Ship sync delta filter complete', {
      module: 'ship-sync',
      newOrChanged: changedRaw.length,
      dataChangedCandidates,
      backfillCandidates,
      deferredShips,
      unchanged: deltaUnchanged,
    });

    // ── Step 7: Validate, transform, and mirror changed ships ─────────────
    const validated: ReturnType<typeof transformFleetYardsShip>[] = [];
    const validationErrors: string[] = [];
    const mirrorErrors: string[] = [];
    let mirroredImages = 0;
    let failedImages = 0;

    for (const raw of changedRaw) {
      const result = FleetYardsShipSchema.safeParse(raw);
      if (result.success) {
        try {
          const transformed = transformFleetYardsShip(result.data, syncVersion);
          const existing = storedSyncStates.get(transformed.fleetyardsId);
          const mirrored = await mirrorShipAssets(transformed, existing);

          validated.push(mirrored.ship);
          mirroredImages += mirrored.mirroredImages;
          failedImages += mirrored.failedImages;
          mirrorErrors.push(...mirrored.errors);
        } catch (error) {
          // Isolate per-ship transform/mirror failures so one bad ship cannot
          // abort the entire sync. Record the failure and continue; Steps 8-12
          // still run and a partial sync status is upserted/saved.
          const { id, name: shipName } = rawShipIdentity(raw);
          const message = error instanceof Error ? error.message : String(error);
          mirrorErrors.push(
            `Transform/mirror failed for "${shipName}"${id ? ` (${id})` : ''}: ${message}`
          );
          logger.warn('Ship transform/mirror failed', {
            module: 'ship-sync',
            shipName,
            shipId: id,
            error: message,
          });
        }
      } else {
        const { name: shipName } = rawShipIdentity(raw);
        const errorMsg = `Validation failed for "${shipName}": ${result.error.issues.map((i) => i.message).join(', ')}`;
        validationErrors.push(errorMsg);
        logger.warn('Ship validation failed', {
          module: 'ship-sync',
          shipName,
          issues: result.error.issues.map((i) => i.message),
        });
      }
    }

    if (mirrorErrors.length > 0) {
      logger.warn('Ship image mirror completed with errors', {
        module: 'ship-sync',
        errorCount: mirrorErrors.length,
        sampleErrors: mirrorErrors.slice(0, 10),
      });
    }

    // ── Step 8: Upsert validated ships into MongoDB ──────────────────────
    let upsertResult: {
      newShips: number;
      updatedShips: number;
      unchangedShips: number;
    } | null = null;

    if (validated.length > 0) {
      upsertResult = await upsertShips(validated);
    }

    // ── Step 9: Get final ship count ──────────────────────────────────────
    const finalShipCount = await getShipCount();

    // ── Step 10: Calculate duration ───────────────────────────────────────
    const duration = Date.now() - startTime;

    // ── Step 11: Determine status ─────────────────────────────────────────
    let status: 'success' | 'partial' | 'failed';
    if (validated.length === 0 && deltaUnchanged === 0 && deferredShips === 0) {
      // No ships validated AND none were delta-skipped means everything failed.
      status = 'failed';
    } else if (
      validationErrors.length > 0 ||
      fetchErrors.length > 0 ||
      mirrorErrors.length > 0 ||
      deferredShips > 0
    ) {
      status = 'partial';
    } else {
      status = 'success';
    }

    const deferredErrors =
      deferredShips > 0
        ? [
            `Deferred ${deferredShips} changed ships due to SHIP_SYNC_MAX_CHANGED_SHIPS_PER_RUN limit`,
          ]
        : [];

    // ── Step 12: Build and save sync status audit record ─────────────────
    const syncStatus: Omit<SyncStatusDocument, '_id'> = {
      type: 'ship-sync',
      syncVersion,
      lastSyncAt: new Date(),
      shipCount: finalShipCount,
      newShips: upsertResult?.newShips ?? 0,
      updatedShips: upsertResult?.updatedShips ?? 0,
      unchangedShips: (upsertResult?.unchangedShips ?? 0) + deltaUnchanged,
      skippedShips: validationErrors.length,
      deferredShips,
      mirroredImages,
      failedImages,
      durationMs: duration,
      status,
      errors: compactErrors([
        ...fetchErrors,
        ...validationErrors,
        ...mirrorErrors,
        ...deferredErrors,
      ]),
      pagesProcessed,
    };

    await saveSyncStatus(syncStatus);

    // ── Step 13: Log summary ──────────────────────────────────────────────
    logger.info('Ship sync complete', {
      module: 'ship-sync',
      status: syncStatus.status,
      shipCount: syncStatus.shipCount,
      newShips: syncStatus.newShips,
      updatedShips: syncStatus.updatedShips,
      skippedShips: syncStatus.skippedShips,
      deferredShips: syncStatus.deferredShips,
      mirroredImages: syncStatus.mirroredImages,
      failedImages: syncStatus.failedImages,
      durationMs: syncStatus.durationMs,
    });

    return syncStatus;
  } finally {
    await releaseShipSyncLock(lock);
  }
}

// ---------------------------------------------------------------------------
// Cron Scheduling
// ---------------------------------------------------------------------------

/**
 * Check if sync is overdue (>72h since last sync) and run immediately if so.
 * Called on startup to catch up after server downtime. The 72h threshold
 * gives the default 48h schedule a comfortable buffer.
 */
async function checkAndRunOverdueSync(): Promise<void> {
  const lastSync = await getLatestSyncStatus();
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

  if (!lastSync || lastSync.lastSyncAt < seventyTwoHoursAgo) {
    logger.info('Ship sync is overdue, running now', { module: 'ship-sync' });
    await syncShipsFromFleetYards();
  }
}

/**
 * Start the node-cron scheduler for automatic ship syncs.
 *
 * Configuration via environment variables:
 * - SHIP_SYNC_CRON_SCHEDULE: Cron expression (default: midnight every 2 days)
 * - SHIP_SYNC_IN_PROCESS_CRON_ENABLED: Set to 'true' to enable backup in-app cron
 *
 * External scheduling is the default source of truth. The in-app cron stays
 * opt-in so Azure restarts/scale-out cannot create duplicate workers.
 */
export function startShipSyncCron(): void {
  const schedule = process.env.SHIP_SYNC_CRON_SCHEDULE || '0 0 */2 * *';
  const enabled = process.env.SHIP_SYNC_IN_PROCESS_CRON_ENABLED === 'true';

  if (!enabled) {
    logger.info('Ship sync in-process cron disabled; external scheduler is expected', {
      module: 'ship-sync',
    });
    return;
  }

  // Use require() to avoid ESM/CJS issues with Next.js bundling
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cron = require('node-cron');

  if (!cron.validate(schedule)) {
    logger.error('Invalid cron schedule for ship sync', undefined, {
      module: 'ship-sync',
      schedule,
    });
    return;
  }

  cron.schedule(schedule, async () => {
    logger.info('Ship sync cron triggered', { module: 'ship-sync' });
    try {
      await syncShipsFromFleetYards();
    } catch (error) {
      logger.error('Ship sync cron failed', error instanceof Error ? error : undefined, {
        module: 'ship-sync',
      });
    }
  });

  logger.info('Ship sync cron scheduled', { module: 'ship-sync', schedule });

  // Check if sync is overdue (>72h since last) and run immediately
  checkAndRunOverdueSync().catch((err) => {
    logger.warn('Overdue sync check failed', {
      module: 'ship-sync',
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
