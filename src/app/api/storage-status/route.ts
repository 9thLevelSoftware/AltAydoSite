import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as userStorage from '@/lib/user-storage';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Try to access the storage
    const users = await userStorage.getAllUsers();

    return NextResponse.json({
      status: 'success',
      storageMode: userStorage.isUsingFallbackStorage()
        ? 'local-fallback'
        : 'cosmos-db',
      userCount: users.length,
      message: userStorage.isUsingFallbackStorage()
        ? 'Using local file storage (fallback mode)'
        : 'Using Azure Cosmos DB'
    });
  } catch {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to access storage',
      storageMode: userStorage.isUsingFallbackStorage()
        ? 'local-fallback'
        : 'cosmos-db'
    }, { status: 500 });
  }
}
