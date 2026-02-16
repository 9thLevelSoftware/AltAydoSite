import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as userStorage from '@/lib/user-storage';
import { logger } from '@/lib/logger';

// GET - Fetch users with leadership clearance (level 3+)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users
    const allUsers = await userStorage.getAllUsers();

    // Filter to clearance level 3+
    const leaders = allUsers
      .filter(user => user.clearanceLevel >= 3)
      .map(user => ({
        id: user.id,
        aydoHandle: user.aydoHandle,
        discordName: user.discordName,
        discordId: user.discordId,
        position: user.position,
        division: user.division,
        clearanceLevel: user.clearanceLevel,
        photo: user.photo
      }))
      .sort((a, b) => {
        // Sort by clearance level (highest first), then by handle
        if (b.clearanceLevel !== a.clearanceLevel) {
          return b.clearanceLevel - a.clearanceLevel;
        }
        return a.aydoHandle.localeCompare(b.aydoHandle);
      });

    logger.info('Found users with leadership clearance', { route: '/api/users/leaders', count: leaders.length });

    const res = NextResponse.json({
      leaders,
      count: leaders.length
    });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;

  } catch (error) {
    logger.error('Error fetching leaders', error instanceof Error ? error : new Error(String(error)), { route: '/api/users/leaders' });
    return NextResponse.json(
      { error: 'Failed to fetch leaders' },
      { status: 500 }
    );
  }
}
