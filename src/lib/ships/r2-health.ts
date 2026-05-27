import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import {
  createR2S3Client,
  loadR2MirrorConfig,
  type R2MirrorConfig,
} from '@/lib/ships/r2-image-mirror';
import { logger } from '@/lib/logger';

export interface R2HealthResult {
  success: boolean;
  bucketName: string;
  endpointHost: string;
  publicBaseUrl: string;
  key: string;
  publicUrl: string;
  putOk: boolean;
  headOk: boolean;
  publicReadOk: boolean;
  deleteOk: boolean;
  durationMs: number;
  errors: string[];
}

interface S3Sender {
  send(command: unknown): Promise<unknown>;
}

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).hostname;
  } catch {
    return 'unknown';
  }
}

function healthResult(params: Omit<R2HealthResult, 'success'>): R2HealthResult {
  return {
    ...params,
    success: params.putOk && params.headOk && params.publicReadOk && params.deleteOk && params.errors.length === 0,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyPublicRead(publicUrl: string, fetchImpl: typeof fetch): Promise<void> {
  const cacheBustUrl = `${publicUrl}?r2-health=${Date.now()}`;
  let lastError = '';

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetchImpl(cacheBustUrl, { cache: 'no-store' });
      if (response.ok) {
        const text = await response.text();
        if (text.includes('aydocorp-r2-health')) {
          return;
        }
        lastError = 'public object response body did not match expected health payload';
      } else {
        lastError = `public object returned HTTP ${response.status}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    if (attempt < 3) {
      await sleep(1_000);
    }
  }

  throw new Error(lastError || 'public object could not be read');
}

export async function checkCloudflareR2Health(options?: {
  config?: R2MirrorConfig;
  s3Client?: S3Sender;
  fetchImpl?: typeof fetch;
}): Promise<R2HealthResult> {
  const startedAt = Date.now();
  let config: R2MirrorConfig;

  try {
    config = options?.config ?? loadR2MirrorConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return healthResult({
      bucketName: 'unknown',
      endpointHost: 'unknown',
      publicBaseUrl: 'unknown',
      key: '',
      publicUrl: '',
      putOk: false,
      headOk: false,
      publicReadOk: false,
      deleteOk: false,
      durationMs: Date.now() - startedAt,
      errors: [message],
    });
  }

  const s3Client = options?.s3Client ?? createR2S3Client(config) as S3Client;
  const fetchImpl = options?.fetchImpl ?? fetch;
  const key = `${config.prefix}/health/pr-check-${randomUUID()}.txt`;
  const publicUrl = `${config.publicBaseUrl}/${key}`;
  const body = Buffer.from(`aydocorp-r2-health ${new Date().toISOString()}\n`);

  let putOk = false;
  let headOk = false;
  let publicReadOk = false;
  let deleteOk = false;
  const errors: string[] = [];

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: 'text/plain; charset=utf-8',
      CacheControl: 'no-store',
    }));
    putOk = true;
  } catch (error) {
    errors.push(`putObject failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (putOk) {
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }));
      headOk = true;
    } catch (error) {
      errors.push(`headObject failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await verifyPublicRead(publicUrl, fetchImpl);
      publicReadOk = true;
    } catch (error) {
      errors.push(`public read failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (putOk) {
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }));
      deleteOk = true;
    } catch (error) {
      errors.push(`deleteObject failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const result = healthResult({
    bucketName: config.bucketName,
    endpointHost: endpointHost(config.endpoint),
    publicBaseUrl: config.publicBaseUrl,
    key,
    publicUrl,
    putOk,
    headOk,
    publicReadOk,
    deleteOk,
    durationMs: Date.now() - startedAt,
    errors,
  });

  if (!result.success) {
    logger.warn('Cloudflare R2 health check failed', {
      module: 'r2-health',
      bucketName: result.bucketName,
      endpointHost: result.endpointHost,
      errorCount: result.errors.length,
      errors: result.errors,
    });
  }

  return result;
}
