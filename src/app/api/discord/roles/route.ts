import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/auth';
import { getDiscordRoleMonitor } from '@/lib/discord-role-monitor';

// Force this API route to use Node.js runtime for discord.js compatibility
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin/manager permissions for role monitoring
    // You may want to add additional permission checks here
    if (session.user.role !== 'admin' && session.user.clearanceLevel < 3) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const monitor = getDiscordRoleMonitor();
    const status = monitor.getStatus();

    return NextResponse.json({
      status: status.isRunning ? 'running' : 'stopped',
      nextCheck: status.nextCheck?.toISOString(),
      message: status.isRunning 
        ? 'Discord role monitoring is active'
        : 'Discord role monitoring is stopped'
    });

  } catch (error) {
    console.error('Error getting Discord role monitor status:', error);
    
    return NextResponse.json(
      { error: 'Failed to get monitor status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has admin/manager permissions for role monitoring
    if (session.user.role !== 'admin' && session.user.clearanceLevel < 3) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { action } = await request.json();
    const monitor = getDiscordRoleMonitor();

    switch (action) {
      case 'start':
        monitor.start();
        return NextResponse.json({
          message: 'Discord role monitoring started',
          status: 'running'
        });

      case 'stop':
        monitor.stop();
        return NextResponse.json({
          message: 'Discord role monitoring stopped',
          status: 'stopped'
        });

      case 'check':
        // Manual role check for all users
        console.log('Manual role check triggered by user:', session.user.aydoHandle);
        const results = await monitor.checkAllUserRoles();
        
        return NextResponse.json({
          message: 'Manual role check completed',
          results: results.map(r => ({
            userId: r.userId,
            discordName: r.discordName,
            division: r.division,
            payGrade: r.payGrade,
            position: r.position,
            clearanceLevel: r.clearanceLevel,
            updated: r.updated,
            error: r.error
          }))
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, or check' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in Discord role monitor POST:', error);
    
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
