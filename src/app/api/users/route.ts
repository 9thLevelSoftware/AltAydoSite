import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as userStorage from '@/lib/user-storage';

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
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '50', 10);
    const pageSize = Math.min(200, Math.max(1, pageSizeRaw));

    // Get all users (storage currently returns full list)
    const users = await userStorage.getAllUsers();
    
    // Map to return only necessary info
    const usersList = users.map(user => ({
      id: user.id,
      aydoHandle: user.aydoHandle,
      role: user.role,
      division: user.division || null,
      position: user.position || null,
      ships: user.ships || []
    }));
    
    const start = (page - 1) * pageSize;
    const paged = usersList.slice(start, start + pageSize);

    const res = NextResponse.json({
      items: paged,
      page,
      pageSize,
      total: usersList.length,
      totalPages: Math.ceil(usersList.length / pageSize) || 1,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 