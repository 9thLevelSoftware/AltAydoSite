import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as userStorage from '@/lib/user-storage';
import * as resetTokenStorage from '@/lib/password-reset-storage';
import { sendPasswordResetEmail } from '@/lib/email-service';
import { checkRateLimit, getRateLimitKey, AUTH_RATE_LIMIT } from '@/lib/rate-limit-store';
import { logger } from '@/lib/logger';

// Define validation schema for forgot password request
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Conservative in-memory rate-limit fallback. Used only when the persistent
 * (MongoDB-backed) rate-limit store is unavailable, so auth endpoints stay
 * throttled instead of failing open. Process-local and best-effort.
 */
const memoryRateLimit = new Map<string, { count: number; resetAt: number }>();
function checkMemoryRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memoryRateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    memoryRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= maxRequests;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit forgot-password attempts by client IP
    const rateLimitKey = getRateLimitKey('auth:forgot-password', request);
    try {
      const rateLimit = await checkRateLimit(
        rateLimitKey,
        AUTH_RATE_LIMIT.maxRequests,
        AUTH_RATE_LIMIT.windowMs
      );
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }
    } catch (e) {
      // Fail closed via in-memory fallback: if the persistent store is down,
      // keep throttling instead of allowing unlimited attempts.
      logger.warn('Rate limit check failed, using in-memory fallback limiter', {
        route: '/api/auth/forgot-password',
        error: e instanceof Error ? e.message : String(e),
      });
      if (
        !checkMemoryRateLimit(rateLimitKey, AUTH_RATE_LIMIT.maxRequests, AUTH_RATE_LIMIT.windowMs)
      ) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    }

    logger.info('Forgot password API called', { route: '/api/auth/forgot-password' });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    logger.info('Forgot password request received', { route: '/api/auth/forgot-password' });

    // Validate the request body
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.errors[0].message;
      logger.warn('Forgot password validation error', {
        route: '/api/auth/forgot-password',
        error: errorMessage,
      });
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { email } = result.data;

    // Find user by email
    const user = await userStorage.getUserByEmail(email);

    // For security reasons, always return success even if user not found
    // This prevents email enumeration attacks
    if (!user) {
      logger.info('Forgot password request for non-existent email', {
        route: '/api/auth/forgot-password',
      });
      return NextResponse.json(
        { message: 'If your email is registered, you will receive password reset instructions' },
        { status: 200 }
      );
    }

    // Generate and store reset token (only the hash is persisted; the raw
    // token is returned here once so it can be emailed).
    const { tokenRecord, rawToken } = await resetTokenStorage.createResetToken(user.id, user.email);

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, rawToken, user.aydoHandle);

    if (!emailSent) {
      // Invalidate the freshly-created token so a stored-but-undelivered token
      // cannot be used, and return the SAME generic message as the
      // non-existent-email path to avoid email enumeration via delivery errors.
      logger.error('Failed to send password reset email', undefined, {
        route: '/api/auth/forgot-password',
      });
      await resetTokenStorage.deleteResetToken(tokenRecord.id);
      const res = NextResponse.json(
        { message: 'If your email is registered, you will receive password reset instructions' },
        { status: 200 }
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // Clean up expired tokens
    await resetTokenStorage.cleanupExpiredTokens();

    const res = NextResponse.json(
      { message: 'If your email is registered, you will receive password reset instructions' },
      { status: 200 }
    );
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    logger.error(
      'Error processing forgot password request',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/auth/forgot-password' }
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
