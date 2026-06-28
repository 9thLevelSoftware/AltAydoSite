import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { shouldOptimizeShipImage } from '@/lib/ships/image';

export const runtime = 'nodejs';

/** Max concurrent internal image requests */
const CONCURRENCY = 5;

/** Image widths to pre-cache (covers card + thumbnail sizes) */
const WARM_WIDTHS = [384, 96];

/** Per-request timeout for each internal image fetch (ms) */
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Max number of unique images warmed per invocation. Caps total work so a
 * single run cannot exceed serverless route limits; the remainder is reported
 * and can be picked up by a subsequent invocation.
 */
const MAX_IMAGES_PER_RUN = 100;

/**
 * Resolve the canonical origin for internal /_next/image fetches.
 *
 * Prefer an explicitly configured origin so we never trust the incoming
 * request host (which can be spoofed via the Host header). Falls back to the
 * request origin only when no canonical origin is configured.
 */
function resolveOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (configured && configured.trim().length > 0) {
    try {
      return new URL(configured.trim()).origin;
    } catch {
      logger.warn('Invalid configured app URL - falling back to request origin', {
        route: '/api/cron/warm-images',
        configured,
      });
    }
  }
  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

/**
 * GET /api/cron/warm-images
 *
 * Pre-populates the Next.js image optimization cache by making internal
 * requests to /_next/image for each ship's primary image. Run this after
 * deployment or ship sync to eliminate cold-cache latency for users.
 *
 * Protected by optional CRON_SECRET Bearer auth.
 */
export async function GET(request: NextRequest) {
  try {
    // Fail-closed cron auth: reject if CRON_SECRET not configured
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      logger.error('CRON_SECRET not configured - rejecting request', undefined, {
        route: '/api/cron/warm-images',
      });
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting image cache warm-up', { route: '/api/cron/warm-images' });

    // Get all ship image URLs (lightweight projection)
    const { db } = await connectToDatabase();
    const ships = await db
      .collection('ships')
      .find({}, { projection: { 'images.angledView': 1, 'images.store': 1, _id: 0 } })
      .toArray();

    // Collect unique image URLs (primary image per ship)
    const imageUrlsSet = new Set<string>();
    let skippedUnoptimized = 0;
    for (const ship of ships) {
      const url = ship.images?.angledView || ship.images?.store;
      if (url && typeof url === 'string' && url.trim().length > 0) {
        const trimmedUrl = url.trim();
        if (shouldOptimizeShipImage(trimmedUrl)) {
          imageUrlsSet.add(trimmedUrl);
        } else {
          skippedUnoptimized++;
        }
      }
    }
    const allImageUrls = Array.from(imageUrlsSet);

    // Cap work per invocation so a single run cannot exceed route limits.
    const imageUrls = allImageUrls.slice(0, MAX_IMAGES_PER_RUN);
    const remaining = allImageUrls.length - imageUrls.length;

    logger.info('Found ship images to warm', {
      route: '/api/cron/warm-images',
      count: imageUrls.length,
      totalUnique: allImageUrls.length,
      remaining,
      skippedUnoptimized,
    });

    // Use a configured canonical origin rather than trusting the request host.
    const origin = resolveOrigin(request);
    let warmed = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < imageUrls.length; i += CONCURRENCY) {
      const batch = imageUrls.slice(i, i + CONCURRENCY);
      const requests = batch.flatMap((url) =>
        WARM_WIDTHS.map(async (w) => {
          const target = `${origin}/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75`;
          try {
            // Abort slow optimizer requests so a single image can't hang the run.
            const res = await fetch(target, {
              signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            });
            if (res.ok) {
              warmed++;
            } else {
              failed++;
            }
            // Consume body to free resources
            await res.arrayBuffer();
          } catch {
            // Timeouts (AbortError) and network errors both count as failures.
            failed++;
          }
        })
      );
      await Promise.all(requests);
    }

    logger.info('Image cache warm-up complete', {
      route: '/api/cron/warm-images',
      warmed,
      failed,
      remaining,
    });

    return NextResponse.json({
      success: true,
      totalShips: ships.length,
      uniqueImages: allImageUrls.length,
      processedImages: imageUrls.length,
      remaining,
      skippedUnoptimized,
      warmed,
      failed,
      widths: WARM_WIDTHS,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      'Image cache warm-up failed',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/cron/warm-images' }
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Image cache warm-up failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
