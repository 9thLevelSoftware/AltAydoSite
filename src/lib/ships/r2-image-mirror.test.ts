import { describe, expect, it, vi } from 'vitest';
import {
  createMirrorTestConfig,
  isFleetYardsUrl,
  mirrorImageUrl,
  needsImageMirrorBackfill,
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

  it('detects FleetYards URLs and missing mirror metadata as backfill work', () => {
    const baseShip = {
      images: {
        store: 'https://cdn.fleetyards.net/uploads/model.jpg',
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
              sourceUrl: 'https://cdn.fleetyards.net/uploads/model.jpg',
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
});
