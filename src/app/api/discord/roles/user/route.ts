import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/auth';
import { getDiscordRoleMonitor } from '@/lib/discord-role-monitor';
import * as userStorage from '@/lib/user-storage';
import { logger } from '@/lib/logger';

// Force this API route to use Node.js runtime for discord.js compatibility
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Elevated callers (admin or clearance >= 3) may look up arbitrary users;
    // everyone else is restricted to their own account.
    const isElevated = session.user.role === 'admin' || (session.user.clearanceLevel ?? 0) >= 3;

    // Safely parse the request body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { userId, discordName } = body as { userId?: unknown; discordName?: unknown };

    // Validate input types to avoid passing non-string values into storage queries
    if (userId !== undefined && typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId must be a string' }, { status: 400 });
    }
    if (discordName !== undefined && typeof discordName !== 'string') {
      return NextResponse.json({ error: 'discordName must be a string' }, { status: 400 });
    }

    const userIdStr = typeof userId === 'string' ? userId.trim() : '';
    const discordNameStr = typeof discordName === 'string' ? discordName.trim() : '';

    // Resolve the target user
    let user;
    if (!isElevated) {
      // Non-elevated callers can only ever check their own roles. Ignore any
      // submitted target so we never leak whether another user/discordName exists.
      user = await userStorage.getUserById(session.user.id);
    } else {
      if (!userIdStr && !discordNameStr) {
        return NextResponse.json(
          { error: 'Either userId or discordName is required' },
          { status: 400 }
        );
      }
      if (userIdStr) {
        user = await userStorage.getUserById(userIdStr);
      } else {
        const allUsers = await userStorage.getAllUsers();
        user = allUsers.find((u) => u.discordName === discordNameStr);
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.discordName && !user.discordId) {
      return NextResponse.json(
        { error: 'User has no Discord identity configured' },
        { status: 400 }
      );
    }

    // Check user's Discord roles
    const monitor = getDiscordRoleMonitor();
    const result = await monitor.checkUserRoles(user);

    return NextResponse.json({
      user: {
        id: user.id,
        aydoHandle: user.aydoHandle,
        discordName: user.discordName,
      },
      roleCheck: {
        division: result.division,
        payGrade: result.payGrade,
        position: result.position,
        clearanceLevel: result.clearanceLevel,
        rolesFound: result.rolesFound,
        updated: result.updated,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(
      'Error checking user Discord roles',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/discord/roles/user' }
    );

    return NextResponse.json({ error: 'Failed to check user roles' }, { status: 500 });
  }
}
