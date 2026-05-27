import { NextRequest, NextResponse } from 'next/server';
import { checkCloudflareR2Health } from '@/lib/ships/r2-health';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

function authorizeCron(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error('CRON_SECRET not configured - rejecting request', undefined, {
      route: '/api/cron/cloudflare-r2-health',
    });
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron request', { route: '/api/cron/cloudflare-r2-health' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const unauthorized = authorizeCron(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await checkCloudflareR2Health();
    return NextResponse.json(
      {
        success: result.success,
        result,
        timestamp: new Date().toISOString(),
      },
      { status: result.success ? 200 : 502 }
    );
  } catch (error) {
    logger.error('Cloudflare R2 health check failed unexpectedly', error instanceof Error ? error : new Error(String(error)), {
      route: '/api/cron/cloudflare-r2-health',
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Cloudflare R2 health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
