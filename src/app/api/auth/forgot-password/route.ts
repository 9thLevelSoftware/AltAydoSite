import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as userStorage from '@/lib/user-storage';
import * as resetTokenStorage from '@/lib/password-reset-storage';
import { sendPasswordResetEmail } from '@/lib/email-service';
import { checkRateLimit, getRateLimitKey, AUTH_RATE_LIMIT } from '@/lib/rate-limit-store';

// Define validation schema for forgot password request
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit forgot-password attempts by client IP
    const rateLimitKey = getRateLimitKey('auth:forgot-password', request);
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

    console.log('Forgot password API called');
    const body = await request.json();
    console.log('Forgot password request body received', { email: body.email });

    // Validate the request body
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.errors[0].message;
      console.error('Validation error:', errorMessage);
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Find user by email
    const user = await userStorage.getUserByEmail(email);
    
    // For security reasons, always return success even if user not found
    // This prevents email enumeration attacks
    if (!user) {
      console.log(`No user found with email: ${email}`);
      return NextResponse.json(
        { message: 'If your email is registered, you will receive password reset instructions' },
        { status: 200 }
      );
    }

    // Generate and store reset token
    const resetToken = await resetTokenStorage.createResetToken(user.id, user.email);
    
    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken.token, user.aydoHandle);
    
    if (!emailSent) {
      console.error('Failed to send password reset email');
      return NextResponse.json(
        { error: 'Failed to send password reset email. Please try again later.' },
        { status: 500 }
      );
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
    console.error('Error processing forgot password request:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
} 