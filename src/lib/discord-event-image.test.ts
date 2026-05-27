import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIVITIES } from '@/types/MissionPlanning';
import {
  DISCORD_EVENT_ACTIVITY_SHIPS,
  getDiscordEventImageForMission,
} from './discord-event-image';

const mocks = vi.hoisted(() => ({
  getShipBySlug: vi.fn(),
}));

vi.mock('@/lib/ship-storage', () => ({
  getShipBySlug: mocks.getShipBySlug,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

function makeMission(primaryActivity: (typeof ACTIVITIES)[number]) {
  return { primaryActivity };
}

function cancellableResponse(headers: HeadersInit): {
  response: Response;
  wasCanceled: () => boolean;
} {
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

describe('discord event activity ship banners', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mocks.getShipBySlug.mockResolvedValue({
      name: 'Prospector',
      images: {
        store: null,
        angledView: 'https://images.example.test/prospector.png',
        angledViewMedium: null,
        sideView: null,
        sideViewMedium: null,
        topView: null,
        topViewMedium: null,
        frontView: null,
        frontViewMedium: null,
        fleetchartImage: null,
      },
    });
  });

  it('has a configured ship for every planned mission activity', () => {
    expect(Object.keys(DISCORD_EVENT_ACTIVITY_SHIPS).sort()).toEqual([...ACTIVITIES].sort());
    expect(DISCORD_EVENT_ACTIVITY_SHIPS).toMatchObject({
      Mining: { shipName: 'Prospector', slug: 'misc-prospector' },
      Salvage: { shipName: 'Vulture', slug: 'drak-vulture' },
      Escort: { shipName: 'Vanguard Warden', slug: 'aegs-vanguard-warden' },
      Transport: { shipName: 'Hull C', slug: 'misc-hull-c' },
      Medical: { shipName: 'Apollo Medivac', slug: 'rsi-apollo-medivac' },
      Combat: { shipName: 'F7C Hornet Mk II', slug: 'anvl-f7c-hornet-mk-ii' },
    });
  });

  it('crops the matching primary-activity ship image to an 800x300 JPEG data URI', async () => {
    const sourcePng = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: { r: 24, g: 96, b: 160 },
      },
    })
      .png()
      .toBuffer();

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(new Uint8Array(sourcePng), {
            status: 200,
            headers: {
              'content-type': 'image/png',
              'content-length': String(sourcePng.byteLength),
            },
          })
      )
    );

    const dataUri = await getDiscordEventImageForMission(makeMission('Mining'));

    expect(mocks.getShipBySlug).toHaveBeenCalledWith('misc-prospector');
    expect(dataUri).toMatch(/^data:image\/jpeg;base64,/);

    const croppedBuffer = Buffer.from(dataUri!.split(',')[1], 'base64');
    const metadata = await sharp(croppedBuffer).metadata();
    expect(metadata.format).toBe('jpeg');
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(300);
  });

  it('returns undefined when the configured ship is missing from the cache', async () => {
    mocks.getShipBySlug.mockResolvedValueOnce(null);

    await expect(getDiscordEventImageForMission(makeMission('Mining'))).resolves.toBeUndefined();
  });

  it('cancels oversized banner image responses before returning undefined', async () => {
    mocks.getShipBySlug.mockResolvedValueOnce({
      name: 'Prospector',
      images: {
        store: null,
        angledView: 'https://images.example.test/oversized-prospector.png',
        angledViewMedium: null,
        sideView: null,
        sideViewMedium: null,
        topView: null,
        topViewMedium: null,
        frontView: null,
        frontViewMedium: null,
        fleetchartImage: null,
      },
    });
    const { response, wasCanceled } = cancellableResponse({
      'content-type': 'image/png',
      'content-length': String(11 * 1024 * 1024),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response)
    );

    await expect(getDiscordEventImageForMission(makeMission('Mining'))).resolves.toBeUndefined();

    expect(wasCanceled()).toBe(true);
  });

  it('rejects oversized non-streaming banner image responses', async () => {
    mocks.getShipBySlug.mockResolvedValueOnce({
      name: 'Prospector',
      images: {
        store: null,
        angledView: 'https://images.example.test/oversized-array-buffer.png',
        angledViewMedium: null,
        sideView: null,
        sideViewMedium: null,
        topView: null,
        topViewMedium: null,
        frontView: null,
        frontViewMedium: null,
        fleetchartImage: null,
      },
    });
    const oversized = new Uint8Array(11 * 1024 * 1024);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          ({
            ok: true,
            body: null,
            headers: new Headers({ 'content-type': 'image/png' }),
            arrayBuffer: async () => oversized.buffer,
          }) as unknown as Response
      )
    );

    await expect(getDiscordEventImageForMission(makeMission('Mining'))).resolves.toBeUndefined();
  });
});
