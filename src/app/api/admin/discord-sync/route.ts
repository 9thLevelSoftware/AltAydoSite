import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/auth';
import { syncAllUsersWithDiscord, syncSingleUserWithDiscord } from '@/lib/discord-user-sync';
import { logger } from '@/lib/logger';

// Force this API route to use Node.js runtime for discord.js compatibility
export const runtime = 'nodejs';

/**
 * GET /api/admin/discord-sync
 * Sync all users with Discord server data
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges (clearance level 4+ or admin role)
    const clearance = session.user.clearanceLevel ?? 0;
    if (clearance < 4 && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    logger.info('Discord sync initiated', {
      route: '/api/admin/discord-sync',
      initiatedBy: session.user.aydoHandle,
    });

    // Check if this is a single user sync
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    let syncResult;
    if (userId) {
      logger.info('Syncing single user', { route: '/api/admin/discord-sync', userId });
      syncResult = await syncSingleUserWithDiscord(userId);
    } else {
      logger.info('Syncing all users with Discord', { route: '/api/admin/discord-sync' });
      syncResult = await syncAllUsersWithDiscord();
    }

    return NextResponse.json({
      success: true,
      message: userId ? 'Single user sync completed' : 'Discord user sync completed',
      result: syncResult,
      timestamp: new Date().toISOString(),
      initiatedBy: session.user.aydoHandle,
    });
  } catch (error) {
    logger.error(
      'Discord sync API error',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/admin/discord-sync', method: 'GET' }
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
 * POST /api/admin/discord-sync
 * Manual trigger for Discord sync with options
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges (clearance level 4+ or admin role)
    const clearance = session.user.clearanceLevel ?? 0;
    if (clearance < 4 && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.warn('Discord sync POST - Invalid JSON in request body', {
        route: '/api/admin/discord-sync',
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { userId, dryRun = false } = body;

    logger.info('Discord sync POST initiated', {
      route: '/api/admin/discord-sync',
      initiatedBy: session.user.aydoHandle,
      userId,
      dryRun,
    });

    if (dryRun) {
      // Dry run preview is not yet implemented; do not report success for a no-op.
      return NextResponse.json(
        {
          success: false,
          error: 'Dry run not implemented',
          timestamp: new Date().toISOString(),
        },
        { status: 501 }
      );
    }

    let syncResult;
    if (userId) {
      syncResult = await syncSingleUserWithDiscord(userId);
    } else {
      syncResult = await syncAllUsersWithDiscord();
    }

    return NextResponse.json({
      success: true,
      message: userId ? 'Single user sync completed' : 'Discord user sync completed',
      result: syncResult,
      timestamp: new Date().toISOString(),
      initiatedBy: session.user.aydoHandle,
    });
  } catch (error) {
    logger.error(
      'Discord sync POST API error',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/admin/discord-sync', method: 'POST' }
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
