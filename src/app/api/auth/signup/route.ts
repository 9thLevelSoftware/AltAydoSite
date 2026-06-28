import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import crypto from 'crypto';
import { User } from '@/types/user';
import * as userStorage from '@/lib/user-storage';
import {
  checkRateLimit,
  checkRateLimitInMemory,
  getRateLimitKey,
  AUTH_RATE_LIMIT,
} from '@/lib/rate-limit-store';
import { logger } from '@/lib/logger';

// Define validation schema for signup data.
// Identifiers are trimmed, length-bounded, and (for the handle) restricted to a
// safe character set. Zod's .trim() transforms the parsed output, so the
// canonical/trimmed values are what get persisted.
const signupSchema = z
  .object({
    aydoHandle: z
      .string()
      .trim()
      .min(3, 'Handle must be at least 3 characters')
      .max(32, 'Handle must be at most 32 characters')
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Handle may only contain letters, numbers, underscores, and hyphens'
      ),
    email: z.string().trim().email('Invalid email address').max(254, 'Email address is too long'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long'),
    confirmPassword: z.string(),
    discordName: z.string().trim().max(64, 'Discord name is too long').optional(),
    rsiAccountName: z.string().trim().max(64, 'RSI account name is too long').optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export async function POST(request: NextRequest) {
  // Correlation id for logs -- avoids logging PII (email/handle) on this public endpoint.
  const requestId = crypto.randomUUID();
  try {
    // Rate limit signup attempts by client IP
    const rateLimitKey = getRateLimitKey('auth:signup', request);
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
      // Fail closed: if the MongoDB-backed limiter is unavailable, apply the
      // process-local in-memory fallback limiter instead of letting requests
      // through unthrottled.
      logger.warn('Rate limit check failed, applying in-memory fallback limiter', {
        route: '/api/auth/signup',
        requestId,
        error: e instanceof Error ? e.message : String(e),
      });
      const fallback = checkRateLimitInMemory(
        rateLimitKey,
        AUTH_RATE_LIMIT.maxRequests,
        AUTH_RATE_LIMIT.windowMs
      );
      if (!fallback.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((fallback.resetAt.getTime() - Date.now()) / 1000)),
              'X-RateLimit-Remaining': '0',
            },
          }
        );
      }
    }

    logger.info('Signup API called', { route: '/api/auth/signup', requestId });
    const body = await request.json();
    logger.info('Signup request received', { route: '/api/auth/signup', requestId });

    // Validate the request body
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.errors[0].message;
      logger.warn('Signup validation error', {
        route: '/api/auth/signup',
        requestId,
        error: errorMessage,
      });
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { aydoHandle, email, password, discordName, rsiAccountName } = result.data;

    try {
      // Check if user already exists by handle
      logger.info('Checking if handle exists', { route: '/api/auth/signup', requestId });
      const existingUserByHandle = await userStorage.getUserByHandle(aydoHandle);
      if (existingUserByHandle) {
        logger.info('User with handle already exists', { route: '/api/auth/signup', requestId });
        return NextResponse.json(
          { error: 'User with this handle already exists' },
          { status: 409 }
        );
      }

      // Check if user already exists by email
      logger.info('Checking if email exists', { route: '/api/auth/signup', requestId });
      const existingUserByEmail = await userStorage.getUserByEmail(email);
      if (existingUserByEmail) {
        logger.info('User with email already exists', { route: '/api/auth/signup', requestId });
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
    } catch (checkError) {
      logger.error(
        'Error checking for existing user',
        checkError instanceof Error ? checkError : new Error(String(checkError)),
        { route: '/api/auth/signup', requestId }
      );
      return NextResponse.json(
        { error: 'Error checking user existence. Please try again later.' },
        { status: 500 }
      );
    }

    // Hash the password
    logger.info('Hashing password', { route: '/api/auth/signup', requestId });
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (hashError) {
      logger.error(
        'Error hashing password',
        hashError instanceof Error ? hashError : new Error(String(hashError)),
        { route: '/api/auth/signup', requestId }
      );
      return NextResponse.json(
        { error: 'Error processing password. Please try again.' },
        { status: 500 }
      );
    }

    // Create a unique ID for the user
    const userId = crypto.randomUUID();
    logger.info('Created user ID', { route: '/api/auth/signup', requestId, userId });

    // Create a new user
    const newUser: User = {
      id: userId,
      aydoHandle,
      email,
      passwordHash: hashedPassword,
      clearanceLevel: 1,
      role: 'user',
      discordName: discordName || null,
      rsiAccountName: rsiAccountName || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Save the user using our hybrid storage approach
      logger.info('Saving user to storage', { route: '/api/auth/signup', requestId, userId });
      await userStorage.createUser(newUser);

      // Fail closed: if the write landed in local fallback storage in production,
      // the authoritative DB write did not happen. Reporting 201 here would tell
      // the user their account exists when it does not survive a restart, so roll
      // back the non-canonical record and return 503.
      if (process.env.NODE_ENV === 'production' && userStorage.isUsingFallbackStorage()) {
        logger.error('Signup wrote to local fallback storage in production; rejecting', undefined, {
          route: '/api/auth/signup',
          requestId,
          userId,
        });
        try {
          await userStorage.deleteUser(userId);
        } catch (rollbackError) {
          logger.error(
            'Failed to roll back fallback signup record',
            rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)),
            { route: '/api/auth/signup', requestId, userId }
          );
        }
        return NextResponse.json(
          { error: 'Account service is temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }

      logger.info('User created successfully', {
        route: '/api/auth/signup',
        requestId,
        userId,
        usingFallback: userStorage.isUsingFallbackStorage(),
      });

      // Return success
      return NextResponse.json(
        {
          message: 'User registered successfully',
          user: {
            id: newUser.id,
            aydoHandle: newUser.aydoHandle,
            email: newUser.email,
            clearanceLevel: newUser.clearanceLevel,
            role: newUser.role,
          },
        },
        { status: 201 }
      );
    } catch (createError) {
      // Another request won the race (or a unique index rejected a duplicate) ->
      // surface as 409 Conflict rather than a generic 500.
      if (createError instanceof userStorage.DuplicateUserError) {
        const conflictField = createError.field === 'aydoHandle' ? 'handle' : createError.field;
        logger.info('Signup duplicate conflict', {
          route: '/api/auth/signup',
          requestId,
          field: createError.field,
        });
        return NextResponse.json(
          { error: `User with this ${conflictField} already exists` },
          { status: 409 }
        );
      }
      logger.error(
        'Error creating user in database',
        createError instanceof Error ? createError : new Error(String(createError)),
        { route: '/api/auth/signup', requestId }
      );
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }
  } catch (error) {
    logger.error(
      'Error during user registration',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/auth/signup', requestId }
    );
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
