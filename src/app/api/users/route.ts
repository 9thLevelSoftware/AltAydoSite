import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/app/api/auth/auth';
import * as userStorage from '@/lib/user-storage';
import { logger } from '@/lib/logger';

/**
 * Zod schema for GET /api/users query parameters.
 *
 * z.coerce.number() handles the string-to-number conversion from URL params,
 * and the validation rejects NaN / out-of-range values instead of silently
 * coercing them. page and pageSize have sensible defaults.
 */
const UsersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// GET handler - List users (basic info only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pagination params
    const { searchParams } = new URL(request.url);

    // Convert URLSearchParams to a plain object for Zod parsing
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const parseResult = UsersListQuerySchema.safeParse(rawParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const { page, pageSize } = parseResult.data;

    // DB-level pagination via skip/limit
    const result = await userStorage.getUsersPaginated(page, pageSize);

    // Map to return only minimal directory fields. Fleet inventory (ships) is
    // intentionally omitted here -- exposing every user's ships to any
    // authenticated user is a data-leak risk. Surface it through a narrower
    // per-user/profile endpoint gated by appropriate permissions instead.
    const usersList = result.users.map((user) => ({
      id: user.id,
      aydoHandle: user.aydoHandle,
      role: user.role,
      division: user.division || null,
      position: user.position || null,
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
    logger.error(
      'Error fetching users',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/users' }
    );
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
