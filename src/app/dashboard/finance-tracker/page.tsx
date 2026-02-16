import { Metadata } from 'next';
import { getTransactions } from '@/lib/finance';
import FinanceTrackerClient from './FinanceTrackerClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';

export const metadata: Metadata = {
  title: 'Finance Tracker | AydoCorp',
};

export default async function FinanceTrackerPage() {
  const session = await getServerSession(authOptions);
  const { transactions, grandTotal, remainingRequests } = await getTransactions(session?.user?.email);

  return (
    <FinanceTrackerClient
      initialTransactions={transactions}
      initialGrandTotal={grandTotal}
      initialRemainingRequests={remainingRequests}
    />
  );
}
