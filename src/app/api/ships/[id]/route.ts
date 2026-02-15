import { NextRequest, NextResponse } from 'next/server';
import * as shipStorage from '@/lib/ship-storage';

/**
 * GET /api/ships/[id]
 *
 * Returns a single ship document by FleetYards UUID or URL slug.
 * The shipStorage.getShipByIdOrSlug function handles UUID-vs-slug
 * detection internally via regex matching.
 *
 * No authentication required -- ship data is public reference data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { error: 'Ship ID or slug is required' },
        { status: 400 }
      );
    }

    const ship = await shipStorage.getShipByIdOrSlug(id);

    if (!ship) {
      return NextResponse.json(
        { error: 'Ship not found' },
        { status: 404 }
      );
    }

    const response = NextResponse.json(ship);
    response.headers.set(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=60'
    );
    return response;
  } catch (error) {
    console.error('[ships] Error fetching ship by ID/slug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ship' },
      { status: 500 }
    );
  }
}
