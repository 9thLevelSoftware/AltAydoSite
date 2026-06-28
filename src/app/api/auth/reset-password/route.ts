import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import * as userStorage from '@/lib/user-storage';
import * as resetTokenStorage from '@/lib/password-reset-storage';
import { checkRateLimit, getRateLimitKey, AUTH_RATE_LIMIT } from '@/lib/rate-limit-store';
import { logger } from '@/lib/logger';

// Define validation schema for reset password request
const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
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
    // Rate limit reset-password attempts by client IP
    const rateLimitKey = getRateLimitKey('auth:reset-password', request);
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
        route: '/api/auth/reset-password',
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

    logger.info('Reset password API called', { route: '/api/auth/reset-password' });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    logger.info('Reset password request received', { route: '/api/auth/reset-password' });

    // Validate the request body
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.errors[0].message;
      logger.warn('Reset password validation error', {
        route: '/api/auth/reset-password',
        error: errorMessage,
      });
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { token, password } = result.data;

    // Atomically consume the token BEFORE touching the password. This single
    // guarded operation validates existence, unexpired state, and unused state,
    // and flips `used` -> true in one race-safe step. A null result means the
    // token is invalid, expired, or already used (consumed by a concurrent
    // request). Consuming first guarantees a failed/late password update can
    // never leave a reusable token behind.
    const resetToken = await resetTokenStorage.consumeResetToken(token);

    if (!resetToken) {
      logger.info('Invalid, expired, or already-used reset token', {
        route: '/api/auth/reset-password',
      });
      return NextResponse.json(
        { error: 'Invalid or expired token. Please request a new password reset.' },
        { status: 400 }
      );
    }

    // Get the user
    const user = await userStorage.getUserById(resetToken.userId);

    if (!user) {
      logger.warn('User not found for reset token', {
        route: '/api/auth/reset-password',
        userId: resetToken.userId,
      });
      return NextResponse.json(
        { error: 'User not found. Please contact support.' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password and stamp passwordChangedAt so existing JWT
    // sessions issued before this change are invalidated on their next refresh
    // (revocation claim is compared in the auth jwt callback).
    const passwordChangedAt = new Date().toISOString();
    const updatedUser = await userStorage.updateUser(user.id, {
      passwordHash: hashedPassword,
      passwordChangedAt,
      updatedAt: passwordChangedAt,
    } as Partial<typeof user>);

    if (!updatedUser) {
      // The token has already been consumed (single-use), so the user must
      // request a new reset link. This is the intentional trade-off of the
      // consume-before-update ordering.
      logger.error('Failed to update user password after consuming reset token', undefined, {
        route: '/api/auth/reset-password',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to update password. Please request a new password reset link.' },
        { status: 500 }
      );
    }

    const res = NextResponse.json(
      {
        message: 'Password has been reset successfully. You can now log in with your new password.',
      },
      { status: 200 }
    );
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    logger.error(
      'Error processing reset password request',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/auth/reset-password' }
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
