import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { getTransactions } from '@/lib/finance';
import { connectToDatabase } from '@/lib/mongodb';
import { Transaction, TransactionType, TransactionCategory } from '@/types/finance';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

// Validate transaction type
const isValidTransactionType = (type: string): type is TransactionType => {
  return ['DEPOSIT', 'WITHDRAWAL'].includes(type);
};

// Validate transaction category
const isValidCategory = (category: string): category is TransactionCategory => {
  return [
    'SALARY',
    'MISSION_REWARD',
    'CARGO_SALE',
    'MINING_PROCEEDS',
    'EQUIPMENT_PURCHASE',
    'SHIP_PURCHASE',
    'FUEL_EXPENSE',
    'MAINTENANCE',
    'OTHER'
  ].includes(category);
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await getTransactions(session.user.email);

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

    // Check if user has required clearance (level 3 or higher)
    const clearance = session.user.clearanceLevel;
    if (clearance < 3) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only users with clearance level 3 or higher can submit transactions.' },
        { status: 403 }
      );
    }

    // Apply rate limiting
    if (apiRateLimiter.isRateLimited(session.user.email)) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          resetTime: apiRateLimiter.getResetTime(session.user.email),
          remainingRequests: apiRateLimiter.getRemainingRequests(session.user.email)
        }, 
        { status: 429 }
      );
    }

    const { type, amount, category, description } = await request.json();

    // Validate required fields
    if (!type || !amount || !category || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate transaction type
    if (!isValidTransactionType(type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }

    // Validate category
    if (!isValidCategory(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const transaction: Omit<Transaction, 'id' | '_id'> = {
      type,
      amount,
      category,
      description,
      submittedBy: session.user.aydoHandle || session.user.email || 'unknown',
      submittedAt: new Date()
    };

    const result = await db.collection('transactions').insertOne(transaction);

    return NextResponse.json({
      message: 'Transaction created successfully',
      transaction: {
        ...transaction,
        id: result.insertedId.toString(),
      },
      remainingRequests: apiRateLimiter.getRemainingRequests(session.user.email)
    });
  } catch (error) {
    logger.error('Failed to create transaction', error instanceof Error ? error : new Error(String(error)), { route: '/api/finance/transactions' });
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
