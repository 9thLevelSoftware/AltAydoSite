import { after, NextRequest, NextResponse } from 'next/server';
import { syncShipsFromFleetYards } from '@/lib/ship-sync';
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
      errorCount: result.errors.length,
      hasErrors: result.errors.length > 0,
      errors: result.errors.slice(0, 10),
    },
    timestamp: new Date().toISOString(),
  };
}

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
