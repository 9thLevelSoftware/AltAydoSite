import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as shipStorage from '@/lib/ship-storage';
import { logger } from '@/lib/logger';

/**
 * Zod schema for GET /api/ships query parameters.
 *
 * All filtering fields are optional. page and pageSize have sensible defaults.
 * z.coerce.number() handles the string-to-number conversion from URL params.
 */
const ShipListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  manufacturer: z.string().optional(),
  size: z.string().optional(),
  classification: z.string().optional(),
  productionStatus: z.string().optional(),
  search: z.string().min(1).optional(),
});

/**
 * GET /api/ships
 *
 * Returns a paginated, filtered list of ships. All data is public reference
 * data from the FleetYards sync -- no authentication required.
 *
 * Query params: page, pageSize, manufacturer, size, classification,
 * productionStatus, search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Convert URLSearchParams to a plain object for Zod parsing
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const parseResult = ShipListQuerySchema.safeParse(rawParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: parseResult.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`
          ),
        },
        { status: 400 }
      );
    }

    const result = await shipStorage.findShips(parseResult.data);

    const response = NextResponse.json(result);
    response.headers.set(
      'Cache-Control',
      'public, max-age=1800, stale-while-revalidate=86400'
    );
    return response;
  } catch (error) {
    logger.error('Error fetching ship list', error instanceof Error ? error : new Error(String(error)), { route: '/api/ships' });
    return NextResponse.json(
      { error: 'Failed to fetch ships' },
      { status: 500 }
    );
  }
}
