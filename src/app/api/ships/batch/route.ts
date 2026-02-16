import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as shipStorage from '@/lib/ship-storage';
import { logger } from '@/lib/logger';

/**
 * Zod schema for POST /api/ships/batch request body.
 *
 * Accepts an array of 1-50 UUID v4 strings. Used for resolving multiple
 * ships in a single request (e.g. fleet displays, mission rosters).
 */
const BatchQuerySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

/**
 * POST /api/ships/batch
 *
 * Resolve multiple ships from an array of FleetYards UUIDs in a single
 * request. Uses POST with a JSON body because passing up to 50 UUIDs in
 * query string parameters would be unwieldy and may exceed URL length limits.
 *
 * No authentication required -- ship data is public reference data.
 *
 * Request body: { ids: string[] }   (1-50 UUID v4 strings)
 * Response:     { items: Ship[] }
 */
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  try {
    const parseResult = BatchQuerySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: parseResult.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`
          ),
        },
        { status: 400 }
      );
    }

    const ships = await shipStorage.getShipsByFleetyardsIds(parseResult.data.ids);

    const response = NextResponse.json({ items: ships });
    response.headers.set(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=60'
    );
    return response;
  } catch (error) {
    logger.error('Error resolving batch ships', error instanceof Error ? error : new Error(String(error)), { route: '/api/ships/batch' });
    return NextResponse.json(
      { error: 'Failed to resolve ships' },
      { status: 500 }
    );
  }
}
