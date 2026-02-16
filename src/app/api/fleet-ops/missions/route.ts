import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { MissionResponse, MissionStatus, MissionType } from '@/types/Mission';
import * as missionStorage from '@/lib/mission-storage';
import { isValidMissionTransition, getValidTransitions } from '@/lib/state-machines/mission-status';
import { logger } from '@/lib/logger';

// Validation schema for mission participant
const validateMissionParticipant = (participant: any) => {
  if (!participant.userId) return false;
  if (!participant.userName) return false;
  return true;
};

// Validation for mission data
const validateMissionData = (data: any) => {
  if (!data.name || typeof data.name !== 'string' || data.name.length < 3) {
    return { valid: false, error: 'Name must be at least 3 characters' };
  }

  // Get all valid mission types
  const validMissionTypes = ['Cargo Haul', 'Salvage Operation', 'Bounty Hunting', 
    'Exploration', 'Reconnaissance', 'Medical Support', 'Combat Patrol', 
    'Escort Duty', 'Mining Expedition'];
  
  if (!data.type || !validMissionTypes.includes(data.type)) {
    return { valid: false, error: 'Invalid mission type' };
  }

  if (!data.scheduledDateTime) {
    return { valid: false, error: 'Scheduled date and time is required' };
  }

  // Get all valid mission statuses
  const validMissionStatuses = ['Planning', 'Briefing', 'In Progress', 
    'Debriefing', 'Completed', 'Archived', 'Cancelled'];
  
  if (!data.status || !validMissionStatuses.includes(data.status)) {
    return { valid: false, error: 'Invalid mission status' };
  }

  // Validate participants if provided
  if (data.participants && Array.isArray(data.participants)) {
    for (const participant of data.participants) {
      if (!validateMissionParticipant(participant)) {
        return { valid: false, error: 'Invalid participant data' };
      }
    }
  }

  return { valid: true };
};

// GET handler - List missions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: { status?: string; leaderId?: string; userId?: string } = {};

    const status = searchParams.get('status');
    if (status) filters.status = status;

    const leaderId = searchParams.get('leaderId');
    if (leaderId) filters.leaderId = leaderId;

    logger.info('Fetching missions', { route: '/api/fleet-ops/missions', filters });

    // Get missions using the mission-storage module
    const missions = await missionStorage.getAllMissions(filters);

    logger.info('Returning missions', { route: '/api/fleet-ops/missions', count: missions.length });

    // Basic pagination at API layer (storage returns full list today)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '50', 10);
    const pageSize = Math.min(200, Math.max(1, pageSizeRaw));
    const start = (page - 1) * pageSize;
    const paged = missions.slice(start, start + pageSize);

    const res = NextResponse.json({
      items: paged,
      page,
      pageSize,
      total: missions.length,
      totalPages: Math.ceil(missions.length / pageSize) || 1,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;

  } catch (error) {
    logger.error('Error fetching missions', error instanceof Error ? error : new Error(String(error)), { route: '/api/fleet-ops/missions' });
    return NextResponse.json(
      { error: 'Failed to fetch missions' },
      { status: 500 }
    );
  }
}

// POST handler - Create a new mission
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const missionData = await request.json();

    // Basic validation
    if (!missionData || !missionData.name || !missionData.type || !missionData.scheduledDateTime) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, and scheduledDateTime are required' },
        { status: 400 }
      );
    }

    // If no ID is provided or ID starts with 'mission-', generate a new mission
    const hasValidId = missionData.id && !missionData.id.startsWith('mission-');

    try {
      // Create mission using the mission-storage module
      const mission = await missionStorage.createMission(missionData);
      logger.info('Mission created successfully', { route: '/api/fleet-ops/missions', missionId: mission.id });
      return NextResponse.json(mission, { status: 201 });
    } catch (storageError) {
      logger.error('Error in mission storage layer', storageError instanceof Error ? storageError : new Error(String(storageError)), { route: '/api/fleet-ops/missions', operation: 'create' });

      return NextResponse.json(
        { error: 'Failed to create mission' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error creating mission', error instanceof Error ? error : new Error(String(error)), { route: '/api/fleet-ops/missions' });

    return NextResponse.json(
      { error: 'Failed to create mission' },
      { status: 500 }
    );
  }
}

// PUT handler - Update an existing mission
export async function PUT(request: NextRequest) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const missionData = await request.json();

    // Basic validation
    if (!missionData || !missionData.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    try {
      // If status is being changed, validate the transition
      if (missionData.status) {
        const currentMission = await missionStorage.getMissionById(missionData.id);
        if (!currentMission) {
          return NextResponse.json(
            { error: `Mission not found with ID: ${missionData.id}` },
            { status: 404 }
          );
        }

        const currentStatus = currentMission.status;
        const newStatus = missionData.status as MissionStatus;

        // Only validate if status is actually changing
        if (currentStatus !== newStatus) {
          if (!isValidMissionTransition(currentStatus, newStatus)) {
            const validOptions = getValidTransitions(currentStatus);
            return NextResponse.json(
              { error: `Invalid status transition from "${currentStatus}" to "${newStatus}". Valid transitions: ${validOptions.join(', ') || 'none'}` },
              { status: 400 }
            );
          }
        }
      }

      // Update mission using the mission-storage module
      const mission = await missionStorage.updateMission(missionData.id, missionData);

      if (!mission) {
        return NextResponse.json(
          { error: `Mission not found with ID: ${missionData.id}` },
          { status: 404 }
        );
      }

      logger.info('Mission updated successfully', { route: '/api/fleet-ops/missions', missionId: mission.id });
      return NextResponse.json(mission, { status: 200 });
    } catch (storageError) {
      logger.error('Error in mission storage layer', storageError instanceof Error ? storageError : new Error(String(storageError)), { route: '/api/fleet-ops/missions', operation: 'update' });

      return NextResponse.json(
        { error: 'Failed to update mission' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error updating mission', error instanceof Error ? error : new Error(String(error)), { route: '/api/fleet-ops/missions' });

    return NextResponse.json(
      { error: 'Failed to update mission' },
      { status: 500 }
    );
  }
}

// DELETE handler - Delete a mission
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse mission ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Mission ID is required' }, { status: 400 });
    }

    logger.info('Deleting mission', { route: '/api/fleet-ops/missions', missionId: id });

    // Delete mission using the mission-storage module
    const success = await missionStorage.deleteMission(id);

    if (!success) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    logger.info('Mission deleted successfully', { route: '/api/fleet-ops/missions', missionId: id });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Error deleting mission', error instanceof Error ? error : new Error(String(error)), { route: '/api/fleet-ops/missions' });

    return NextResponse.json(
      { error: 'Failed to delete mission' },
      { status: 500 }
    );
  }
}
