import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/auth';
import { DiscordService } from '@/lib/discord';
import * as userStorage from '@/lib/user-storage';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const HARD_CAP = 400; // safety to avoid very long API execution

interface Summary {
  attempted: number;
  added: number;
  skippedAlreadyHas: number;
  memberMissing: number;
  errors: number;
  resolvedIds: number;
  limited: boolean;
}

async function authenticate(request: NextRequest): Promise<NextResponse | null> {
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

  return null;
}

/**
 * Resolve the set of users that would be targeted for role assignment.
 * Validates/coerces request-controlled inputs and applies the HARD_CAP.
 */
function resolveTargets(
  allUsers: Awaited<ReturnType<typeof userStorage.getAllUsers>>,
  max: number
) {
  let targetUsers = allUsers.filter((u) => !!u.discordId || !!u.discordName);

  // Capture eligible count before slicing so `limited` reflects omitted
  // Discord-eligible users only (not the unfiltered user list).
  const eligibleCount = targetUsers.length;

  // Clamp to HARD_CAP unconditionally; a request-supplied `max` can only
  // narrow the batch further, never exceed the cap.
  targetUsers = targetUsers.slice(0, Math.min(max > 0 ? max : HARD_CAP, HARD_CAP));
  const limited = targetUsers.length < eligibleCount;

  return { targetUsers, eligibleCount, limited };
}

async function handler(request: NextRequest, mutate: boolean) {
  try {
    const authError = await authenticate(request);
    if (authError) return authError;

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
      delayMs: rawDelayMs = 0,
      max: rawMax = 0, // 0 = no artificial cap (still bounded by HARD_CAP)
    } = body || {};

    // Coerce max: invalid input falls back to 0 (HARD_CAP applies regardless).
    const max = Number.isFinite(+rawMax) ? Math.max(0, Math.floor(+rawMax)) : 0;

    // Validate delayMs: must be a finite, non-negative integer.
    const delayMs = +rawDelayMs;
    if (!Number.isFinite(delayMs) || !Number.isInteger(delayMs) || delayMs < 0) {
      return NextResponse.json(
        { error: 'Invalid delayMs: must be a non-negative integer' },
        { status: 400 }
      );
    }

    const allUsers = await userStorage.getAllUsers();
    const { targetUsers, eligibleCount, limited } = resolveTargets(allUsers, max);

    // GET is a non-mutating dry-run: report what would be processed without
    // touching the shared Discord client or assigning roles.
    if (!mutate) {
      return NextResponse.json({
        dryRun: true,
        roleName,
        eligibleUsers: eligibleCount,
        wouldProcess: targetUsers.length,
        limited,
        hardCap: HARD_CAP,
        timestamp: new Date().toISOString(),
      });
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({
        message: 'No users with Discord data found',
        summary: {
          attempted: 0,
          added: 0,
          skippedAlreadyHas: 0,
          memberMissing: 0,
          errors: 0,
          resolvedIds: 0,
          limited: false,
        },
      });
    }

    // Use a dedicated DiscordService for this batch rather than the shared
    // singleton (which the role monitor owns), so cleanup() here cannot tear
    // down the monitor's client. The finally block guarantees cleanup runs.
    const discord = new DiscordService();
    const summary: Summary = {
      attempted: 0,
      added: 0,
      skippedAlreadyHas: 0,
      memberMissing: 0,
      errors: 0,
      resolvedIds: 0,
      limited,
    };
    const perUserResults: any[] = [];

    try {
      await discord.initializeBot();
      const role = await discord.ensureRoleByName(roleName);

      for (const user of targetUsers) {
        summary.attempted++;
        let discordId = user.discordId || undefined;
        try {
          if (!discordId && user.discordName) {
            const member = await discord.getMemberByName(user.discordName);
            if (member) {
              discordId = member.id;
              summary.resolvedIds++;
              await userStorage.updateUser(user.id, {
                discordId,
                updatedAt: new Date().toISOString(),
              });
            }
          }
          if (!discordId) {
            perUserResults.push({
              userId: user.id,
              aydoHandle: user.aydoHandle,
              status: 'no_discord_id',
            });
            continue;
          }
          const result = await discord.assignRoleToMember(discordId, role);
          if (result.added) {
            summary.added++;
            perUserResults.push({ userId: user.id, aydoHandle: user.aydoHandle, status: 'added' });
          } else if (result.reason === 'already_has_role') {
            summary.skippedAlreadyHas++;
            perUserResults.push({
              userId: user.id,
              aydoHandle: user.aydoHandle,
              status: 'already_has_role',
            });
          } else if (result.reason === 'member_not_found') {
            summary.memberMissing++;
            perUserResults.push({
              userId: user.id,
              aydoHandle: user.aydoHandle,
              status: 'member_not_found',
            });
          } else {
            perUserResults.push({
              userId: user.id,
              aydoHandle: user.aydoHandle,
              status: result.reason,
            });
          }
        } catch (err) {
          summary.errors++;
          logger.error(
            'Error assigning role to user',
            err instanceof Error ? err : new Error(String(err)),
            { route: '/api/discord/assign-synced-role', userId: user.id }
          );
          perUserResults.push({ userId: user.id, aydoHandle: user.aydoHandle, status: 'error' });
        }
        if (delayMs > 0) {
          await new Promise((res) => setTimeout(res, Math.min(2000, delayMs))); // cap delay per user
        }
      }

      return NextResponse.json({
        role: { id: role.id, name: role.name },
        summary,
        counts: summary,
        usersProcessed: perUserResults.length,
        results: perUserResults.slice(0, 100), // limit payload size
        truncatedResults: perUserResults.length > 100,
        timestamp: new Date().toISOString(),
      });
    } finally {
      // Always release the dedicated client, even on partial failure.
      await discord.cleanup();
    }
  } catch (error) {
    logger.error(
      'Error assigning synced role',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/discord/assign-synced-role' }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Non-mutating dry-run / status only.
  return handler(request, false);
}

export async function POST(request: NextRequest) {
  return handler(request, true);
}
