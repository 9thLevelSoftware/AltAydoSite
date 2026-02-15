import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import * as userStorage from '@/lib/user-storage';
import * as resetTokenStorage from '@/lib/password-reset-storage';
import { checkRateLimit, getRateLimitKey, AUTH_RATE_LIMIT } from '@/lib/rate-limit-store';

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
      console.warn('Rate limit check failed, allowing request:', e);
    }

    console.log('Reset password API called');
    const body = await request.json();
    console.log('Reset password request body received', { token: body.token?.substring(0, 8) + '...', password: '[REDACTED]' });

    // Validate the request body
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.errors[0].message;
      console.error('Validation error:', errorMessage);
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // Find the token
    const resetToken = await resetTokenStorage.getResetTokenByToken(token);
    
    if (!resetToken) {
      console.log('Invalid or expired token');
      return NextResponse.json(
        { error: 'Invalid or expired token. Please request a new password reset.' },
        { status: 400 }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expiresAt);
    
    if (now > expiresAt) {
      console.log('Token expired');
      return NextResponse.json(
        { error: 'Your password reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (resetToken.used) {
      console.log('Token already used');
      return NextResponse.json(
        { error: 'This password reset link has already been used. Please request a new one if needed.' },
        { status: 400 }
      );
    }

    // Get the user
    const user = await userStorage.getUserById(resetToken.userId);
    
    if (!user) {
      console.log('User not found');
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
      console.error('Failed to update user password');
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
    console.error('Error processing reset password request:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
} 