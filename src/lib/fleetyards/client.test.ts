import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAllShips } from './client';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchAllShips', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the current FleetYards { items, meta } response shape across pages', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = new URL(String(url));
      const page = requestUrl.searchParams.get('page');

      if (page === '1') {
        return jsonResponse({
          items: [{ id: 'ship-1', name: '100i' }],
          meta: { pagination: { currentPage: 1, totalPages: 2 } },
        });
      }

      return jsonResponse({
        items: [{ id: 'ship-2', name: '125a' }],
        meta: { pagination: { currentPage: 2, totalPages: 2 } },
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchAllShips();

    expect(result.ships.map((ship) => ship.name)).toEqual(['100i', '125a']);
    expect(result.pagesProcessed).toBe(2);
    expect(result.errors).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the legacy bare-array response shape working', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse([{ id: 'ship-1', name: '100i' }]))
    );

    const result = await fetchAllShips();

    expect(result.ships).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });
});
