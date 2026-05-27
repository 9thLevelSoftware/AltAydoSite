import { createHash, randomUUID } from 'crypto';
import { PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import type {
  ShipDocument,
  ShipImageField,
  ShipImageMirrorEntry,
} from '@/types/ship';
import { logger } from '@/lib/logger';

export const SHIP_IMAGE_FIELDS: ShipImageField[] = [
  'store',
  'angledView',
  'angledViewMedium',
  'sideView',
  'sideViewMedium',
  'topView',
  'topViewMedium',
  'frontView',
  'frontViewMedium',
  'fleetchartImage',
];

const DEFAULT_BUCKET_NAME = 'images';
const DEFAULT_PREFIX = 'ships';
const DEFAULT_MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30_000;
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

export interface R2MirrorConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
  prefix: string;
  maxImageBytes: number;
  downloadTimeoutMs: number;
}

interface UploadObjectParams {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl: string;
}

export interface ImageUploadClient {
  uploadObject(params: UploadObjectParams): Promise<void>;
}

export interface MirrorImageResult {
  entry: ShipImageMirrorEntry;
  displayUrl: string;
  mirrored: boolean;
}

export interface MirrorShipAssetsResult {
  ship: Omit<ShipDocument, '_id' | 'createdAt'>;
  mirroredImages: number;
  failedImages: number;
  errors: string[];
}

function cleanBaseUrl(url: string): string {
  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return withProtocol.replace(/\/$/, '');
}

export function loadR2MirrorConfig(): R2MirrorConfig {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim() || DEFAULT_BUCKET_NAME;
  const publicBaseUrl = process.env.CLOUDFLARE_R2_BUCKET_URL?.trim();
  const prefix = (process.env.CLOUDFLARE_R2_SHIP_IMAGE_PREFIX?.trim() || DEFAULT_PREFIX)
    .replace(/^\/+|\/+$/g, '');
  const maxImageBytes = Number(process.env.SHIP_IMAGE_MIRROR_MAX_BYTES || DEFAULT_MAX_IMAGE_BYTES);
  const downloadTimeoutMs = Number(
    process.env.SHIP_IMAGE_MIRROR_DOWNLOAD_TIMEOUT_MS || DEFAULT_DOWNLOAD_TIMEOUT_MS
  );

  const missing = [
    ['CLOUDFLARE_R2_ACCOUNT_ID', accountId],
    ['CLOUDFLARE_R2_ACCESS_KEY_ID', accessKeyId],
    ['CLOUDFLARE_R2_SECRET_ACCESS_KEY', secretAccessKey],
    ['CLOUDFLARE_R2_BUCKET_URL', publicBaseUrl],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Cloudflare R2 ship image mirror config: ${missing.join(', ')}`);
  }

  return {
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucketName,
    publicBaseUrl: cleanBaseUrl(publicBaseUrl!),
    prefix,
    maxImageBytes: Number.isFinite(maxImageBytes) && maxImageBytes > 0
      ? maxImageBytes
      : DEFAULT_MAX_IMAGE_BYTES,
    downloadTimeoutMs: Number.isFinite(downloadTimeoutMs) && downloadTimeoutMs > 0
      ? downloadTimeoutMs
      : DEFAULT_DOWNLOAD_TIMEOUT_MS,
  };
}

export function createR2S3Client(config: R2MirrorConfig): S3Client {
  const clientConfig: S3ClientConfig = {
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  };

  return new S3Client(clientConfig);
}

class R2ImageUploadClient implements ImageUploadClient {
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor(config: R2MirrorConfig) {
    this.client = createR2S3Client(config);
    this.bucketName = config.bucketName;
  }

  async uploadObject(params: UploadObjectParams): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        CacheControl: params.cacheControl,
      })
    );
  }
}

function createR2ImageUploadClient(config: R2MirrorConfig): ImageUploadClient {
  return new R2ImageUploadClient(config);
}

function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

function getExtension(contentType: string, sourceUrl: string): string {
  const normalizedContentType = contentType.toLowerCase().split(';')[0].trim();
  const mapped = CONTENT_TYPE_EXTENSIONS[normalizedContentType];
  if (mapped) return mapped;

  try {
    const pathname = new URL(sourceUrl).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    if (match) return match[1].toLowerCase();
  } catch {
    // Ignore malformed source URLs; validation reports the real failure.
  }

  return 'bin';
}

function isSupportedImageContentType(contentType: string): boolean {
  const normalizedContentType = contentType.toLowerCase().split(';')[0].trim();
  return Object.prototype.hasOwnProperty.call(CONTENT_TYPE_EXTENSIONS, normalizedContentType);
}

function createErrorEntry(sourceUrl: string | null, previous: ShipImageMirrorEntry | undefined, error: string): ShipImageMirrorEntry {
  return {
    sourceUrl,
    mirroredUrl: previous?.mirroredUrl ?? null,
    contentHash: previous?.contentHash ?? null,
    contentType: previous?.contentType ?? null,
    byteLength: previous?.byteLength ?? null,
    mirroredAt: previous?.mirroredAt ?? null,
    error,
  };
}

function createAbortSignal(timeoutMs: number): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }
  return undefined;
}

async function downloadImage(
  sourceUrl: string,
  fetchImpl: typeof fetch,
  config: R2MirrorConfig
): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetchImpl(sourceUrl, {
    headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
    redirect: 'follow',
    signal: createAbortSignal(config.downloadTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`download failed with HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
  if (!isSupportedImageContentType(contentType)) {
    throw new Error(`unsupported image content-type "${contentType || 'unknown'}"`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > config.maxImageBytes) {
    throw new Error(`image exceeds ${config.maxImageBytes} byte limit`);
  }

  const buffer = await readResponseBuffer(response, config.maxImageBytes);

  return { buffer, contentType };
}

async function readResponseBuffer(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) {
    const fallbackBuffer = Buffer.from(await response.arrayBuffer());
    if (fallbackBuffer.length > maxBytes) {
      throw new Error(`image exceeds ${maxBytes} byte limit`);
    }
    return fallbackBuffer;
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
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error(`image exceeds ${maxBytes} byte limit`);
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes);
}

export function isFleetYardsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'api.fleetyards.net' ||
      hostname === 'cdn.fleetyards.net' ||
      hostname === 'fleetyards.net';
  } catch {
    return false;
  }
}

function getReusableMirrorUrl(sourceUrl: string, previous: ShipImageMirrorEntry | undefined): string | null {
  if (
    previous?.sourceUrl === sourceUrl &&
    previous.mirroredUrl &&
    !isFleetYardsUrl(previous.mirroredUrl) &&
    !previous.error
  ) {
    return previous.mirroredUrl;
  }
  return null;
}

export async function mirrorImageUrl(
  params: {
    sourceUrl: string | null;
    keyPrefix: string;
    fieldName: string;
    previous?: ShipImageMirrorEntry;
    previousDisplayUrl?: string | null;
    uploadClient?: ImageUploadClient;
    fetchImpl?: typeof fetch;
    config?: R2MirrorConfig;
  }
): Promise<MirrorImageResult> {
  const {
    sourceUrl,
    keyPrefix,
    fieldName,
    previous,
    previousDisplayUrl,
    uploadClient,
    fetchImpl = fetch,
    config,
  } = params;

  if (!sourceUrl) {
    return {
      entry: createErrorEntry(null, previous, ''),
      displayUrl: '',
      mirrored: false,
    };
  }

  const reusableMirrorUrl = getReusableMirrorUrl(sourceUrl, previous);
  if (reusableMirrorUrl && previous) {
    return {
      entry: previous,
      displayUrl: reusableMirrorUrl,
      mirrored: false,
    };
  }

  const resolvedConfig = config ?? loadR2MirrorConfig();
  const client = uploadClient ?? createR2ImageUploadClient(resolvedConfig);

  try {
    const { buffer, contentType } = await downloadImage(sourceUrl, fetchImpl, resolvedConfig);
    const hash = hashBuffer(buffer);
    const extension = getExtension(contentType, sourceUrl);
    const key = `${keyPrefix}/${fieldName}-${hash}.${extension}`;
    await client.uploadObject({
      key,
      body: buffer,
      contentType,
      cacheControl: IMMUTABLE_CACHE_CONTROL,
    });

    const mirroredUrl = `${resolvedConfig.publicBaseUrl}/${key}`;
    return {
      entry: {
        sourceUrl,
        mirroredUrl,
        contentHash: hash,
        contentType,
        byteLength: buffer.length,
        mirroredAt: new Date(),
        error: null,
      },
      displayUrl: mirroredUrl,
      mirrored: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fallbackUrl =
      previous?.mirroredUrl && !isFleetYardsUrl(previous.mirroredUrl)
        ? previous.mirroredUrl
        : previousDisplayUrl && !isFleetYardsUrl(previousDisplayUrl)
          ? previousDisplayUrl
          : sourceUrl;

    return {
      entry: createErrorEntry(sourceUrl, previous, message),
      displayUrl: fallbackUrl,
      mirrored: false,
    };
  }
}

export async function mirrorShipAssets(
  ship: Omit<ShipDocument, '_id' | 'createdAt'>,
  existing?: Partial<Pick<ShipDocument, 'images' | 'manufacturer' | 'imageMirrors'>>,
  options?: {
    uploadClient?: ImageUploadClient;
    fetchImpl?: typeof fetch;
    config?: R2MirrorConfig;
  }
): Promise<MirrorShipAssetsResult> {
  let config: R2MirrorConfig;
  try {
    config = options?.config ?? loadR2MirrorConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Cloudflare R2 image mirror is not configured', error instanceof Error ? error : undefined, {
      module: 'ship-image-mirror',
      shipName: ship.name,
    });
    const fallbackShip: Omit<ShipDocument, '_id' | 'createdAt'> = {
      ...ship,
      images: { ...ship.images },
      manufacturer: { ...ship.manufacturer },
      imageMirrors: existing?.imageMirrors,
    };
    for (const field of SHIP_IMAGE_FIELDS) {
      const previousDisplayUrl = existing?.images?.[field];
      if (previousDisplayUrl && !isFleetYardsUrl(previousDisplayUrl)) {
        fallbackShip.images[field] = previousDisplayUrl;
      }
    }
    if (existing?.manufacturer?.logo && !isFleetYardsUrl(existing.manufacturer.logo)) {
      fallbackShip.manufacturer.logo = existing.manufacturer.logo;
    }
    return {
      ship: fallbackShip,
      mirroredImages: 0,
      failedImages: countConfiguredImageUrls(ship),
      errors: [message],
    };
  }

  const keyPrefix = `${config.prefix}/${ship.fleetyardsId}`;
  const mirroredShip: Omit<ShipDocument, '_id' | 'createdAt'> = {
    ...ship,
    images: { ...ship.images },
    manufacturer: { ...ship.manufacturer },
    imageMirrors: {
      images: {},
      manufacturerLogo: existing?.imageMirrors?.manufacturerLogo,
    },
  };

  let mirroredImages = 0;
  let failedImages = 0;
  const errors: string[] = [];

  const imageResults = await Promise.all(
    SHIP_IMAGE_FIELDS.map(async (field) => {
      const sourceUrl = ship.images[field];
      const result = await mirrorImageUrl({
        sourceUrl,
        keyPrefix,
        fieldName: field,
        previous: existing?.imageMirrors?.images?.[field],
        previousDisplayUrl: existing?.images?.[field],
        uploadClient: options?.uploadClient,
        fetchImpl: options?.fetchImpl,
        config,
      });

      return { field, result };
    })
  );

  for (const { field, result } of imageResults) {
    mirroredShip.images[field] = result.displayUrl || null;
    mirroredShip.imageMirrors!.images[field] = result.entry;

    if (result.mirrored) {
      mirroredImages++;
    } else if (result.entry.error) {
      failedImages++;
      errors.push(`${ship.name} ${field}: ${result.entry.error}`);
    }
  }

  const logoResult = await mirrorImageUrl({
    sourceUrl: ship.manufacturer.logo,
    keyPrefix,
    fieldName: 'manufacturer-logo',
    previous: existing?.imageMirrors?.manufacturerLogo,
    previousDisplayUrl: existing?.manufacturer?.logo,
    uploadClient: options?.uploadClient,
    fetchImpl: options?.fetchImpl,
    config,
  });

  mirroredShip.manufacturer.logo = logoResult.displayUrl || null;
  mirroredShip.imageMirrors!.manufacturerLogo = logoResult.entry;

  if (logoResult.mirrored) {
    mirroredImages++;
  } else if (logoResult.entry.error) {
    failedImages++;
    errors.push(`${ship.name} manufacturer-logo: ${logoResult.entry.error}`);
  }

  return {
    ship: mirroredShip,
    mirroredImages,
    failedImages,
    errors,
  };
}

function countConfiguredImageUrls(ship: Omit<ShipDocument, '_id' | 'createdAt'>): number {
  let count = SHIP_IMAGE_FIELDS.filter((field) => !!ship.images[field]).length;
  if (ship.manufacturer.logo) count++;
  return count;
}

export function needsImageMirrorBackfill(
  existing: Partial<Pick<ShipDocument, 'images' | 'manufacturer' | 'imageMirrors'>> | undefined
): boolean {
  if (!existing) return true;

  if (!existing.images || !existing.manufacturer || !existing.imageMirrors?.images) {
    return true;
  }

  if (SHIP_IMAGE_FIELDS.some((field) => isFleetYardsUrl(existing.images?.[field]))) {
    return true;
  }

  if (isFleetYardsUrl(existing.manufacturer?.logo)) {
    return true;
  }

  for (const field of SHIP_IMAGE_FIELDS) {
    const displayUrl = existing.images[field];
    const mirrorEntry = existing.imageMirrors.images[field];
    if (displayUrl && (!mirrorEntry?.mirroredUrl || mirrorEntry.error)) {
      return true;
    }
  }

  const logoEntry = existing.imageMirrors.manufacturerLogo;
  if (existing.manufacturer.logo && (!logoEntry?.mirroredUrl || logoEntry.error)) {
    return true;
  }

  return false;
}

export function createMirrorTestConfig(overrides: Partial<R2MirrorConfig> = {}): R2MirrorConfig {
  return {
    endpoint: 'https://example-account.r2.cloudflarestorage.com',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    bucketName: 'images',
    publicBaseUrl: 'https://images.aydocorp.space',
    prefix: `${DEFAULT_PREFIX}/test-${randomUUID()}`,
    maxImageBytes: DEFAULT_MAX_IMAGE_BYTES,
    downloadTimeoutMs: DEFAULT_DOWNLOAD_TIMEOUT_MS,
    ...overrides,
  };
}
