import { describe, expect, it } from 'vitest';
import { FleetYardsShipSchema } from '@/types/ship';
import { extractImageUrl, transformFleetYardsShip } from './transform';

const UUID = '719f60e4-ae48-4941-80f1-17528fd7dd06';

describe('extractImageUrl', () => {
  it('supports current FleetYards ActiveStorage URL fields', () => {
    const image = {
      url: 'https://api.fleetyards.net/files/blobs/redirect/source.png',
      smallUrl: 'https://api.fleetyards.net/files/representations/redirect/small.png',
      mediumUrl: 'https://api.fleetyards.net/files/representations/redirect/medium.png',
      largeUrl: 'https://api.fleetyards.net/files/representations/redirect/large.png',
    };

    expect(extractImageUrl(image, 'source')).toBe(image.url);
    expect(extractImageUrl(image, 'small')).toBe(image.smallUrl);
    expect(extractImageUrl(image, 'medium')).toBe(image.mediumUrl);
  });

  it('keeps legacy string image fields working', () => {
    expect(extractImageUrl('https://cdn.fleetyards.net/uploads/model.jpg')).toBe(
      'https://cdn.fleetyards.net/uploads/model.jpg'
    );
  });
});

describe('transformFleetYardsShip', () => {
  it('maps current wrapped media and manufacturer logo objects to stored URLs', () => {
    const parsed = FleetYardsShipSchema.parse({
      id: UUID,
      name: '100i',
      slug: '100i',
      manufacturer: {
        name: 'Origin Jumpworks',
        code: 'ORIG',
        slug: 'origin-jumpworks',
        logo: {
          url: 'https://api.fleetyards.net/files/blobs/redirect/origin.png',
          smallUrl: 'https://api.fleetyards.net/files/representations/redirect/origin-small.png',
        },
      },
      media: {
        storeImage: {
          url: 'https://api.fleetyards.net/files/blobs/redirect/100i.jpg',
          mediumUrl: 'https://api.fleetyards.net/files/representations/redirect/100i-medium.jpg',
        },
        angledView: {
          url: 'https://api.fleetyards.net/files/blobs/redirect/100i-angled.png',
          mediumUrl:
            'https://api.fleetyards.net/files/representations/redirect/100i-angled-medium.png',
        },
      },
      updatedAt: '2026-04-03T23:10:15Z',
    });

    const doc = transformFleetYardsShip(parsed, 1);

    expect(doc.manufacturer.logo).toBe(
      'https://api.fleetyards.net/files/representations/redirect/origin-small.png'
    );
    expect(doc.images.store).toBe('https://api.fleetyards.net/files/blobs/redirect/100i.jpg');
    expect(doc.images.angledView).toBe(
      'https://api.fleetyards.net/files/blobs/redirect/100i-angled.png'
    );
    expect(doc.images.angledViewMedium).toBe(
      'https://api.fleetyards.net/files/representations/redirect/100i-angled-medium.png'
    );
  });
});
