import { NextRequest, NextResponse } from 'next/server';
import { syncShipsFromFleetYards } from '@/lib/ship-sync';

// Force this API route to use Node.js runtime (not Edge)
export const runtime = 'nodejs';

/**
 * GET /api/cron/ship-sync
 * Trigger ship sync from FleetYards API.
 * Designed to be called by external cron services or manual testing.
 * Protected by optional CRON_SECRET Bearer auth.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[ship-sync] API sync triggered');

    // Fail-closed cron auth: reject if CRON_SECRET not configured
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[cron] CRON_SECRET not configured - rejecting request');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('[ship-sync] Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncShipsFromFleetYards();

    console.log('[ship-sync] API sync completed:', {
      status: result.status,
      shipCount: result.shipCount,
      newShips: result.newShips,
      updatedShips: result.updatedShips,
      skippedShips: result.skippedShips,
    });

    if (result.errors.length > 0) {
      console.warn(
        '[ship-sync] Sync completed with errors:',
        result.errors.slice(0, 10),
      );
    }

    return NextResponse.json({
      success: result.status !== 'failed',
      result: {
        status: result.status,
        shipCount: result.shipCount,
        newShips: result.newShips,
        updatedShips: result.updatedShips,
        unchangedShips: result.unchangedShips,
        skippedShips: result.skippedShips,
        durationMs: result.durationMs,
        pagesProcessed: result.pagesProcessed,
        errorCount: result.errors.length,
        hasErrors: result.errors.length > 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ship-sync] API sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
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
