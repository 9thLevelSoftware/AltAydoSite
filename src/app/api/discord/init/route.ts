import { NextRequest, NextResponse } from 'next/server';
import { initializeDiscordRoleMonitor } from '@/lib/discord-role-monitor-init';
import { logger } from '@/lib/logger';

// Force this API route to use Node.js runtime for discord.js compatibility
export const runtime = 'nodejs';

// This endpoint can be called to initialize the Discord role monitor
// It's designed to be called once when the application starts
export async function POST(request: NextRequest) {
  try {
    // Basic security check - you might want to add authentication here
    const { secret } = await request.json();
    
    if (secret !== process.env.INIT_SECRET) {
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      );
    }

    initializeDiscordRoleMonitor();

    return NextResponse.json({
      message: 'Discord role monitor initialization attempted',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error initializing Discord role monitor via API', error instanceof Error ? error : new Error(String(error)), { route: '/api/discord/init' });

    return NextResponse.json(
      { error: 'Failed to initialize' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    message: 'Discord role monitor initialization endpoint',
    timestamp: new Date().toISOString()
  });
}
