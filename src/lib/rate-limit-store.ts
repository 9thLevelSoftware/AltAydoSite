import { connectToDatabase } from '@/lib/mongodb';

/**
 * MongoDB-backed rate limit store for authentication endpoints.
 * Uses a deterministic per-window bucket document keyed by `bucketKey`
 * (unique-indexed in mongo-indexes.ts) so concurrent requests increment a
 * single document instead of splitting counters across duplicate upserts.
 * TTL index on expiresAt handles auto-cleanup (see mongo-indexes.ts).
 */

interface RateLimitDoc {
  // Deterministic, unique per (key, window). Collisions are intentional so
  // concurrent requests land on the same document.
  bucketKey: string;
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/** Default thresholds for auth endpoints (configurable via env vars) */
export const AUTH_RATE_LIMIT = {
  maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'),
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '300000'), // 5 minutes
};

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

/**
 * Check and increment rate limit counter atomically.
 *
 * Counting is single-document: the bucket id is derived deterministically from
 * the key and the current tumbling window (`${key}:${floor(now/windowMs)}`),
 * which carries a unique index. Concurrent requests therefore collide on the
 * same document and `$inc` is atomic. If two requests race to insert the bucket
 * for the first time, one receives a duplicate-key error (E11000); we retry the
 * increment against the now-existing document.
 *
 * @param key - Rate limit key (e.g. "auth:login:192.168.1.1")
 * @param maxRequests - Maximum allowed requests in the window
 * @param windowMs - Window duration in milliseconds
 * @returns Whether the request is allowed, remaining count, and reset time
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const { db } = await connectToDatabase();
  const collection = db.collection<RateLimitDoc>('rateLimits');

  const now = Date.now();
  const windowIndex = Math.floor(now / windowMs);
  const bucketKey = `${key}:${windowIndex}`;
  const windowStart = new Date(windowIndex * windowMs);
  const resetAt = new Date((windowIndex + 1) * windowMs);

  let doc: RateLimitDoc | null;
  try {
    // Atomic single-document increment within the current window, or create it.
    doc = await collection.findOneAndUpdate(
      { bucketKey },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          bucketKey,
          key,
          windowStart,
          expiresAt: resetAt,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      // Lost the race to insert the bucket; the document now exists, so retry a
      // plain increment against it (no upsert -> cannot duplicate again).
      doc = await collection.findOneAndUpdate(
        { bucketKey },
        { $inc: { count: 1 } },
        { returnDocument: 'after' }
      );
    } else {
      throw error;
    }
  }

  if (!doc) {
    // Should not happen with upsert + retry, but fail open conservatively.
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  const allowed = doc.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - doc.count);

  return { allowed, remaining, resetAt: doc.expiresAt ?? resetAt };
}

/**
 * Process-local in-memory fallback limiter.
 *
 * Used only when the MongoDB-backed limiter is unavailable so that auth
 * endpoints can fail closed (return 429) instead of failing open. Counters are
 * per-process (not shared across instances), so this is a conservative last
 * line of defense rather than a precise global limit.
 */
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimitInMemory(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });

    // Opportunistic cleanup to bound memory growth.
    if (memoryBuckets.size > 10000) {
      for (const [k, v] of memoryBuckets) {
        if (v.resetAt <= now) memoryBuckets.delete(k);
      }
    }

    return {
      allowed: 1 <= maxRequests,
      remaining: Math.max(0, maxRequests - 1),
      resetAt: new Date(resetAt),
    };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= maxRequests,
    remaining: Math.max(0, maxRequests - existing.count),
    resetAt: new Date(existing.resetAt),
  };
}

/**
 * Resolve the client IP from a trusted source.
 *
 * PROXY ASSUMPTION: this app runs behind a known reverse proxy / CDN. The
 * leftmost `X-Forwarded-For` entry is set by the (untrusted) client and is
 * trivially spoofable, so we never trust it for rate limiting. Instead:
 *   1. If `RATE_LIMIT_TRUSTED_IP_HEADER` is configured (e.g. `cf-connecting-ip`
 *      for Cloudflare, `x-azure-clientip` for Azure Front Door), trust it -- the
 *      platform sets it and strips any client-supplied copy.
 *   2. Otherwise walk back from the right of the `X-Forwarded-For` chain by
 *      `RATE_LIMIT_TRUSTED_PROXY_COUNT` hops (default 1, i.e. the entry our own
 *      proxy appended) to get the real client IP rather than a forged prefix.
 *   3. Fall back to `x-real-ip`, then `'unknown'`.
 */
function getClientIp(request: Request): string {
  const trustedHeader = process.env.RATE_LIMIT_TRUSTED_IP_HEADER;
  if (trustedHeader) {
    const value = request.headers.get(trustedHeader)?.trim();
    if (value) return value;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const chain = forwarded
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (chain.length > 0) {
      const trustedProxyCount = Math.max(
        1,
        parseInt(process.env.RATE_LIMIT_TRUSTED_PROXY_COUNT || '1', 10) || 1
      );
      const idx = Math.max(0, chain.length - trustedProxyCount);
      return chain[idx] || 'unknown';
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

/**
 * Build a rate limit key from a request.
 *
 * The IP is derived from a trusted source (see {@link getClientIp}). When an
 * `identifier` (e.g. the account/email being authenticated) is supplied, it is
 * folded into the key so per-account limits still hold even if the IP is
 * spoofed or shared (e.g. behind CGNAT).
 *
 * @param prefix - Key prefix (e.g. "auth:signup")
 * @param request - Incoming Request object
 * @param identifier - Optional account/email to scope the limit per-account
 * @returns Formatted rate limit key (e.g. "auth:signup:192.168.1.1")
 */
export function getRateLimitKey(prefix: string, request: Request, identifier?: string): string {
  const ip = getClientIp(request);
  const id = identifier?.trim().toLowerCase();
  return id ? `${prefix}:${ip}:${id}` : `${prefix}:${ip}`;
}
