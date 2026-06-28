import { NextRequest, NextResponse } from 'next/server';
import { syncAllUsersWithDiscord } from '@/lib/discord-user-sync';
import { logger } from '@/lib/logger';

// Force this API route to use Node.js runtime for discord.js compatibility
export const runtime = 'nodejs';

/**
 * Redact user/Discord identifiers from sync error messages so they can be logged
 * safely. The sync layer embeds handles/IDs directly in error strings
 * (e.g. "Error updating user <handle>: ...", "User not found: <id>").
 */
function redactSyncError(error: string): string {
  return error
    .replace(/(Error updating user )(.+?)(: )/, '$1[redacted]$3')
    .replace(/(Failed to update user )(.+)$/, '$1[redacted]')
    .replace(/(No Discord match found for user )(.+)$/, '$1[redacted]')
    .replace(/(User not found: )(.+)$/, '$1[redacted]');
}

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
      logger.error('CRON_SECRET not configured - rejecting request', undefined, {
        route: '/api/cron/discord-sync',
      });
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request', { route: '/api/cron/discord-sync' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run the sync
    const syncResult = await syncAllUsersWithDiscord();

    const errorCount = syncResult.errors.length;
    const hasErrors = errorCount > 0;

    logger.info('Automated Discord sync completed', {
      route: '/api/cron/discord-sync',
      totalUsers: syncResult.totalUsers,
      matchedUsers: syncResult.matchedUsers,
      updatedUsers: syncResult.updatedUsers,
      errorCount,
    });

    // Log a sanitized summary by default. Full per-user detail (still redacted of
    // identifiers) is gated behind an explicit debug flag.
    if (hasErrors) {
      logger.warn('Discord sync completed with errors', {
        route: '/api/cron/discord-sync',
        errorCount,
        ...(process.env.DISCORD_SYNC_DEBUG === 'true'
          ? { errors: syncResult.errors.map(redactSyncError) }
          : {}),
      });
    }

    // Reflect partial failure in the contract so external schedulers/monitors can
    // alert: 200 = clean, 207 = partial success, 500 = no users updated despite errors.
    const partialSuccess = hasErrors && syncResult.updatedUsers > 0;
    const status = !hasErrors ? 200 : partialSuccess ? 207 : 500;

    return NextResponse.json(
      {
        success: !hasErrors,
        partialSuccess,
        message: hasErrors
          ? 'Discord user sync completed with errors'
          : 'Discord user sync completed',
        result: {
          totalUsers: syncResult.totalUsers,
          matchedUsers: syncResult.matchedUsers,
          updatedUsers: syncResult.updatedUsers,
          errorCount,
          // Don't include full error details or user data in automated response
          hasErrors,
        },
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  } catch (error) {
    logger.error(
      'Automated Discord sync failed',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/cron/discord-sync' }
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Discord sync failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
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
