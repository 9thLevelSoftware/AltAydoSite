import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIVITIES } from '@/types/MissionPlanning';
import {
  DISCORD_EVENT_ACTIVITY_BANNERS,
  getDiscordEventImageForMission,
} from './discord-event-image';

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

function getPublicAssetPath(publicPath: string): string {
  return path.join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));
}

describe('discord event activity banners', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('has a configured action banner for every planned mission activity', () => {
    expect(Object.keys(DISCORD_EVENT_ACTIVITY_BANNERS).sort()).toEqual([...ACTIVITIES].sort());
    expect(DISCORD_EVENT_ACTIVITY_BANNERS).toMatchObject({
      Mining: { publicPath: '/discord/activity-banners/mining.jpg' },
      Salvage: { publicPath: '/discord/activity-banners/salvage.jpg' },
      Escort: { publicPath: '/discord/activity-banners/escort.jpg' },
      Transport: { publicPath: '/discord/activity-banners/transport.jpg' },
      Medical: { publicPath: '/discord/activity-banners/medical.jpg' },
      Combat: { publicPath: '/discord/activity-banners/combat.jpg' },
    });
  });

  it('ships local 800x300 JPEG source assets for every activity banner', async () => {
    for (const banner of Object.values(DISCORD_EVENT_ACTIVITY_BANNERS)) {
      const filePath = getPublicAssetPath(banner.publicPath);
      expect(fs.existsSync(filePath), `${banner.publicPath} exists`).toBe(true);

      const metadata = await sharp(filePath).metadata();
      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(300);
    }
  });

  it('uses the matching primary-activity action banner as an 800x300 JPEG data URI', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const dataUri = await getDiscordEventImageForMission(makeMission('Mining'));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(dataUri).toMatch(/^data:image\/jpeg;base64,/);

    const croppedBuffer = Buffer.from(dataUri!.split(',')[1], 'base64');
    const metadata = await sharp(croppedBuffer).metadata();
    expect(metadata.format).toBe('jpeg');
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(300);
  });
});
