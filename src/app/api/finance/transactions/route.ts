import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/app/api/auth/auth';
import { getTransactions } from '@/lib/finance';
import { connectToDatabase } from '@/lib/mongodb';
import { Transaction } from '@/types/finance';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

// Upper bound for a single transaction amount (aUEC are whole units).
const MAX_TRANSACTION_AMOUNT = 1_000_000_000_000; // 1 trillion aUEC

// Validation schema for incoming transaction payloads.
const transactionSchema = z.object({
  type: z.enum(['DEPOSIT', 'WITHDRAWAL']),
  amount: z.number().finite().positive().max(MAX_TRANSACTION_AMOUNT).int(),
  category: z.enum([
    'SALARY',
    'MISSION_REWARD',
    'CARGO_SALE',
    'MINING_PROCEEDS',
    'EQUIPMENT_PURCHASE',
    'SHIP_PURCHASE',
    'FUEL_EXPENSE',
    'MAINTENANCE',
    'OTHER',
  ]),
  description: z.string().trim().min(1).max(500),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clearance = session.user.clearanceLevel ?? 0;
  const result = await getTransactions(session.user.email, clearance);

  if (result.error) {
    const status = result.error === 'Too many requests' ? 429 : 500;
    return NextResponse.json(result, { status });
  }

  const res = NextResponse.json(result);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has required clearance (level 3 or higher).
    // Default to 0 so an undefined clearance cannot bypass the check.
    const clearance = session.user.clearanceLevel ?? 0;
    if (clearance < 3) {
      return NextResponse.json(
        {
          error:
            'Insufficient permissions. Only users with clearance level 3 or higher can submit transactions.',
        },
        { status: 403 }
      );
    }

    // Apply rate limiting
    if (apiRateLimiter.isRateLimited(session.user.email)) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          resetTime: apiRateLimiter.getResetTime(session.user.email),
          remainingRequests: apiRateLimiter.getRemainingRequests(session.user.email),
        },
        { status: 429 }
      );
    }

    // Parse JSON body separately so malformed JSON returns 400, not 500.
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate and coerce the payload against the schema.
    const parsed = transactionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid transaction data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, amount, category, description } = parsed.data;

    const { db } = await connectToDatabase();

    const transaction: Omit<Transaction, 'id' | '_id'> = {
      type,
      amount,
      category,
      description,
      submittedBy: session.user.aydoHandle || session.user.email || 'unknown',
      submittedAt: new Date(),
    };

    const result = await db.collection('transactions').insertOne(transaction);

    return NextResponse.json({
      message: 'Transaction created successfully',
      transaction: {
        ...transaction,
        id: result.insertedId.toString(),
      },
      remainingRequests: apiRateLimiter.getRemainingRequests(session.user.email),
    });
  } catch (error) {
    logger.error(
      'Failed to create transaction',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/finance/transactions' }
    );
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
