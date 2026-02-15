import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/auth';
import { getDiscordService } from '@/lib/discord';
import * as userStorage from '@/lib/user-storage';

export const runtime = 'nodejs';

interface Summary {
  attempted: number;
  added: number;
  skippedAlreadyHas: number;
  memberMissing: number;
  errors: number;
  resolvedIds: number;
  limited: boolean;
}

async function handler(request: NextRequest) {
  try {
    let isAuthenticated = false;
    const cronSecret = process.env.CRON_SECRET;

    // 1. Try Cron Secret Auth (for Logic Apps / Automation)
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader === `Bearer ${cronSecret}`) {
        isAuthenticated = true;
      }
    }

    // 2. Try Session Auth if not already authenticated (for Admin UI)
    if (!isAuthenticated) {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        // Require elevated permissions (admin role or clearance >=3)
        if (session.user.role === 'admin' || (session.user.clearanceLevel ?? 0) >= 3) {
          isAuthenticated = true;
        } else {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
      return NextResponse.json({ error: 'Discord not configured' }, { status: 500 });
    }

    let body: any = {};
    if (request.method === 'POST') {
      try {
        body = await request.json().catch(() => ({}));
      } catch (e) {
        // ignore JSON parse errors
      }
    }

    const {
      roleName = process.env.DISCORD_SYNCED_ROLE_NAME || 'Synced to AydoDB',
      delayMs = 0,
      max = 0 // 0 = no artificial cap
    } = body || {};

    const allUsers = await userStorage.getAllUsers();
    let targetUsers = allUsers.filter(u => !!u.discordId || !!u.discordName);

    let limited = false;
    const HARD_CAP = 400; // safety to avoid very long API execution
    if (max > 0) {
      targetUsers = targetUsers.slice(0, max);
      limited = targetUsers.length < allUsers.length;
    } else if (targetUsers.length > HARD_CAP) {
      targetUsers = targetUsers.slice(0, HARD_CAP);
      limited = true;
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ message: 'No users with Discord data found', summary: { attempted: 0, added: 0, skippedAlreadyHas: 0, memberMissing: 0, errors: 0, resolvedIds: 0, limited: false } });
    }

    const discord = getDiscordService();
    await discord.initializeBot();
    const role = await discord.ensureRoleByName(roleName);

    const summary: Summary = { attempted: 0, added: 0, skippedAlreadyHas: 0, memberMissing: 0, errors: 0, resolvedIds: 0, limited };
    const perUserResults: any[] = [];

    for (const user of targetUsers) {
      summary.attempted++;
      let discordId = user.discordId || undefined;
      try {
        if (!discordId && user.discordName) {
          const member = await discord.getMemberByName(user.discordName);
          if (member) {
            discordId = member.id;
            summary.resolvedIds++;
            await userStorage.updateUser(user.id, { discordId, updatedAt: new Date().toISOString() });
          }
        }
        if (!discordId) {
          perUserResults.push({ userId: user.id, aydoHandle: user.aydoHandle, status: 'no_discord_id' });
          continue;
        }
        const result = await discord.assignRoleToMember(discordId, role);
        if (result.added) {
          summary.added++;
          perUserResults.push({ userId: user.id, aydoHandle: user.aydoHandle, status: 'added' });
        } else if (result.reason === 'already_has_role') {
          summary.skippedAlreadyHas++;
          perUserResults.push({ userId: user.id, aydoHandle: user.aydoHandle, status: 'already_has_role' });
        } else if (result.reason === 'member_not_found') {
          summary.memberMissing++;
          perUserResults.push({ userId: user.id, aydoHandle: user.aydoHandle, status: 'member_not_found' });
        } else {
          perUserResults.push({ userId: user.id, aydoHandle: user.aydoHandle, status: result.reason });
        }
      } catch (err) {
        summary.errors++;
        console.error(`Error assigning role to user ${user.id}:`, err);
        perUserResults.push({ userId: user.id, aydoHandle: user.aydoHandle, status: 'error' });
      }
      if (delayMs > 0) {
        await new Promise(res => setTimeout(res, Math.min(2000, delayMs))); // cap delay per user
      }
    }

    await discord.cleanup();

    return NextResponse.json({
      role: { id: role.id, name: role.name },
      summary,
      counts: summary,
      usersProcessed: perUserResults.length,
      results: perUserResults.slice(0, 100), // limit payload size
      truncatedResults: perUserResults.length > 100,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error assigning synced role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
