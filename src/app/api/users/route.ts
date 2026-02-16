import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as userStorage from '@/lib/user-storage';
import { logger } from '@/lib/logger';

// GET handler - List users (basic info only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Pagination params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '25', 10);
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw));

    // DB-level pagination via skip/limit
    const result = await userStorage.getUsersPaginated(page, pageSize);

    // Map to return only necessary info
    const usersList = result.users.map(user => ({
      id: user.id,
      aydoHandle: user.aydoHandle,
      role: user.role,
      division: user.division || null,
      position: user.position || null,
      ships: user.ships || []
    }));

    const res = NextResponse.json({
      items: usersList,
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize) || 1,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
    
  } catch (error) {
    logger.error('Error fetching users', error instanceof Error ? error : new Error(String(error)), { route: '/api/users' });
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 