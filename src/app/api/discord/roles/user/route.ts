import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/auth';
import { getDiscordRoleMonitor } from '@/lib/discord-role-monitor';
import * as userStorage from '@/lib/user-storage';

// Force this API route to use Node.js runtime for discord.js compatibility
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId, discordName } = await request.json();

    // Validate input
    if (!userId && !discordName) {
      return NextResponse.json(
        { error: 'Either userId or discordName is required' },
        { status: 400 }
      );
    }

    // Get user from database
    let user;
    if (userId) {
      user = await userStorage.getUserById(userId);
    } else if (discordName) {
      // Find user by discord name
      const allUsers = await userStorage.getAllUsers();
      user = allUsers.find(u => u.discordName === discordName);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Authorization check - users can only check their own roles unless they're admin/manager
    if (session.user.id !== user.id && 
        session.user.role !== 'admin' && 
        session.user.clearanceLevel < 3) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    if (!user.discordName) {
      return NextResponse.json(
        { error: 'User has no Discord name configured' },
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
        discordName: user.discordName
      },
      roleCheck: {
        division: result.division,
        payGrade: result.payGrade,
        position: result.position,
        clearanceLevel: result.clearanceLevel,
        rolesFound: result.rolesFound,
        updated: result.updated,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error checking user Discord roles:', error);
    
    return NextResponse.json(
      { error: 'Failed to check user roles' },
      { status: 500 }
    );
  }
}
