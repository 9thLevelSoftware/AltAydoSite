import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { logger } from '@/lib/logger';
import type { ActivityType } from '@/types/MissionPlanning';
import type { PlannedMissionResponse } from '@/types/PlannedMission';

const DISCORD_BANNER_WIDTH = 800;
const DISCORD_BANNER_HEIGHT = 300;
const DISCORD_BANNER_QUALITY = 88;
const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const PUBLIC_DIR = path.join(process.cwd(), 'public');

export const DISCORD_EVENT_ACTIVITY_BANNERS: Record<
  ActivityType,
  { label: string; publicPath: string }
> = {
  Mining: {
    label: 'Mining operation',
    publicPath: '/discord/activity-banners/mining.jpg',
  },
  Salvage: {
    label: 'Salvage operation',
    publicPath: '/discord/activity-banners/salvage.jpg',
  },
  Escort: {
    label: 'Escort operation',
    publicPath: '/discord/activity-banners/escort.jpg',
  },
  Transport: {
    label: 'Transport operation',
    publicPath: '/discord/activity-banners/transport.jpg',
  },
  Medical: {
    label: 'Medical operation',
    publicPath: '/discord/activity-banners/medical.jpg',
  },
  Combat: {
    label: 'Combat operation',
    publicPath: '/discord/activity-banners/combat.jpg',
  },
};

const bannerCache = new Map<string, Promise<string | undefined>>();

function getPublicFilePath(publicPath: string): string {
  const relativePath = publicPath.replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, relativePath);
  const resolvedRelativePath = path.relative(PUBLIC_DIR, filePath);

  if (resolvedRelativePath.startsWith('..') || path.isAbsolute(resolvedRelativePath)) {
    throw new Error(`Invalid public asset path: ${publicPath}`);
  }

  return filePath;
}

async function readActivityBannerBuffer(activity: ActivityType, publicPath: string): Promise<Buffer | undefined> {
  const filePath = getPublicFilePath(publicPath);

  try {
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_SOURCE_IMAGE_BYTES) {
      logger.warn('Discord event activity banner image is too large', {
        module: 'discord-event-image',
        activity,
        publicPath,
        size: stat.size,
        maxBytes: MAX_SOURCE_IMAGE_BYTES,
      });
      return undefined;
    }

    return await fs.readFile(filePath);
  } catch (error) {
    logger.warn('Failed to read Discord event activity banner image', {
      module: 'discord-event-image',
      activity,
      publicPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

async function cropActivityBannerToDiscordDataUri(
  activity: ActivityType,
  publicPath: string
): Promise<string | undefined> {
  const imageBuffer = await readActivityBannerBuffer(activity, publicPath);
  if (!imageBuffer) return undefined;

  try {
    const bannerBuffer = await sharp(imageBuffer, { limitInputPixels: 80_000_000 })
      .resize(DISCORD_BANNER_WIDTH, DISCORD_BANNER_HEIGHT, {
        fit: 'cover',
        position: sharp.strategy.attention,
      })
      .jpeg({ quality: DISCORD_BANNER_QUALITY, mozjpeg: true })
      .toBuffer();

    return `data:image/jpeg;base64,${bannerBuffer.toString('base64')}`;
  } catch (error) {
    logger.warn('Failed to crop Discord event activity banner image', {
      module: 'discord-event-image',
      activity,
      publicPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function getCachedBannerDataUri(
  activity: ActivityType,
  publicPath: string
): Promise<string | undefined> {
  const cacheKey = `${activity}:${publicPath}`;
  const existing = bannerCache.get(cacheKey);
  if (existing) return existing;

  const pending = cropActivityBannerToDiscordDataUri(activity, publicPath).then((dataUri) => {
    if (!dataUri) {
      bannerCache.delete(cacheKey);
    }
    return dataUri;
  });
  bannerCache.set(cacheKey, pending);
  return pending;
}

export async function getDiscordEventImageForMission(
  mission: Pick<PlannedMissionResponse, 'primaryActivity'>
): Promise<string | undefined> {
  const activityBanner = DISCORD_EVENT_ACTIVITY_BANNERS[mission.primaryActivity];
  if (!activityBanner) return undefined;

  return getCachedBannerDataUri(mission.primaryActivity, activityBanner.publicPath);
}
