import { connectToDatabase } from '@/lib/mongodb';

/**
 * MongoDB-backed rate limit store for authentication endpoints.
 * Uses atomic findOneAndUpdate to prevent race conditions.
 * TTL index on expiresAt handles auto-cleanup (see mongo-indexes.ts).
 */

interface RateLimitDoc {
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

/**
 * Check and increment rate limit counter atomically.
 * Uses MongoDB findOneAndUpdate with upsert for race-condition-safe counting.
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
  const windowStart = new Date(now - windowMs);
  const expiresAt = new Date(now + windowMs);

  // Atomic increment within current window, or create new entry
  const result = await collection.findOneAndUpdate(
    { key, windowStart: { $gte: windowStart } },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        key,
        windowStart: new Date(now),
        expiresAt,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  const doc = result;
  if (!doc) {
    // Should not happen with upsert, but fail open
    return { allowed: true, remaining: maxRequests - 1, resetAt: expiresAt };
  }

  const allowed = doc.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - doc.count);
  const resetAt = doc.expiresAt;

  return { allowed, remaining, resetAt };
}

/**
 * Extract a rate limit key from a request using the client IP.
 * Fallback chain: x-forwarded-for header -> 'unknown'
 *
 * @param prefix - Key prefix (e.g. "auth:signup")
 * @param request - Incoming Request object
 * @returns Formatted rate limit key (e.g. "auth:signup:192.168.1.1")
 */
export function getRateLimitKey(prefix: string, request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `${prefix}:${ip}`;
}
