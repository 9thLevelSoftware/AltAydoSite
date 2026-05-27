import sharp from 'sharp';
import { getShipBySlug } from '@/lib/ship-storage';
import { resolveShipImage } from '@/lib/ships/image';
import { logger } from '@/lib/logger';
import type { ActivityType } from '@/types/MissionPlanning';
import type { PlannedMissionResponse } from '@/types/PlannedMission';

const DISCORD_BANNER_WIDTH = 800;
const DISCORD_BANNER_HEIGHT = 300;
const DISCORD_BANNER_QUALITY = 85;
const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;

export const DISCORD_EVENT_ACTIVITY_SHIPS: Record<
  ActivityType,
  { shipName: string; slug: string }
> = {
  Mining: { shipName: 'Prospector', slug: 'misc-prospector' },
  Salvage: { shipName: 'Vulture', slug: 'drak-vulture' },
  Escort: { shipName: 'Vanguard Warden', slug: 'aegs-vanguard-warden' },
  Transport: { shipName: 'Hull C', slug: 'misc-hull-c' },
  Medical: { shipName: 'Apollo Medivac', slug: 'rsi-apollo-medivac' },
  Combat: { shipName: 'F7C Hornet Mk II', slug: 'anvl-f7c-hornet-mk-ii' },
};

const bannerCache = new Map<string, Promise<string | undefined>>();

async function safelyConsumeOrCancel(response: Response): Promise<void> {
  try {
    if (response.body) {
      await response.body.cancel();
    } else {
      await response.text();
    }
  } catch {
    // Best-effort cleanup only; callers log the original fetch failure.
  }
}

async function readImageBuffer(response: Response): Promise<Buffer> {
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_SOURCE_IMAGE_BYTES) {
      throw new Error(`image exceeds ${MAX_SOURCE_IMAGE_BYTES} byte limit`);
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_SOURCE_IMAGE_BYTES) {
        await reader.cancel();
        throw new Error(`image exceeds ${MAX_SOURCE_IMAGE_BYTES} byte limit`);
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

async function fetchImageBuffer(imageUrl: string): Promise<Buffer | undefined> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      await safelyConsumeOrCancel(response);
      logger.warn('Failed to fetch Discord event ship banner image', {
        module: 'discord-event-image',
        status: response.status,
      });
      return undefined;
    }

    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_IMAGE_BYTES) {
      await safelyConsumeOrCancel(response);
      logger.warn('Discord event ship banner image is too large', {
        module: 'discord-event-image',
        contentLength,
        maxBytes: MAX_SOURCE_IMAGE_BYTES,
      });
      return undefined;
    }

    return await readImageBuffer(response);
  } catch (error) {
    logger.warn('Failed to fetch Discord event ship banner image', {
      module: 'discord-event-image',
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

async function cropImageToDiscordBannerDataUri(imageUrl: string): Promise<string | undefined> {
  const imageBuffer = await fetchImageBuffer(imageUrl);
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
    logger.warn('Failed to crop Discord event ship banner image', {
      module: 'discord-event-image',
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function getCachedBannerDataUri(cacheKey: string, imageUrl: string): Promise<string | undefined> {
  const existing = bannerCache.get(cacheKey);
  if (existing) return existing;

  const pending = cropImageToDiscordBannerDataUri(imageUrl).then((dataUri) => {
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
  const activityShip = DISCORD_EVENT_ACTIVITY_SHIPS[mission.primaryActivity];
  if (!activityShip) return undefined;

  const ship = await getShipBySlug(activityShip.slug);
  if (!ship) {
    logger.warn('Discord event banner ship was not found in ship cache', {
      module: 'discord-event-image',
      activity: mission.primaryActivity,
      shipName: activityShip.shipName,
      slug: activityShip.slug,
    });
    return undefined;
  }

  const imageUrl = resolveShipImage(ship.images, 'angled');
  if (!imageUrl) {
    logger.warn('Discord event banner ship has no usable image', {
      module: 'discord-event-image',
      activity: mission.primaryActivity,
      shipName: activityShip.shipName,
      slug: activityShip.slug,
    });
    return undefined;
  }

  return getCachedBannerDataUri(`${activityShip.slug}:${imageUrl}`, imageUrl);
}
