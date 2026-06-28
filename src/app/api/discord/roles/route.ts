import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '../../auth/auth';
import { getDiscordRoleMonitor } from '@/lib/discord-role-monitor';
import { getDiscordService } from '@/lib/discord';
import { logger } from '@/lib/logger';

// Force this API route to use Node.js runtime for discord.js compatibility
export const runtime = 'nodejs';

/**
 * Ensure the session is authenticated and meets the required clearance level.
 * Admins always pass. Returns an error response when the check fails, or `null`
 * when the request is authorized so callers can continue.
 */
function requireClearance(session: Session | null, minClearance: number): NextResponse | null {
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (session.user.role !== 'admin' && (session.user.clearanceLevel ?? 0) < minClearance) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization for role monitoring
    const session = await getServerSession(authOptions);
    const authError = requireClearance(session, 3);
    if (authError) {
      return authError;
    }

    const monitor = getDiscordRoleMonitor();
    const status = monitor.getStatus();

    return NextResponse.json({
      status: status.isRunning ? 'running' : 'stopped',
      nextCheck: status.nextCheck?.toISOString(),
      message: status.isRunning
        ? 'Discord role monitoring is active'
        : 'Discord role monitoring is stopped',
    });
  } catch (error) {
    logger.error(
      'Error getting Discord role monitor status',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/discord/roles' }
    );

    return NextResponse.json({ error: 'Failed to get monitor status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization for role monitoring
    const session = await getServerSession(authOptions);
    const authError = requireClearance(session, 3);
    if (authError) {
      return authError;
    }

    // Guard against malformed JSON bodies (request.json() throws on invalid input)
    const body = await request.json().catch(() => null);
    if (typeof body?.action !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected an "action" string.' },
        { status: 400 }
      );
    }

    const { action } = body;
    const monitor = getDiscordRoleMonitor();

    switch (action) {
      case 'start': {
        // Surface configuration failures instead of falsely reporting "running"
        if (!getDiscordService().isConfigured()) {
          logger.error('Cannot start Discord role monitor: service not configured', undefined, {
            route: '/api/discord/roles',
          });
          return NextResponse.json(
            { error: 'Discord service is not configured. Check bot token and guild ID.' },
            { status: 503 }
          );
        }

        monitor.start();
        return NextResponse.json({
          message: 'Discord role monitoring started',
          status: 'running',
        });
      }

      case 'stop':
        monitor.stop();
        return NextResponse.json({
          message: 'Discord role monitoring stopped',
          status: 'stopped',
        });

      case 'check': {
        // Manual role check for all users
        logger.info('Manual role check triggered', {
          route: '/api/discord/roles',
          triggeredBy: session!.user.aydoHandle,
        });
        const results = await monitor.checkAllUserRoles();

        return NextResponse.json({
          message: 'Manual role check completed',
          results: results.map((r) => ({
            userId: r.userId,
            discordName: r.discordName,
            division: r.division,
            payGrade: r.payGrade,
            position: r.position,
            clearanceLevel: r.clearanceLevel,
            updated: r.updated,
            error: r.error,
          })),
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, or check' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error(
      'Error in Discord role monitor POST',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/discord/roles' }
    );

    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
