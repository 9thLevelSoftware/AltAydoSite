import { connectToDatabase } from '@/lib/mongodb';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { Transaction } from '@/types/finance';

export async function getTransactions(userEmail: string | null | undefined) {
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
      .find({}, { projection: { _id: 1, type: 1, amount: 1, category: 1, description: 1, submittedBy: 1, submittedAt: 1 } })
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

    return {
      transactions: typedTransactions,
      grandTotal,
      remainingRequests: apiRateLimiter.getRemainingRequests(userEmail),
    };
  } catch (error) {
    console.error('Failed to fetch transactions from DB:', error);
    return { transactions: [], grandTotal: 0, remainingRequests: null, error: 'Failed to fetch transactions' };
  }
}
