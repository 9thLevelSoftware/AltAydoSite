interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Best-effort, single-process in-memory rate limiter.
 *
 * IMPORTANT: counters live in this process's heap only. They are NOT shared
 * across instances/replicas and are lost on restart, so this is a coarse local
 * guard rather than a precise global limit. For auth/API paths that require
 * cross-instance correctness, use the MongoDB-backed limiter in
 * `rate-limit-store.ts` (`checkRateLimit`), which keeps a shared counter with a
 * TTL index for cleanup.
 *
 * To bound memory growth this limiter prunes expired keys: stale entries are
 * evicted on access, and a periodic sweep deletes every entry whose
 * `resetTime` has passed.
 */
class RateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly sweepIntervalMs: number;
  private lastSweep: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.limits = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    // Sweep at most once per window to amortise the cost across requests.
    this.sweepIntervalMs = windowMs;
    this.lastSweep = Date.now();
  }

  /**
   * Delete every entry whose window has elapsed. Runs at most once per
   * `sweepIntervalMs` to keep the per-request cost negligible.
   */
  private prune(now: number): void {
    if (now - this.lastSweep < this.sweepIntervalMs) return;
    this.lastSweep = now;
    for (const [key, entry] of this.limits) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  isRateLimited(key: string): boolean {
    const now = Date.now();
    this.prune(now);
    const entry = this.limits.get(key);

    if (!entry) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return false;
    }

    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + this.windowMs;
      return false;
    }

    entry.count++;
    return entry.count > this.maxRequests;
  }

  getRemainingRequests(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) return this.maxRequests;

    if (Date.now() > entry.resetTime) return this.maxRequests;

    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) return Date.now() + this.windowMs;
    return entry.resetTime;
  }
}

// Create rate limiters with different configurations
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
export const authRateLimiter = new RateLimiter(5, 300000); // 5 requests per 5 minutes for auth endpoints
