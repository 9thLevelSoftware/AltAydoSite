import { after, NextRequest, NextResponse } from 'next/server';
import { syncShipsFromFleetYards } from '@/lib/ship-sync';
import { getLatestSyncStatus, saveSyncStatus } from '@/lib/ship-storage';
import { logger } from '@/lib/logger';
import type { SyncStatusDocument } from '@/types/ship';

// Force this API route to use Node.js runtime (not Edge)
export const runtime = 'nodejs';

function logSyncResult(result: SyncStatusDocument) {
  logger.info('API sync completed', {
    route: '/api/cron/ship-sync',
    status: result.status,
    shipCount: result.shipCount,
    newShips: result.newShips,
    updatedShips: result.updatedShips,
    skippedShips: result.skippedShips,
  });

  if (result.errors.length > 0) {
    logger.warn('Sync completed with errors', {
      route: '/api/cron/ship-sync',
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10),
    });
  }
}

function buildSyncResponseBody(result: SyncStatusDocument) {
  return {
    success: result.status !== 'failed',
    result: {
      syncVersion: result.syncVersion,
      lastSyncAt: result.lastSyncAt,
      status: result.status,
      shipCount: result.shipCount,
      newShips: result.newShips,
      updatedShips: result.updatedShips,
      unchangedShips: result.unchangedShips,
      skippedShips: result.skippedShips,
      deferredShips: result.deferredShips ?? 0,
      mirroredImages: result.mirroredImages ?? 0,
      failedImages: result.failedImages ?? 0,
      lockSkipped: result.lockSkipped ?? false,
      durationMs: result.durationMs,
      pagesProcessed: result.pagesProcessed,
      // Expose only sanitized counts to callers. Raw error strings can carry
      // upstream URLs, IDs, and stack-ish detail; those stay in the server log
      // (logSyncResult records the first 10). See api-routes-23.
      errorCount: result.errors.length,
      hasErrors: result.errors.length > 0,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Persist a 'failed' checkpoint when a background sync throws.
 *
 * This makes a crashed/aborted background job detectable via
 * GET /api/ships/sync-status. It does NOT cover hard process termination
 * (see the after() caveat on runSyncInBackground) -- if the worker is killed
 * mid-run, after()'s catch never executes and the last persisted status will
 * be the previous run. Operators should treat a sync that never advances its
 * syncVersion within the expected window as stale.
 */
async function recordBackgroundFailure(error: unknown): Promise<void> {
  try {
    const previous = await getLatestSyncStatus();
    const failedStatus: Omit<SyncStatusDocument, '_id'> = {
      type: 'ship-sync',
      syncVersion: previous?.syncVersion ?? 0,
      lastSyncAt: new Date(),
      shipCount: previous?.shipCount ?? 0,
      newShips: 0,
      updatedShips: 0,
      unchangedShips: 0,
      skippedShips: 0,
      deferredShips: 0,
      mirroredImages: 0,
      failedImages: 0,
      durationMs: 0,
      status: 'failed',
      errors: ['Background ship sync terminated before completion'],
      pagesProcessed: 0,
    };
    await saveSyncStatus(failedStatus);
  } catch (saveError) {
    logger.error(
      'Failed to persist background sync failure checkpoint',
      saveError instanceof Error ? saveError : new Error(String(saveError)),
      { route: '/api/cron/ship-sync' }
    );
  }
}

/**
 * Run the sync after the response is sent via `after()`.
 *
 * Platform caveat: `after()` callbacks run in a post-response background task
 * whose wall-clock budget is bounded by the host platform (e.g. serverless
 * function execution-time limits). A full FleetYards sync that exceeds that
 * budget can be terminated mid-run with no chance to write a checkpoint.
 *
 * Mitigations in place:
 * - syncShipsFromFleetYards() is resumable/chunked: it processes at most
 *   SHIP_SYNC_MAX_CHANGED_SHIPS_PER_RUN changed ships per invocation and
 *   defers the rest, so each invocation stays within a bounded budget.
 * - A 'failed' checkpoint is written on caught errors so an aborted job is
 *   surfaced through sync-status.
 *
 * For workloads that outgrow this, move the sync to a durable worker/queue or
 * an external scheduler that polls the chunked endpoint until deferredShips
 * reaches 0, rather than relying on a single request-adjacent after() task.
 */
function runSyncInBackground() {
  after(async () => {
    try {
      const result = await syncShipsFromFleetYards();
      logSyncResult(result);
    } catch (error) {
      logger.error(
        'Background API sync failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          route: '/api/cron/ship-sync',
        }
      );
      await recordBackgroundFailure(error);
    }
  });
}

/**
 * GET /api/cron/ship-sync
 * Trigger ship sync from FleetYards API.
 * Designed to be called by external cron services or manual testing.
 * Protected by optional CRON_SECRET Bearer auth.
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('API sync triggered', { route: '/api/cron/ship-sync' });

    // Fail-closed cron auth: reject if CRON_SECRET not configured
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      logger.error('CRON_SECRET not configured - rejecting request', undefined, {
        route: '/api/cron/ship-sync',
      });
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request', { route: '/api/cron/ship-sync' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (request.nextUrl.searchParams.get('mode') === 'async') {
      runSyncInBackground();
      return NextResponse.json(
        {
          success: true,
          accepted: true,
          mode: 'async',
          timestamp: new Date().toISOString(),
        },
        { status: 202 }
      );
    }

    const result = await syncShipsFromFleetYards();

    logSyncResult(result);
    const responseBody = buildSyncResponseBody(result);

    return NextResponse.json(responseBody, {
      status: result.status === 'failed' ? 502 : 200,
    });
  } catch (error) {
    logger.error('API sync failed', error instanceof Error ? error : new Error(String(error)), {
      route: '/api/cron/ship-sync',
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Ship sync failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/ship-sync
 * Manual trigger for testing -- delegates to GET handler.
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
