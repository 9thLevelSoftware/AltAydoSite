import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth';
import {
  getPlannedMissionById,
  updateConfirmedParticipants,
  canUserModifyMission
} from '@/lib/planned-mission-storage';
import { ConfirmedParticipant } from '@/types/PlannedMission';
import { logger } from '@/lib/logger';

// POST - Save confirmed participants (attendance)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const missionId = resolvedParams.id;
    const userId = (session.user as any).id;
    const userClearance = (session.user as any).clearanceLevel || 1;

    // Check if user can modify this mission
    const canModify = await canUserModifyMission(userId, missionId);
    if (!canModify && userClearance < 4) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this mission' },
        { status: 403 }
      );
    }

    const mission = await getPlannedMissionById(missionId);
    if (!mission) {
      return NextResponse.json(
        { error: 'Mission not found' },
        { status: 404 }
      );
    }

    // Only allow attendance marking for ACTIVE or DEBRIEFING missions
    if (!['ACTIVE', 'DEBRIEFING'].includes(mission.status)) {
      return NextResponse.json(
        { error: 'Attendance can only be marked for ACTIVE or DEBRIEFING missions' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { confirmedParticipants } = body as { confirmedParticipants: ConfirmedParticipant[] };

    if (!Array.isArray(confirmedParticipants)) {
      return NextResponse.json(
        { error: 'confirmedParticipants must be an array' },
        { status: 400 }
      );
    }

    // Update the confirmed participants
    const updatedMission = await updateConfirmedParticipants(missionId, confirmedParticipants);

    if (!updatedMission) {
      return NextResponse.json(
        { error: 'Failed to update attendance' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mission: updatedMission,
      confirmedCount: confirmedParticipants.length
    });
  } catch (error) {
    logger.error('Error saving attendance', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions/[id]/attendance' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get attendance info for a mission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const missionId = resolvedParams.id;

    const mission = await getPlannedMissionById(missionId);
    if (!mission) {
      return NextResponse.json(
        { error: 'Mission not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      expectedParticipants: mission.expectedParticipants,
      confirmedParticipants: mission.confirmedParticipants,
      expectedCount: mission.expectedParticipants.length,
      confirmedCount: mission.confirmedParticipants.length
    });
  } catch (error) {
    logger.error('Error getting attendance', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions/[id]/attendance' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
