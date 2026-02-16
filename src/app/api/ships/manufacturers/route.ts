import { NextResponse } from 'next/server';
import * as shipStorage from '@/lib/ship-storage';
import { logger } from '@/lib/logger';

/**
 * GET /api/ships/manufacturers
 *
 * Returns all manufacturers with their ship counts, sorted alphabetically.
 * Used for filter dropdowns and manufacturer browsing in the UI.
 *
 * No authentication required -- ship data is public reference data.
 * No query parameters needed -- the full list is always small (~33 manufacturers).
 * No pagination needed -- manufacturer count is bounded by the FleetYards dataset.
 *
 * Response: { items: ManufacturerInfo[] }
 *   where ManufacturerInfo = { name, code, slug, shipCount }
 */
export async function GET() {
  try {
    const manufacturers = await shipStorage.getManufacturers();

    const response = NextResponse.json({ items: manufacturers });
    response.headers.set('Cache-Control', 'public, max-age=3600');
    return response;
  } catch (error) {
    logger.error('Error fetching manufacturers', error instanceof Error ? error : new Error(String(error)), { route: '/api/ships/manufacturers' });
    return NextResponse.json(
      { error: 'Failed to fetch manufacturers' },
      { status: 500 }
    );
  }
}
