import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncShipsFromFleetYards } from './ship-sync';
import { fetchAllShips } from '@/lib/fleetyards/client';
import {
  acquireShipSyncLock,
  releaseShipSyncLock,
  getLatestSyncStatus,
  getShipSyncStates,
  upsertShips,
  getShipCount,
  saveSyncStatus,
} from '@/lib/ship-storage';
import { mirrorShipAssets, needsImageMirrorBackfill } from '@/lib/ships/r2-image-mirror';
import type { ShipDocument } from '@/types/ship';
import type { FleetYardsShipResponse } from '@/lib/fleetyards/types';

vi.mock('@/lib/fleetyards/client', () => ({
  fetchAllShips: vi.fn(),
}));

vi.mock('@/lib/ship-storage', () => ({
  acquireShipSyncLock: vi.fn(),
  releaseShipSyncLock: vi.fn(),
  getLatestSyncStatus: vi.fn(),
  getShipSyncStates: vi.fn(),
  upsertShips: vi.fn(),
  getShipCount: vi.fn(),
  saveSyncStatus: vi.fn(),
}));

vi.mock('@/lib/ships/r2-image-mirror', () => ({
  mirrorShipAssets: vi.fn(),
  needsImageMirrorBackfill: vi.fn(),
}));

const SHIP_ID = '719f60e4-ae48-4941-80f1-17528fd7dd06';
const BACKFILL_ID = '11111111-1111-4111-8111-111111111111';
const UPDATED_ID = '22222222-2222-4222-8222-222222222222';

function rawShip(overrides: Partial<FleetYardsShipResponse> = {}): FleetYardsShipResponse {
  return {
    id: SHIP_ID,
    name: '100i',
    slug: '100i',
    scIdentifier: null,
    rsiId: null,
    rsiName: null,
    rsiSlug: null,
    manufacturer: {
      name: 'Origin Jumpworks',
      longName: 'Origin Jumpworks',
      code: 'ORIG',
      slug: 'origin-jumpworks',
      logo: null,
    },
    classification: '',
    classificationLabel: '',
    focus: '',
    productionStatus: '',
    size: '',
    crew: { min: 1, max: 1, minLabel: '1', maxLabel: '1' },
    cargo: 0,
    mass: 0,
    length: 0,
    beam: 0,
    height: 0,
    hydrogenFuelTankSize: null,
    quantumFuelTankSize: null,
    scmSpeed: null,
    pledgePrice: null,
    price: null,
    description: null,
    storeImage: null,
    storeUrl: null,
    angledView: null,
    sideView: null,
    topView: null,
    frontView: null,
    fleetchartImage: null,
    media: {
      storeImage: 'https://api.fleetyards.net/files/blobs/redirect/100i.png',
    },
    onSale: false,
    hasImages: true,
    hasPaints: false,
    lastUpdatedAt: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-04-03T23:10:15Z',
    ...overrides,
  };
}

function storedShipState(overrides: Partial<ShipDocument> = {}): ShipDocument {
  return {
    fleetyardsId: SHIP_ID,
    slug: '100i',
    name: '100i',
    scIdentifier: null,
    manufacturer: {
      name: 'Origin Jumpworks',
      code: 'ORIG',
      slug: 'origin-jumpworks',
      logo: null,
    },
    classification: '',
    classificationLabel: '',
    focus: '',
    size: '',
    productionStatus: '',
    crew: { min: 0, max: 0 },
    cargo: 0,
    length: 0,
    beam: 0,
    height: 0,
    mass: 0,
    scmSpeed: null,
    hydrogenFuelTankSize: null,
    quantumFuelTankSize: null,
    pledgePrice: null,
    price: null,
    description: null,
    storeUrl: null,
    images: {
      store: 'https://images.aydocorp.space/ships/ship-1/store.png',
      angledView: null,
      angledViewMedium: null,
      sideView: null,
      sideViewMedium: null,
      topView: null,
      topViewMedium: null,
      frontView: null,
      frontViewMedium: null,
      fleetchartImage: null,
    },
    imageMirrors: {
      images: {
        store: {
          sourceUrl: 'https://api.fleetyards.net/files/blobs/redirect/100i.png',
          mirroredUrl: 'https://images.aydocorp.space/ships/ship-1/store.png',
          contentHash: 'hash',
          contentType: 'image/png',
          byteLength: 10,
          mirroredAt: new Date('2026-01-01T00:00:00Z'),
          error: null,
        },
      },
    },
    syncedAt: new Date('2026-01-01T00:00:00Z'),
    syncVersion: 1,
    fleetyardsUpdatedAt: '2026-04-03T23:10:15Z',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

const fetchAllShipsMock = vi.mocked(fetchAllShips);
const acquireShipSyncLockMock = vi.mocked(acquireShipSyncLock);
const releaseShipSyncLockMock = vi.mocked(releaseShipSyncLock);
const getLatestSyncStatusMock = vi.mocked(getLatestSyncStatus);
const getShipSyncStatesMock = vi.mocked(getShipSyncStates);
const upsertShipsMock = vi.mocked(upsertShips);
const getShipCountMock = vi.mocked(getShipCount);
const saveSyncStatusMock = vi.mocked(saveSyncStatus);
const mirrorShipAssetsMock = vi.mocked(mirrorShipAssets);
const needsImageMirrorBackfillMock = vi.mocked(needsImageMirrorBackfill);

describe('syncShipsFromFleetYards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SHIP_SYNC_MAX_CHANGED_SHIPS_PER_RUN;
    delete process.env.SHIP_SYNC_LOCK_TTL_MS;

    acquireShipSyncLockMock.mockResolvedValue({
      ownerId: 'lock-owner',
      expiresAt: new Date(Date.now() + 60_000),
    });
    releaseShipSyncLockMock.mockResolvedValue(undefined);
    getLatestSyncStatusMock.mockResolvedValue(null);
    getShipSyncStatesMock.mockResolvedValue(new Map());
    getShipCountMock.mockResolvedValue(1);
    upsertShipsMock.mockResolvedValue({ newShips: 1, updatedShips: 0, unchangedShips: 0 });
    saveSyncStatusMock.mockResolvedValue(undefined);
    needsImageMirrorBackfillMock.mockReturnValue(false);
    mirrorShipAssetsMock.mockImplementation(async (ship) => ({
      ship: {
        ...ship,
        images: {
          ...ship.images,
          store: 'https://images.aydocorp.space/ships/ship-1/store.png',
        },
        imageMirrors: {
          images: {
            store: {
              sourceUrl: ship.images.store,
              mirroredUrl: 'https://images.aydocorp.space/ships/ship-1/store.png',
              contentHash: 'hash',
              contentType: 'image/png',
              byteLength: 10,
              mirroredAt: new Date('2026-01-01T00:00:00Z'),
              error: null,
            },
          },
        },
      },
      mirroredImages: 1,
      failedImages: 0,
      errors: [],
    }));
  });

  it('inserts a new ship and mirrors its images before upsert', async () => {
    fetchAllShipsMock.mockResolvedValue({ ships: [rawShip()], pagesProcessed: 1, errors: [] });

    const result = await syncShipsFromFleetYards();

    expect(result.status).toBe('success');
    expect(result.newShips).toBe(1);
    expect(result.mirroredImages).toBe(1);
    expect(mirrorShipAssetsMock).toHaveBeenCalledTimes(1);
    expect(upsertShipsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        fleetyardsId: SHIP_ID,
        images: expect.objectContaining({
          store: 'https://images.aydocorp.space/ships/ship-1/store.png',
        }),
      }),
    ]);
    expect(saveSyncStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        mirroredImages: 1,
        failedImages: 0,
      })
    );
    expect(releaseShipSyncLockMock).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'lock-owner' }));
  });

  it('updates an existing ship when FleetYards updatedAt changes', async () => {
    fetchAllShipsMock.mockResolvedValue({
      ships: [rawShip({ updatedAt: '2026-04-04T00:00:00Z' })],
      pagesProcessed: 1,
      errors: [],
    });
    getShipSyncStatesMock.mockResolvedValue(
      new Map([[SHIP_ID, storedShipState({ fleetyardsUpdatedAt: '2026-04-03T23:10:15Z' })]])
    );
    upsertShipsMock.mockResolvedValue({ newShips: 0, updatedShips: 1, unchangedShips: 0 });

    const result = await syncShipsFromFleetYards();

    expect(result.updatedShips).toBe(1);
    expect(mirrorShipAssetsMock).toHaveBeenCalledTimes(1);
    expect(upsertShipsMock).toHaveBeenCalledTimes(1);
  });

  it('skips unchanged ships that already have complete mirror metadata', async () => {
    fetchAllShipsMock.mockResolvedValue({ ships: [rawShip()], pagesProcessed: 1, errors: [] });
    getShipSyncStatesMock.mockResolvedValue(new Map([[SHIP_ID, storedShipState()]]));

    const result = await syncShipsFromFleetYards();

    expect(result.status).toBe('success');
    expect(result.unchangedShips).toBe(1);
    expect(mirrorShipAssetsMock).not.toHaveBeenCalled();
    expect(upsertShipsMock).not.toHaveBeenCalled();
  });

  it('refreshes unchanged source records when image mirror backfill is needed', async () => {
    fetchAllShipsMock.mockResolvedValue({ ships: [rawShip()], pagesProcessed: 1, errors: [] });
    getShipSyncStatesMock.mockResolvedValue(new Map([[SHIP_ID, storedShipState()]]));
    needsImageMirrorBackfillMock.mockReturnValue(true);
    upsertShipsMock.mockResolvedValue({ newShips: 0, updatedShips: 1, unchangedShips: 0 });

    const result = await syncShipsFromFleetYards();

    expect(result.updatedShips).toBe(1);
    expect(mirrorShipAssetsMock).toHaveBeenCalledTimes(1);
    expect(upsertShipsMock).toHaveBeenCalledTimes(1);
  });

  it('prioritizes source data changes over retry-only image backfills when capped', async () => {
    process.env.SHIP_SYNC_MAX_CHANGED_SHIPS_PER_RUN = '1';
    fetchAllShipsMock.mockResolvedValue({
      ships: [
        rawShip({ id: BACKFILL_ID, name: 'Backfill Ship', slug: 'backfill-ship' }),
        rawShip({
          id: UPDATED_ID,
          name: 'Updated Ship',
          slug: 'updated-ship',
          updatedAt: '2026-04-04T00:00:00Z',
        }),
      ],
      pagesProcessed: 1,
      errors: [],
    });
    getShipSyncStatesMock.mockResolvedValue(
      new Map([
        [BACKFILL_ID, storedShipState({ fleetyardsId: BACKFILL_ID })],
        [UPDATED_ID, storedShipState({ fleetyardsId: UPDATED_ID, fleetyardsUpdatedAt: '2026-04-03T23:10:15Z' })],
      ])
    );
    needsImageMirrorBackfillMock.mockImplementation((existing) => {
      const state = existing as { fleetyardsId?: string } | undefined;
      return state?.fleetyardsId === BACKFILL_ID;
    });
    upsertShipsMock.mockResolvedValue({ newShips: 0, updatedShips: 1, unchangedShips: 0 });

    const result = await syncShipsFromFleetYards();

    expect(result.status).toBe('partial');
    expect(result.deferredShips).toBe(1);
    expect(mirrorShipAssetsMock).toHaveBeenCalledTimes(1);
    expect(mirrorShipAssetsMock.mock.calls[0][0].fleetyardsId).toBe(UPDATED_ID);
    expect(upsertShipsMock).toHaveBeenCalledWith([
      expect.objectContaining({ fleetyardsId: UPDATED_ID }),
    ]);
  });

  it('records validation errors instead of crashing on non-object FleetYards records', async () => {
    fetchAllShipsMock.mockResolvedValue({
      ships: [null as unknown as FleetYardsShipResponse],
      pagesProcessed: 1,
      errors: [],
    });

    const result = await syncShipsFromFleetYards();

    expect(result.status).toBe('failed');
    expect(result.skippedShips).toBe(1);
    expect(result.errors[0]).toContain('Validation failed for "unknown"');
    expect(mirrorShipAssetsMock).not.toHaveBeenCalled();
    expect(upsertShipsMock).not.toHaveBeenCalled();
    expect(releaseShipSyncLockMock).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'lock-owner' }));
  });

  it('returns a lockSkipped status without fetching when another sync holds the lock', async () => {
    acquireShipSyncLockMock.mockResolvedValue(null);
    getLatestSyncStatusMock.mockResolvedValue({
      type: 'ship-sync',
      syncVersion: 4,
      lastSyncAt: new Date('2026-01-01T00:00:00Z'),
      shipCount: 123,
      newShips: 0,
      updatedShips: 0,
      unchangedShips: 123,
      skippedShips: 0,
      durationMs: 100,
      status: 'success',
      errors: [],
      pagesProcessed: 1,
    });

    const result = await syncShipsFromFleetYards();

    expect(result.lockSkipped).toBe(true);
    expect(result.shipCount).toBe(123);
    expect(fetchAllShipsMock).not.toHaveBeenCalled();
    expect(releaseShipSyncLockMock).not.toHaveBeenCalled();
  });
});
