import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { Transaction } from '@/types/finance';

// Minimum clearance required to view individual transaction line items.
// Members below this level may still see the aggregated corporate balance
// (grandTotal) but not the itemized ledger.
export const LEDGER_LINE_ITEM_CLEARANCE = 3;

export async function getTransactions(
  userEmail: string | null | undefined,
  clearanceLevel: number = 0
) {
  if (!userEmail) {
    return { transactions: [], grandTotal: 0, remainingRequests: null, error: 'Unauthorized' };
  }

  if (apiRateLimiter.isRateLimited(userEmail)) {
    return {
      transactions: [],
      grandTotal: 0,
      error: 'Too many requests',
      resetTime: apiRateLimiter.getResetTime(userEmail),
      remainingRequests: apiRateLimiter.getRemainingRequests(userEmail),
    };
  }

  try {
    const { db } = await connectToDatabase();

    const transactions = await db
      .collection('transactions')
      .find(
        {},
        {
          projection: {
            _id: 1,
            type: 1,
            amount: 1,
            category: 1,
            description: 1,
            submittedBy: 1,
            submittedAt: 1,
          },
        }
      )
      .sort({ submittedAt: -1 })
      .toArray();

    const typedTransactions = transactions.map((doc) => ({
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
      submittedAt: new Date(doc.submittedAt),
    })) as Transaction[];

    const grandTotal = typedTransactions.reduce((total: number, transaction: Transaction) => {
      return total + (transaction.type === 'DEPOSIT' ? transaction.amount : -transaction.amount);
    }, 0);

    // Only leadership/elevated clearance may view itemized line items.
    // Lower-clearance members receive the aggregated balance only.
    const canViewLineItems = clearanceLevel >= LEDGER_LINE_ITEM_CLEARANCE;

    return {
      transactions: canViewLineItems ? typedTransactions : [],
      grandTotal,
      remainingRequests: apiRateLimiter.getRemainingRequests(userEmail),
    };
  } catch (error) {
    logger.error(
      'Failed to fetch transactions from DB',
      error instanceof Error ? error : undefined,
      { module: 'finance' }
    );
    return {
      transactions: [],
      grandTotal: 0,
      remainingRequests: null,
      error: 'Failed to fetch transactions',
    };
  }
}
