import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  syncShipsFromFleetYards: vi.fn(),
  after: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    after: mocks.after,
  };
});

vi.mock('@/lib/ship-sync', () => ({
  syncShipsFromFleetYards: mocks.syncShipsFromFleetYards,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
  },
}));

function makeRequest(url = 'http://localhost/api/cron/ship-sync') {
  return new NextRequest(url, {
    headers: {
      authorization: 'Bearer test-cron-secret',
    },
  });
}

function makeSyncStatus(overrides = {}) {
  return {
    type: 'ship-sync',
    syncVersion: 42,
    lastSyncAt: new Date('2026-05-31T16:00:00.000Z'),
    shipCount: 300,
    newShips: 1,
    updatedShips: 2,
    unchangedShips: 297,
    skippedShips: 0,
    deferredShips: 0,
    mirroredImages: 3,
    failedImages: 0,
    durationMs: 1234,
    status: 'success',
    errors: [],
    pagesProcessed: 2,
    ...overrides,
  };
}

describe('/api/cron/ship-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    mocks.after.mockImplementation((task: () => unknown) => {
      void task();
    });
    mocks.syncShipsFromFleetYards.mockResolvedValue(makeSyncStatus());
  });

  it('runs synchronously by default and returns the sync result', async () => {
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.result.syncVersion).toBe(42);
    expect(body.result.shipCount).toBe(300);
    expect(body.result.updatedShips).toBe(2);
    expect(mocks.syncShipsFromFleetYards).toHaveBeenCalledTimes(1);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it('accepts async mode without waiting for sync completion', async () => {
    let resolveSync: (value: ReturnType<typeof makeSyncStatus>) => void = () => {};
    const syncPromise = new Promise<ReturnType<typeof makeSyncStatus>>((resolve) => {
      resolveSync = resolve;
    });
    mocks.syncShipsFromFleetYards.mockReturnValueOnce(syncPromise);

    const response = await POST(makeRequest('http://localhost/api/cron/ship-sync?mode=async'));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ success: true, accepted: true, mode: 'async' });
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.syncShipsFromFleetYards).toHaveBeenCalledTimes(1);

    resolveSync(makeSyncStatus());
    await syncPromise;
  });

  it('rejects unauthorized cron requests', async () => {
    const response = await GET(new NextRequest('http://localhost/api/cron/ship-sync'));

    expect(response.status).toBe(401);
    expect(mocks.syncShipsFromFleetYards).not.toHaveBeenCalled();
  });
});
