import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/auth';
import { UserSession } from '@/lib/auth';

/**
 * Centralized authorization guard functions for API route protection.
 *
 * Usage:
 *   const auth = await requireLeadership();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth is AuthResult here -- use auth.userId, auth.clearanceLevel, etc.
 */

export interface AuthResult {
  session: UserSession;
  userId: string;
  clearanceLevel: number;
  role: string;
}

const LEADERSHIP_ROLES = ['Director', 'Manager', 'Board Member'];

/**
 * Requires an authenticated session. Returns AuthResult or 401 NextResponse.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const session = await getServerSession(authOptions) as UserSession | null;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return {
    session,
    userId: session.user.id,
    clearanceLevel: session.user.clearanceLevel ?? 0,
    role: session.user.role ?? 'user',
  };
}

/**
 * Requires authenticated session with minimum clearance level.
 * Returns AuthResult or 401/403 NextResponse.
 */
export async function requireClearance(minLevel: number): Promise<AuthResult | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  if (auth.clearanceLevel < minLevel) {
    logger.info('RBAC access denied: insufficient clearance', {
      module: 'auth-guards',
      userId: auth.userId,
      clearanceLevel: auth.clearanceLevel,
      requiredLevel: minLevel,
    });
    return NextResponse.json({ error: 'Insufficient clearance level' }, { status: 403 });
  }

  return auth;
}

/**
 * Requires authenticated session with leadership role OR clearance >= 3.
 * Leadership roles: Director, Manager, Board Member.
 * Returns AuthResult or 401/403 NextResponse.
 */
export async function requireLeadership(): Promise<AuthResult | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const isLeadershipRole = LEADERSHIP_ROLES.includes(auth.role);
  const hasSufficientClearance = auth.clearanceLevel >= 3;

  if (!isLeadershipRole && !hasSufficientClearance) {
    logger.info('RBAC access denied: leadership required', {
      module: 'auth-guards',
      userId: auth.userId,
      clearanceLevel: auth.clearanceLevel,
      role: auth.role,
    });
    return NextResponse.json({ error: 'Leadership role or clearance level 3+ required' }, { status: 403 });
  }

  return auth;
}
