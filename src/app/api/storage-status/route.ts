import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as userStorage from '@/lib/user-storage';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins / high-clearance users may see infrastructure details
  // (storage mode, user counts). Everyone else gets a minimal health boolean.
  const isAdmin = session.user.role === 'admin' || (session.user.clearanceLevel ?? 0) >= 4;

  try {
    // Try to access the storage
    const users = await userStorage.getAllUsers();

    if (!isAdmin) {
      return NextResponse.json({
        status: 'success',
        healthy: true,
      });
    }

    return NextResponse.json({
      status: 'success',
      healthy: true,
      storageMode: userStorage.isUsingFallbackStorage() ? 'local-fallback' : 'cosmos-db',
      userCount: users.length,
      message: userStorage.isUsingFallbackStorage()
        ? 'Using local file storage (fallback mode)'
        : 'Using Azure Cosmos DB',
    });
  } catch {
    if (!isAdmin) {
      return NextResponse.json(
        {
          status: 'error',
          healthy: false,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        status: 'error',
        healthy: false,
        message: 'Failed to access storage',
        storageMode: userStorage.isUsingFallbackStorage() ? 'local-fallback' : 'cosmos-db',
      },
      { status: 500 }
    );
  }
}
