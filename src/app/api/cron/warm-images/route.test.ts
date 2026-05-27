import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

function makeRequest() {
  return new NextRequest('http://localhost/api/cron/warm-images', {
    headers: {
      authorization: 'Bearer test-secret',
    },
  });
}

describe('warm-images cron route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  it('deduplicates optimizable image URLs and skips FleetYards source URLs', async () => {
    const ships = [
      {
        images: {
          angledView: 'https://images.aydocorp.space/ships/ship-1/store.png',
          store: null,
        },
      },
      {
        images: {
          angledView: ' https://images.aydocorp.space/ships/ship-1/store.png ',
          store: null,
        },
      },
      {
        images: {
          angledView: 'https://storage.fltyrd.net/w4e3ywfoq66bpp0h34nzg7a8i2ae?origin=',
          store: null,
        },
      },
    ];

    mocks.connectToDatabase.mockResolvedValue({
      db: {
        collection: vi.fn(() => ({
          find: vi.fn(() => ({
            toArray: vi.fn(async () => ships),
          })),
        })),
      },
    });
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(makeRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      totalShips: 3,
      uniqueImages: 1,
      skippedUnoptimized: 1,
      warmed: 2,
      failed: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
