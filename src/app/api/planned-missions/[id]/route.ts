import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as plannedMissionStorage from '@/lib/planned-mission-storage';
import { logger } from '@/lib/logger';

// GET handler - Get a single planned mission by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Mission ID is required' }, { status: 400 });
    }

    const mission = await plannedMissionStorage.getPlannedMissionById(id);

    if (!mission) {
      return NextResponse.json({ error: 'Planned mission not found' }, { status: 404 });
    }

    const res = NextResponse.json(mission);
    res.headers.set('Cache-Control', 'no-store');
    return res;

  } catch (error) {
    logger.error('Error fetching planned mission', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions/[id]' });
    return NextResponse.json(
      { error: 'Failed to fetch planned mission' },
      { status: 500 }
    );
  }
}

// PUT handler - Update a planned mission by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userClearance = session.user.clearanceLevel ?? 1;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Mission ID is required' }, { status: 400 });
    }

    // Check if user can modify this mission
    const canModify = await plannedMissionStorage.canUserModifyMission(userId, id);
    if (!canModify && userClearance < 4) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this mission' },
        { status: 403 }
      );
    }

    const missionData = await request.json();

    const mission = await plannedMissionStorage.updatePlannedMission(id, missionData);

    if (!mission) {
      return NextResponse.json({ error: 'Planned mission not found' }, { status: 404 });
    }

    logger.info('Planned mission updated successfully', { route: '/api/planned-missions/[id]', missionId: mission.id });
    return NextResponse.json(mission, { status: 200 });

  } catch (error) {
    logger.error('Error updating planned mission', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions/[id]' });
    return NextResponse.json(
      { error: 'Failed to update planned mission' },
      { status: 500 }
    );
  }
}

// DELETE handler - Delete a planned mission by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Mission ID is required' }, { status: 400 });
    }

    // Check if user can delete this mission
    const canDelete = await plannedMissionStorage.canUserDeleteMission(userId, id);
    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this mission' },
        { status: 403 }
      );
    }

    const success = await plannedMissionStorage.deletePlannedMission(id);

    if (!success) {
      return NextResponse.json({ error: 'Planned mission not found' }, { status: 404 });
    }

    logger.info('Planned mission deleted successfully', { route: '/api/planned-missions/[id]', missionId: id });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Error deleting planned mission', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions/[id]' });
    return NextResponse.json(
      { error: 'Failed to delete planned mission' },
      { status: 500 }
    );
  }
}
