import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import * as userStorage from '@/lib/user-storage';
import * as resetTokenStorage from '@/lib/password-reset-storage';
import { checkRateLimit, getRateLimitKey, AUTH_RATE_LIMIT } from '@/lib/rate-limit-store';
import { logger } from '@/lib/logger';

// Define validation schema for reset password request
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit reset-password attempts by client IP
    const rateLimitKey = getRateLimitKey('auth:reset-password', request);
    try {
      const rateLimit = await checkRateLimit(rateLimitKey, AUTH_RATE_LIMIT.maxRequests, AUTH_RATE_LIMIT.windowMs);
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
      // Fail open: if MongoDB is unavailable, allow the request
      logger.warn('Rate limit check failed, allowing request', { route: '/api/auth/reset-password', error: e instanceof Error ? e.message : String(e) });
    }

    logger.info('Reset password API called', { route: '/api/auth/reset-password' });
    const body = await request.json();
    logger.info('Reset password request received', { route: '/api/auth/reset-password' });

    // Validate the request body
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.errors[0].message;
      logger.warn('Reset password validation error', { route: '/api/auth/reset-password', error: errorMessage });
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // Find the token
    const resetToken = await resetTokenStorage.getResetTokenByToken(token);
    
    if (!resetToken) {
      logger.info('Invalid or expired reset token', { route: '/api/auth/reset-password' });
      return NextResponse.json(
        { error: 'Invalid or expired token. Please request a new password reset.' },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expiresAt);

    if (now > expiresAt) {
      logger.info('Reset token expired', { route: '/api/auth/reset-password' });
      return NextResponse.json(
        { error: 'Your password reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (resetToken.used) {
      logger.info('Reset token already used', { route: '/api/auth/reset-password' });
      return NextResponse.json(
        { error: 'This password reset link has already been used. Please request a new one if needed.' },
        { status: 400 }
      );
    }

    // Get the user
    const user = await userStorage.getUserById(resetToken.userId);

    if (!user) {
      logger.warn('User not found for reset token', { route: '/api/auth/reset-password', userId: resetToken.userId });
      return NextResponse.json(
        { error: 'User not found. Please contact support.' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the user's password
    const updatedUser = await userStorage.updateUser(user.id, {
      passwordHash: hashedPassword,
      updatedAt: new Date().toISOString()
    });
    
    if (!updatedUser) {
      logger.error('Failed to update user password', undefined, { route: '/api/auth/reset-password', userId: user.id });
      return NextResponse.json(
        { error: 'Failed to update password. Please try again later.' },
        { status: 500 }
      );
    }

    // Mark token as used
    await resetTokenStorage.markTokenAsUsed(resetToken.id);

    const res = NextResponse.json(
      { message: 'Password has been reset successfully. You can now log in with your new password.' },
      { status: 200 }
    );
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    logger.error('Error processing reset password request', error instanceof Error ? error : new Error(String(error)), { route: '/api/auth/reset-password' });
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
} 