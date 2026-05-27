import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { shouldOptimizeShipImage } from '@/lib/ships/image';

export const runtime = 'nodejs';

/** Max concurrent internal image requests */
const CONCURRENCY = 5;

/** Image widths to pre-cache (covers card + thumbnail sizes) */
const WARM_WIDTHS = [384, 96];

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
      logger.error('CRON_SECRET not configured - rejecting request', undefined, { route: '/api/cron/warm-images' });
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
    const imageUrls: string[] = [];
    let skippedUnoptimized = 0;
    for (const ship of ships) {
      const url = ship.images?.angledView || ship.images?.store;
      if (url && typeof url === 'string' && url.trim().length > 0) {
        const trimmedUrl = url.trim();
        if (shouldOptimizeShipImage(trimmedUrl)) {
          imageUrls.push(trimmedUrl);
        } else {
          skippedUnoptimized++;
        }
      }
    }

    logger.info('Found ship images to warm', {
      route: '/api/cron/warm-images',
      count: imageUrls.length,
      skippedUnoptimized,
    });

    // Build the origin from the incoming request
    const origin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    let warmed = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < imageUrls.length; i += CONCURRENCY) {
      const batch = imageUrls.slice(i, i + CONCURRENCY);
      const requests = batch.flatMap((url) =>
        WARM_WIDTHS.map(async (w) => {
          const target = `${origin}/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75`;
          try {
            const res = await fetch(target);
            if (res.ok) {
              warmed++;
            } else {
              failed++;
            }
            // Consume body to free resources
            await res.arrayBuffer();
          } catch {
            failed++;
          }
        }),
      );
      await Promise.all(requests);
    }

    logger.info('Image cache warm-up complete', { route: '/api/cron/warm-images', warmed, failed });

    return NextResponse.json({
      success: true,
      totalShips: ships.length,
      uniqueImages: imageUrls.length,
      skippedUnoptimized,
      warmed,
      failed,
      widths: WARM_WIDTHS,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Image cache warm-up failed', error instanceof Error ? error : new Error(String(error)), { route: '/api/cron/warm-images' });
    return NextResponse.json(
      {
        success: false,
        error: 'Image cache warm-up failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
