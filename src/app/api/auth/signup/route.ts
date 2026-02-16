import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import crypto from 'crypto';
import { User } from '@/types/user';
import * as userStorage from '@/lib/user-storage';
import { checkRateLimit, getRateLimitKey, AUTH_RATE_LIMIT } from '@/lib/rate-limit-store';
import { logger } from '@/lib/logger';

// Define validation schema for signup data
const signupSchema = z.object({
  aydoHandle: z.string().min(3, 'Handle must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  discordName: z.string().optional(),
  rsiAccountName: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit signup attempts by client IP
    const rateLimitKey = getRateLimitKey('auth:signup', request);
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
      logger.warn('Rate limit check failed, allowing request', { route: '/api/auth/signup', error: e instanceof Error ? e.message : String(e) });
    }

    logger.info('Signup API called', { route: '/api/auth/signup' });
    const body = await request.json();
    logger.info('Signup request received', { route: '/api/auth/signup', email: body.email, aydoHandle: body.aydoHandle });

    // Validate the request body
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.errors[0].message;
      logger.warn('Signup validation error', { route: '/api/auth/signup', error: errorMessage });
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { aydoHandle, email, password, discordName, rsiAccountName } = result.data;

    try {
      // Check if user already exists by handle
      logger.info('Checking if handle exists', { route: '/api/auth/signup', aydoHandle });
      const existingUserByHandle = await userStorage.getUserByHandle(aydoHandle);
      if (existingUserByHandle) {
        logger.info('User with handle already exists', { route: '/api/auth/signup', aydoHandle });
        return NextResponse.json(
          { error: 'User with this handle already exists' },
          { status: 409 }
        );
      }

      // Check if user already exists by email
      logger.info('Checking if email exists', { route: '/api/auth/signup', email });
      const existingUserByEmail = await userStorage.getUserByEmail(email);
      if (existingUserByEmail) {
        logger.info('User with email already exists', { route: '/api/auth/signup', email });
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    } catch (checkError) {
      logger.error('Error checking for existing user', checkError instanceof Error ? checkError : new Error(String(checkError)), { route: '/api/auth/signup' });
      return NextResponse.json(
        { error: 'Error checking user existence. Please try again later.' },
        { status: 500 }
      );
    }

    // Hash the password
    logger.info('Hashing password', { route: '/api/auth/signup' });
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (hashError) {
      logger.error('Error hashing password', hashError instanceof Error ? hashError : new Error(String(hashError)), { route: '/api/auth/signup' });
      return NextResponse.json(
        { error: 'Error processing password. Please try again.' },
        { status: 500 }
      );
    }

    // Create a unique ID for the user
    const userId = crypto.randomUUID();
    logger.info('Created user ID', { route: '/api/auth/signup', userId });

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
      updatedAt: new Date().toISOString()
    };

    try {
      // Save the user using our hybrid storage approach
      logger.info('Saving user to storage', { route: '/api/auth/signup', userId });
      await userStorage.createUser(newUser);
      logger.info('User created successfully', { route: '/api/auth/signup', userId, usingFallback: userStorage.isUsingFallbackStorage() });

      // Return success
      return NextResponse.json(
        { 
          message: 'User registered successfully', 
          user: {
            id: newUser.id,
            aydoHandle: newUser.aydoHandle,
            email: newUser.email,
            clearanceLevel: newUser.clearanceLevel,
            role: newUser.role
          } 
        },
        { status: 201 }
      );
    } catch (createError) {
      logger.error('Error creating user in database', createError instanceof Error ? createError : new Error(String(createError)), { route: '/api/auth/signup' });
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error during user registration', error instanceof Error ? error : new Error(String(error)), { route: '/api/auth/signup' });
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
