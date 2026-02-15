import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { forceUseLocalStorage, resetConnectionStatus } from '@/lib/storage-utils';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get action from request
    const { action } = await request.json();
    
    if (action === 'force-local') {
      forceUseLocalStorage();
      return NextResponse.json({ 
        success: true, 
        message: 'System is now using local storage for all operations',
        mode: 'local'
      });
    } else if (action === 'reset') {
      resetConnectionStatus();
      return NextResponse.json({ 
        success: true, 
        message: 'Connection status reset, will try MongoDB on next operation',
        mode: 'auto'
      });
    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Use "force-local" or "reset"' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in force-fallback route:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 