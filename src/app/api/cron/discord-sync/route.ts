import { NextRequest, NextResponse } from 'next/server';
import { syncAllUsersWithDiscord } from '@/lib/discord-user-sync';
import { logger } from '@/lib/logger';

// Force this API route to use Node.js runtime for discord.js compatibility
export const runtime = 'nodejs';

/**
 * GET /api/cron/discord-sync
 * Automated Discord user sync endpoint - designed to be called by cron jobs or external schedulers
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Automated Discord user sync started', { route: '/api/cron/discord-sync' });
    
    // Fail-closed cron auth: reject if CRON_SECRET not configured
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      logger.error('CRON_SECRET not configured - rejecting request', undefined, { route: '/api/cron/discord-sync' });
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request', { route: '/api/cron/discord-sync' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run the sync
    const syncResult = await syncAllUsersWithDiscord();
    
    logger.info('Automated Discord sync completed', {
      route: '/api/cron/discord-sync',
      totalUsers: syncResult.totalUsers,
      matchedUsers: syncResult.matchedUsers,
      updatedUsers: syncResult.updatedUsers,
      errorCount: syncResult.errors.length
    });

    // Log any errors but don't fail the request
    if (syncResult.errors.length > 0) {
      logger.warn('Discord sync completed with errors', { route: '/api/cron/discord-sync', errors: syncResult.errors });
    }

    return NextResponse.json({
      success: true,
      message: 'Discord user sync completed',
      result: {
        totalUsers: syncResult.totalUsers,
        matchedUsers: syncResult.matchedUsers,
        updatedUsers: syncResult.updatedUsers,
        errorCount: syncResult.errors.length,
        // Don't include full error details or user data in automated response
        hasErrors: syncResult.errors.length > 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Automated Discord sync failed', error instanceof Error ? error : new Error(String(error)), { route: '/api/cron/discord-sync' });
    
    return NextResponse.json({
      success: false,
      error: 'Discord sync failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST /api/cron/discord-sync
 * Manual trigger for testing
 */
export async function POST(request: NextRequest) {
  // Same logic as GET for manual testing
  return GET(request);
}
