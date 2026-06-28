import { createHash, randomUUID } from 'crypto';
import { isIP } from 'net';
import { PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import type { ShipDocument, ShipImageField, ShipImageMirrorEntry } from '@/types/ship';
import { logger } from '@/lib/logger';
import { isFleetYardsImageUrl } from '@/lib/ships/image';

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

// Hosts we are willing to fetch source imagery from. Kept in sync with
// isFleetYardsImageUrl(); extra origins can be added via env without code change.
const FLEETYARDS_IMAGE_HOSTS: readonly string[] = [
  'api.fleetyards.net',
  'cdn.fleetyards.net',
  'fleetyards.net',
  'storage.fltyrd.net',
];

// NOTE: SVG (image/svg+xml) is intentionally excluded. SVGs are active content
// (they can embed scripts/external references) and we do not sanitize them, so
// mirroring and serving them would be an XSS vector. Raster formats only.
const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
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
  const prefix = (process.env.CLOUDFLARE_R2_SHIP_IMAGE_PREFIX?.trim() || DEFAULT_PREFIX).replace(
    /^\/+|\/+$/g,
    ''
  );
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
    maxImageBytes:
      Number.isFinite(maxImageBytes) && maxImageBytes > 0 ? maxImageBytes : DEFAULT_MAX_IMAGE_BYTES,
    downloadTimeoutMs:
      Number.isFinite(downloadTimeoutMs) && downloadTimeoutMs > 0
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

function parseHostList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Build the set of hostnames the mirror is allowed to fetch from: the known
 * FleetYards CDN hosts, any operator-configured origins, and our own public
 * bucket host (so an already-mirrored asset can be re-mirrored).
 */
function getAllowedSourceHosts(config: R2MirrorConfig): Set<string> {
  const hosts = new Set<string>(FLEETYARDS_IMAGE_HOSTS);
  for (const host of parseHostList(process.env.SHIP_IMAGE_MIRROR_ALLOWED_HOSTS)) {
    hosts.add(host);
  }
  try {
    hosts.add(new URL(config.publicBaseUrl).hostname.toLowerCase());
  } catch {
    // publicBaseUrl is validated by loadR2MirrorConfig(); ignore parse issues here.
  }
  return hosts;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true; // Unparseable → treat as unsafe.
  const inRange = (base: string, maskBits: number): boolean => {
    const baseInt = ipv4ToInt(base);
    if (baseInt === null) return false;
    const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
    return (value & mask) === (baseInt & mask);
  };
  return (
    inRange('0.0.0.0', 8) || // "this" network
    inRange('10.0.0.0', 8) || // private
    inRange('100.64.0.0', 10) || // CGNAT
    inRange('127.0.0.0', 8) || // loopback
    inRange('169.254.0.0', 16) || // link-local + cloud metadata (169.254.169.254)
    inRange('172.16.0.0', 12) || // private
    inRange('192.0.0.0', 24) || // IETF protocol assignments
    inRange('192.168.0.0', 16) || // private
    inRange('198.18.0.0', 15) || // benchmarking
    inRange('224.0.0.0', 4) || // multicast
    inRange('240.0.0.0', 4) // reserved + broadcast
  );
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === '::' || addr === '::1') return true; // unspecified / loopback
  const v4Mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4Mapped) return isPrivateOrReservedIpv4(v4Mapped[1]);
  if (/^fe[89ab]/.test(addr)) return true; // fe80::/10 link-local
  if (/^f[cd]/.test(addr)) return true; // fc00::/7 unique-local
  return false;
}

/**
 * Validate a source URL before fetching it (SSRF guard).
 *
 * Rejects non-http(s) schemes, IP literals that point at loopback/private/
 * link-local/metadata ranges, and any host outside the configured allowlist of
 * trusted CDN origins. Because destinations are constrained to non
 * attacker-controlled hosts, DNS-rebinding is not a practical vector here, so we
 * deliberately avoid a live DNS resolution step that would couple this pipeline
 * to the network. Throws on rejection; callers log and record an error entry.
 */
function assertSafeSourceUrl(sourceUrl: string, config: R2MirrorConfig): void {
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error('source URL is not a valid absolute URL');
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`unsupported URL scheme "${parsed.protocol}"`);
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const ipVersion = isIP(hostname);
  if (ipVersion === 4 && isPrivateOrReservedIpv4(hostname)) {
    throw new Error('source host points to a private or reserved address');
  }
  if (ipVersion === 6 && isPrivateOrReservedIpv6(hostname)) {
    throw new Error('source host points to a private or reserved address');
  }

  if (!getAllowedSourceHosts(config).has(hostname)) {
    throw new Error(`source host "${hostname}" is not in the image mirror allowlist`);
  }
}

function createErrorEntry(
  sourceUrl: string | null,
  previous: ShipImageMirrorEntry | undefined,
  error: string
): ShipImageMirrorEntry {
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

function createAbortSignal(timeoutMs: number): { signal?: AbortSignal; cleanup?: () => void } {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(timeoutMs) };
  }

  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return {
      signal: controller.signal,
      cleanup: () => clearTimeout(timeoutId),
    };
  }

  return {};
}

async function safelyConsumeOrCancel(response: Response): Promise<void> {
  try {
    if (response.body) {
      await response.body.cancel();
    } else {
      await response.text();
    }
  } catch {
    // Best-effort cleanup only; preserve the original mirror failure.
  }
}

async function downloadImage(
  sourceUrl: string,
  fetchImpl: typeof fetch,
  config: R2MirrorConfig
): Promise<{ buffer: Buffer; contentType: string }> {
  const abort = createAbortSignal(config.downloadTimeoutMs);

  try {
    const response = await fetchImpl(sourceUrl, {
      headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
      redirect: 'follow',
      signal: abort.signal,
    });

    if (!response.ok) {
      await safelyConsumeOrCancel(response);
      throw new Error(`download failed with HTTP ${response.status}`);
    }

    const contentType =
      response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
    if (!isSupportedImageContentType(contentType)) {
      await safelyConsumeOrCancel(response);
      throw new Error(`unsupported image content-type "${contentType || 'unknown'}"`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const bytes = Number(contentLength);
      if (Number.isFinite(bytes) && bytes > config.maxImageBytes) {
        await safelyConsumeOrCancel(response);
        throw new Error(`image exceeds ${config.maxImageBytes} byte limit`);
      }
    }

    const buffer = await readResponseBuffer(response, config.maxImageBytes);

    return { buffer, contentType };
  } finally {
    abort.cleanup?.();
  }
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
  return isFleetYardsImageUrl(url);
}

function getReusableMirrorUrl(
  sourceUrl: string,
  previous: ShipImageMirrorEntry | undefined,
  freshness: { isFresh: boolean; forceRefresh: boolean }
): string | null {
  // Reuse only when the source URL matches AND the upstream content is unchanged
  // (same fleetyardsUpdatedAt) and no forced refresh was requested. Keying reuse
  // on URL equality alone would serve stale bytes whenever upstream re-uploads
  // new content under a stable URL.
  if (freshness.forceRefresh || !freshness.isFresh) {
    return null;
  }
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

function resolveFallbackDisplayUrl(
  sourceUrl: string,
  previous: ShipImageMirrorEntry | undefined,
  previousDisplayUrl: string | null | undefined
): string {
  if (previous?.mirroredUrl && !isFleetYardsUrl(previous.mirroredUrl)) {
    return previous.mirroredUrl;
  }
  if (previousDisplayUrl && !isFleetYardsUrl(previousDisplayUrl)) {
    return previousDisplayUrl;
  }
  return sourceUrl;
}

export async function mirrorImageUrl(params: {
  sourceUrl: string | null;
  keyPrefix: string;
  fieldName: string;
  previous?: ShipImageMirrorEntry;
  previousDisplayUrl?: string | null;
  /** Upstream change marker the previous mirror was captured against. */
  previousFleetyardsUpdatedAt?: string | null;
  /** Upstream change marker for the source being mirrored now. */
  currentFleetyardsUpdatedAt?: string | null;
  /** When true, never reuse an existing mirror; always re-fetch. */
  forceRefresh?: boolean;
  uploadClient?: ImageUploadClient;
  fetchImpl?: typeof fetch;
  config?: R2MirrorConfig;
}): Promise<MirrorImageResult> {
  const {
    sourceUrl,
    keyPrefix,
    fieldName,
    previous,
    previousDisplayUrl,
    previousFleetyardsUpdatedAt,
    currentFleetyardsUpdatedAt,
    forceRefresh = false,
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

  // Treat the mirror as fresh when we lack change markers (preserves prior
  // reuse behavior for direct callers); otherwise require an exact match.
  const isFresh =
    previousFleetyardsUpdatedAt == null || currentFleetyardsUpdatedAt == null
      ? true
      : previousFleetyardsUpdatedAt === currentFleetyardsUpdatedAt;

  const reusableMirrorUrl = getReusableMirrorUrl(sourceUrl, previous, { isFresh, forceRefresh });
  if (reusableMirrorUrl && previous) {
    return {
      entry: previous,
      displayUrl: reusableMirrorUrl,
      mirrored: false,
    };
  }

  const resolvedConfig = config ?? loadR2MirrorConfig();

  // SSRF guard: validate the source URL before any network access. Rejected
  // URLs are logged and recorded as an error entry rather than fetched.
  try {
    assertSafeSourceUrl(sourceUrl, resolvedConfig);
  } catch (validationError) {
    const message =
      validationError instanceof Error ? validationError.message : String(validationError);
    logger.warn('Rejected unsafe ship image source URL before mirroring', {
      module: 'ship-image-mirror',
      field: fieldName,
      sourceUrl,
      reason: message,
    });
    return {
      entry: createErrorEntry(sourceUrl, previous, message),
      displayUrl: resolveFallbackDisplayUrl(sourceUrl, previous, previousDisplayUrl),
      mirrored: false,
    };
  }

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
    return {
      entry: createErrorEntry(sourceUrl, previous, message),
      displayUrl: resolveFallbackDisplayUrl(sourceUrl, previous, previousDisplayUrl),
      mirrored: false,
    };
  }
}

export async function mirrorShipAssets(
  ship: Omit<ShipDocument, '_id' | 'createdAt'>,
  existing?: Partial<
    Pick<ShipDocument, 'images' | 'manufacturer' | 'imageMirrors' | 'fleetyardsUpdatedAt'>
  >,
  options?: {
    uploadClient?: ImageUploadClient;
    fetchImpl?: typeof fetch;
    config?: R2MirrorConfig;
    /** Force re-fetch of every image even if a usable mirror already exists. */
    forceRefresh?: boolean;
  }
): Promise<MirrorShipAssetsResult> {
  // Freshness markers: only reuse a prior mirror when the upstream change marker
  // is unchanged. A changed marker (the usual reason this ship is being synced)
  // forces a re-fetch so stable URLs with new content are not served stale.
  const previousFleetyardsUpdatedAt = existing?.fleetyardsUpdatedAt ?? null;
  const currentFleetyardsUpdatedAt = ship.fleetyardsUpdatedAt ?? null;
  const forceRefresh = options?.forceRefresh ?? false;
  let config: R2MirrorConfig;
  try {
    config = options?.config ?? loadR2MirrorConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      'Cloudflare R2 image mirror is not configured',
      error instanceof Error ? error : undefined,
      {
        module: 'ship-image-mirror',
        shipName: ship.name,
      }
    );
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
        previousFleetyardsUpdatedAt,
        currentFleetyardsUpdatedAt,
        forceRefresh,
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
    previousFleetyardsUpdatedAt,
    currentFleetyardsUpdatedAt,
    forceRefresh,
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
