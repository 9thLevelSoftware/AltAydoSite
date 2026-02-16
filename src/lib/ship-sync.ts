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
  getShipTimestamps,
  saveSyncStatus,
  getLatestSyncStatus,
} from '@/lib/ship-storage';
import { FleetYardsShipSchema } from '@/types/ship';
import type { SyncStatusDocument } from '@/types/ship';

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
  const { ships: rawShips, pagesProcessed, errors: fetchErrors } =
    await fetchAllShips();

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
      durationMs: Date.now() - startTime,
      status: 'failed',
      errors: ['Fetch returned 0 ships', ...fetchErrors],
      pagesProcessed,
    };

    await saveSyncStatus(failedStatus);
    return failedStatus as SyncStatusDocument;
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
      durationMs: Date.now() - startTime,
      status: 'failed',
      errors: ['Ship count dropped below 80% threshold', ...fetchErrors],
      pagesProcessed,
    };

    await saveSyncStatus(failedStatus);
    return failedStatus as SyncStatusDocument;
  }

  // ── Step 6: Delta filtering -- skip ships unchanged since last sync ───
  const storedTimestamps = await getShipTimestamps();
  let deltaUnchanged = 0;

  const changedRaw = rawShips.filter((raw) => {
    const r = raw as unknown as Record<string, unknown>;
    const id = r?.id as string | undefined;
    const upstreamUpdatedAt = (r?.updatedAt ?? r?.lastUpdatedAt ?? '') as string;

    if (id && storedTimestamps.has(id)) {
      const storedUpdatedAt = storedTimestamps.get(id)!;
      if (storedUpdatedAt && storedUpdatedAt === upstreamUpdatedAt) {
        deltaUnchanged++;
        return false;
      }
    }
    return true;
  });

  logger.info('Ship sync delta filter complete', {
    module: 'ship-sync',
    newOrChanged: changedRaw.length,
    unchanged: deltaUnchanged,
  });

  // ── Step 7: Validate and transform changed ships ────────────────────
  const validated: ReturnType<typeof transformFleetYardsShip>[] = [];
  const validationErrors: string[] = [];

  for (const raw of changedRaw) {
    const result = FleetYardsShipSchema.safeParse(raw);
    if (result.success) {
      validated.push(transformFleetYardsShip(result.data, syncVersion));
    } else {
      const shipName =
        (raw as unknown as Record<string, unknown>)?.name || 'unknown';
      const errorMsg = `Validation failed for "${shipName}": ${result.error.issues.map((i) => i.message).join(', ')}`;
      validationErrors.push(errorMsg);
      logger.warn('Ship validation failed', {
        module: 'ship-sync',
        shipName,
        issues: result.error.issues.map((i) => i.message),
      });
    }
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
  if (validated.length === 0 && deltaUnchanged === 0) {
    // No ships validated AND none were delta-skipped → everything failed
    status = 'failed';
  } else if (validationErrors.length > 0 || fetchErrors.length > 0) {
    status = 'partial';
  } else {
    status = 'success';
  }

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
    durationMs: duration,
    status,
    errors: [...fetchErrors, ...validationErrors],
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
    durationMs: syncStatus.durationMs,
  });

  return syncStatus as SyncStatusDocument;
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
 * - SHIP_SYNC_ENABLED: Set to 'false' to disable cron scheduling
 *
 * On startup, checks if sync is overdue (>72h) and runs immediately if needed.
 */
export function startShipSyncCron(): void {
  const schedule = process.env.SHIP_SYNC_CRON_SCHEDULE || '0 0 */2 * *';
  const enabled = process.env.SHIP_SYNC_ENABLED !== 'false';

  if (!enabled) {
    logger.info('Ship sync cron disabled via SHIP_SYNC_ENABLED=false', { module: 'ship-sync' });
    return;
  }

  // Use require() to avoid ESM/CJS issues with Next.js bundling
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cron = require('node-cron');

  if (!cron.validate(schedule)) {
    logger.error('Invalid cron schedule for ship sync', undefined, { module: 'ship-sync', schedule });
    return;
  }

  cron.schedule(schedule, async () => {
    logger.info('Ship sync cron triggered', { module: 'ship-sync' });
    try {
      await syncShipsFromFleetYards();
    } catch (error) {
      logger.error('Ship sync cron failed', error instanceof Error ? error : undefined, { module: 'ship-sync' });
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
