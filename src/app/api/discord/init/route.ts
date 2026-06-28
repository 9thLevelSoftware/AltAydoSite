import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/auth';
import { initializeDiscordRoleMonitor } from '@/lib/discord-role-monitor-init';
import { logger } from '@/lib/logger';

// Force this API route to use Node.js runtime for discord.js compatibility
export const runtime = 'nodejs';

// Constant-time string comparison to avoid leaking secrets via timing.
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

// This endpoint can be called to initialize the Discord role monitor.
// It's designed to be called once when the application starts.
export async function POST(request: NextRequest) {
  try {
    const initSecret = process.env.INIT_SECRET;
    const cronSecret = process.env.CRON_SECRET;

    // Parse the body defensively so a malformed payload yields a 400, not a 500.
    const body = await request.json().catch(() => null);

    let isAuthenticated = false;

    // 1. Cron secret bearer header (for Logic Apps / automation startup hooks).
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && safeEqual(authHeader, `Bearer ${cronSecret}`)) {
        isAuthenticated = true;
      }
    }

    // 2. Init shared secret in the request body (legacy startup-call contract).
    //    Fail closed: only accept when INIT_SECRET is configured and the supplied
    //    secret is a non-empty string that matches via constant-time comparison.
    if (!isAuthenticated && initSecret) {
      if (!body || typeof body.secret !== 'string') {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      }
      if (body.secret.length > 0 && safeEqual(body.secret, initSecret)) {
        isAuthenticated = true;
      }
    }

    // 3. NextAuth admin/clearance fallback (for the admin UI).
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        if (session.user.role === 'admin' || (session.user.clearanceLevel ?? 0) >= 3) {
          isAuthenticated = true;
        } else {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    initializeDiscordRoleMonitor();

    return NextResponse.json({
      message: 'Discord role monitor initialization attempted',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      'Error initializing Discord role monitor via API',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/discord/init' }
    );

    return NextResponse.json({ error: 'Failed to initialize' }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    message: 'Discord role monitor initialization endpoint',
    timestamp: new Date().toISOString(),
  });
}
