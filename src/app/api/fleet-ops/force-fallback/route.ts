import { NextResponse } from 'next/server';
import { requireLeadership } from '@/lib/auth-guards';
import { forceUseLocalStorage, resetConnectionStatus } from '@/lib/storage-utils';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // Gate behind leadership role / clearance 3+ -- this changes global storage mode
    const auth = await requireLeadership();
    if (auth instanceof NextResponse) return auth;

    // Get action from request
    const { action } = await request.json();

    if (action === 'force-local') {
      forceUseLocalStorage();
      logger.info('Storage mode forced to local', {
        route: '/api/fleet-ops/force-fallback',
        userId: auth.userId,
        action,
      });
      return NextResponse.json({
        success: true,
        message: 'System is now using local storage for all operations',
        mode: 'local',
      });
    } else if (action === 'reset') {
      resetConnectionStatus();
      logger.info('Storage connection status reset', {
        route: '/api/fleet-ops/force-fallback',
        userId: auth.userId,
        action,
      });
      return NextResponse.json({
        success: true,
        message: 'Connection status reset, will try MongoDB on next operation',
        mode: 'auto',
      });
    } else {
      return NextResponse.json(
        {
          error: 'Invalid action. Use "force-local" or "reset"',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error(
      'Error in force-fallback route',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/force-fallback' }
    );
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
