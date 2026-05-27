import { describe, expect, it, vi } from 'vitest';
import {
  createMirrorTestConfig,
  isFleetYardsUrl,
  mirrorImageUrl,
  mirrorShipAssets,
  needsImageMirrorBackfill,
  SHIP_IMAGE_FIELDS,
  type ImageUploadClient,
} from './r2-image-mirror';
import type { ShipDocument } from '@/types/ship';

function imageResponse(body: string, contentType = 'image/png'): Response {
  return new Response(Buffer.from(body), {
    status: 200,
    headers: {
      'content-type': contentType,
      'content-length': String(Buffer.byteLength(body)),
    },
  });
}

function imageResponseWithoutContentLength(body: string, contentType = 'image/png'): Response {
  return new Response(Buffer.from(body), {
    status: 200,
    headers: {
      'content-type': contentType,
    },
  });
}

function cancellableImageResponse(headers: HeadersInit): { response: Response; wasCanceled: () => boolean } {
  let canceled = false;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
    },
    cancel() {
      canceled = true;
    },
  });

  return {
    response: new Response(body, { status: 200, headers }),
    wasCanceled: () => canceled,
  };
}

function testShip(
  overrides: Partial<Omit<ShipDocument, '_id' | 'createdAt'>> = {}
): Omit<ShipDocument, '_id' | 'createdAt'> {
  return {
    fleetyardsId: 'ship-1',
    slug: 'ship-1',
    name: 'Test Ship',
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
    crew: { min: 1, max: 1 },
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
      store: null,
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
    syncedAt: new Date('2026-01-01T00:00:00Z'),
    syncVersion: 1,
    fleetyardsUpdatedAt: '2026-01-01T00:00:00Z',
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('r2-image-mirror', () => {
  it('mirrors an image into a deterministic Cloudflare R2 public URL', async () => {
    const uploadClient: ImageUploadClient = {
      uploadObject: vi.fn(async () => undefined),
    };
    const fetchImpl = vi.fn(async () => imageResponse('image-bytes'));

    const result = await mirrorImageUrl({
      sourceUrl: 'https://api.fleetyards.net/files/blobs/redirect/100i.png',
      keyPrefix: 'ships/ship-1',
      fieldName: 'store',
      uploadClient,
      fetchImpl,
      config: createMirrorTestConfig({ prefix: 'ships' }),
    });

    expect(result.mirrored).toBe(true);
    expect(result.displayUrl).toMatch(
      /^https:\/\/images\.aydocorp\.space\/ships\/ship-1\/store-[a-f0-9]{16}\.png$/
    );
    expect(result.entry.sourceUrl).toBe('https://api.fleetyards.net/files/blobs/redirect/100i.png');
    expect(result.entry.mirroredUrl).toBe(result.displayUrl);
    expect(result.entry.error).toBeNull();
    expect(uploadClient.uploadObject).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(/^ships\/ship-1\/store-[a-f0-9]{16}\.png$/),
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000, immutable',
      })
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.fleetyards.net/files/blobs/redirect/100i.png',
      expect.objectContaining({ redirect: 'follow' })
    );
  });

  it('preserves a previous mirrored URL when refresh download fails', async () => {
    const previous = {
      sourceUrl: 'https://api.fleetyards.net/files/old.png',
      mirroredUrl: 'https://images.aydocorp.space/ships/ship-1/store-old.png',
      contentHash: 'oldhash',
      contentType: 'image/png',
      byteLength: 10,
      mirroredAt: new Date('2026-01-01T00:00:00Z'),
      error: null,
    };

    const result = await mirrorImageUrl({
      sourceUrl: 'https://api.fleetyards.net/files/new.png',
      keyPrefix: 'ships/ship-1',
      fieldName: 'store',
      previous,
      previousDisplayUrl: previous.mirroredUrl,
      uploadClient: { uploadObject: vi.fn(async () => undefined) },
      fetchImpl: vi.fn(async () => new Response('not found', { status: 404 })),
      config: createMirrorTestConfig(),
    });

    expect(result.mirrored).toBe(false);
    expect(result.displayUrl).toBe(previous.mirroredUrl);
    expect(result.entry.mirroredUrl).toBe(previous.mirroredUrl);
    expect(result.entry.error).toContain('HTTP 404');
  });

  it('rejects oversized image streams even when content-length is missing', async () => {
    const uploadClient: ImageUploadClient = {
      uploadObject: vi.fn(async () => undefined),
    };

    const result = await mirrorImageUrl({
      sourceUrl: 'https://api.fleetyards.net/files/blobs/redirect/oversized.png',
      keyPrefix: 'ships/ship-1',
      fieldName: 'store',
      uploadClient,
      fetchImpl: vi.fn(async () => imageResponseWithoutContentLength('too-large')),
      config: createMirrorTestConfig({ maxImageBytes: 4 }),
    });

    expect(result.mirrored).toBe(false);
    expect(result.entry.error).toContain('image exceeds 4 byte limit');
    expect(uploadClient.uploadObject).not.toHaveBeenCalled();
  });

  it('cancels response bodies before rejecting oversized content-length downloads', async () => {
    const uploadClient: ImageUploadClient = {
      uploadObject: vi.fn(async () => undefined),
    };
    const { response, wasCanceled } = cancellableImageResponse({
      'content-type': 'image/png',
      'content-length': '100',
    });

    const result = await mirrorImageUrl({
      sourceUrl: 'https://api.fleetyards.net/files/blobs/redirect/oversized.png',
      keyPrefix: 'ships/ship-1',
      fieldName: 'store',
      uploadClient,
      fetchImpl: vi.fn(async () => response),
      config: createMirrorTestConfig({ maxImageBytes: 4 }),
    });

    expect(result.mirrored).toBe(false);
    expect(result.entry.error).toContain('image exceeds 4 byte limit');
    expect(wasCanceled()).toBe(true);
    expect(uploadClient.uploadObject).not.toHaveBeenCalled();
  });

  it('mirrors ship image fields in parallel', async () => {
    let activeFetches = 0;
    let maxActiveFetches = 0;
    const uploadClient: ImageUploadClient = {
      uploadObject: vi.fn(async () => undefined),
    };
    const fetchImpl = vi.fn(async () => {
      activeFetches++;
      maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeFetches--;
      return imageResponse('image-bytes');
    });

    const images = Object.fromEntries(
      SHIP_IMAGE_FIELDS.map((field) => [
        field,
        `https://api.fleetyards.net/files/blobs/redirect/${field}.png`,
      ])
    ) as ShipDocument['images'];

    const result = await mirrorShipAssets(
      testShip({ images }),
      undefined,
      {
        uploadClient,
        fetchImpl,
        config: createMirrorTestConfig(),
      }
    );

    expect(result.mirroredImages).toBe(SHIP_IMAGE_FIELDS.length);
    expect(fetchImpl).toHaveBeenCalledTimes(SHIP_IMAGE_FIELDS.length);
    expect(maxActiveFetches).toBeGreaterThan(1);
  });

  it('detects FleetYards URLs and missing mirror metadata as backfill work', () => {
    const baseShip = {
      images: {
        store: 'https://fleetyards.net/files/representations/redirect/model.jpg',
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
      manufacturer: {
        name: 'Origin Jumpworks',
        code: 'ORIG',
        slug: 'origin-jumpworks',
        logo: null,
      },
    } satisfies Pick<ShipDocument, 'images' | 'manufacturer'>;

    expect(isFleetYardsUrl(baseShip.images.store)).toBe(true);
    expect(isFleetYardsUrl('https://cdn.fleetyards.net/uploads/model.jpg')).toBe(true);
    expect(needsImageMirrorBackfill(baseShip)).toBe(true);

    expect(
      needsImageMirrorBackfill({
        ...baseShip,
        images: {
          ...baseShip.images,
          store: 'https://images.aydocorp.space/ships/ship-1/store.png',
        },
        imageMirrors: {
          images: {
            store: {
              sourceUrl: 'https://fleetyards.net/files/representations/redirect/model.jpg',
              mirroredUrl: 'https://images.aydocorp.space/ships/ship-1/store.png',
              contentHash: 'hash',
              contentType: 'image/png',
              byteLength: 10,
              mirroredAt: new Date(),
              error: null,
            },
          },
        },
      })
    ).toBe(false);
  });

  it('treats retained mirror errors and partial legacy docs as backfill work', () => {
    const mirroredStore = {
      sourceUrl: 'https://cdn.fleetyards.net/uploads/model.jpg',
      mirroredUrl: 'https://images.aydocorp.space/ships/ship-1/store.png',
      contentHash: 'hash',
      contentType: 'image/png',
      byteLength: 10,
      mirroredAt: new Date(),
      error: null,
    };

    expect(needsImageMirrorBackfill({ imageMirrors: { images: {} } })).toBe(true);

    expect(
      needsImageMirrorBackfill({
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
        manufacturer: {
          name: 'Origin Jumpworks',
          code: 'ORIG',
          slug: 'origin-jumpworks',
          logo: null,
        },
        imageMirrors: {
          images: {
            store: {
              ...mirroredStore,
              error: 'download failed with HTTP 503',
            },
          },
        },
      })
    ).toBe(true);
  });
});
