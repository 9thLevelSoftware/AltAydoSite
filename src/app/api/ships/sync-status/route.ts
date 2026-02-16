import { NextResponse } from 'next/server';
import { getLatestSyncStatus } from '@/lib/ship-storage';
import { logger } from '@/lib/logger';

/**
 * GET /api/ships/sync-status
 *
 * Returns the most recent sync status metadata: when the last sync ran,
 * how many ships are in the database, and the overall sync health.
 *
 * Public endpoint -- no authentication required (reference data).
 * Cached for 60 seconds with stale-while-revalidate to keep freshness
 * indicators reasonably current without hammering the database.
 */
export async function GET() {
  try {
    const status = await getLatestSyncStatus();

    const body = status
      ? {
          lastSyncAt: status.lastSyncAt,
          shipCount: status.shipCount,
          status: status.status,
          syncVersion: status.syncVersion,
        }
      : {
          lastSyncAt: null,
          shipCount: 0,
          status: 'unknown',
          syncVersion: 0,
        };

    const response = NextResponse.json(body);
    response.headers.set(
      'Cache-Control',
      'public, max-age=60, stale-while-revalidate=30'
    );
    return response;
  } catch (error) {
    logger.error('Error fetching sync status', error instanceof Error ? error : new Error(String(error)), { route: '/api/ships/sync-status' });
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}
