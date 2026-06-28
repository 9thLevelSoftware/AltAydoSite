import { NextRequest, NextResponse } from 'next/server';
import { MissionStatus } from '@/types/Mission';
import * as missionStorage from '@/lib/mission-storage';
import { isValidMissionTransition, getValidTransitions } from '@/lib/state-machines/mission-status';
import { requireAuth, requireLeadership } from '@/lib/auth-guards';
import { StaleDocumentError } from '@/lib/storage-errors';
import { logger } from '@/lib/logger';

const LEADERSHIP_ROLES = ['Director', 'Manager', 'Board Member'];

// Fields a client is permitted to mutate on an existing mission.
const MUTABLE_MISSION_FIELDS = [
  'name',
  'type',
  'scheduledDateTime',
  'status',
  'briefSummary',
  'details',
  'location',
  'leaderId',
  'leaderName',
  'images',
  'participants',
] as const;

// True when the actor has a leadership role or clearance level 3+.
const hasLeadership = (auth: { role: string; clearanceLevel: number }): boolean =>
  LEADERSHIP_ROLES.includes(auth.role) || auth.clearanceLevel >= 3;

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
  const validMissionTypes = [
    'Cargo Haul',
    'Salvage Operation',
    'Bounty Hunting',
    'Exploration',
    'Reconnaissance',
    'Medical Support',
    'Combat Patrol',
    'Escort Duty',
    'Mining Expedition',
  ];

  if (!data.type || !validMissionTypes.includes(data.type)) {
    return { valid: false, error: 'Invalid mission type' };
  }

  if (!data.scheduledDateTime) {
    return { valid: false, error: 'Scheduled date and time is required' };
  }

  // Get all valid mission statuses
  const validMissionStatuses = [
    'Planning',
    'Briefing',
    'In Progress',
    'Debriefing',
    'Completed',
    'Archived',
    'Cancelled',
  ];

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
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const userId = auth.userId;
    // Leadership users see all missions; everyone else is scoped to their own.
    const isLeadership = hasLeadership(auth);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: { status?: string; leaderId?: string; userId?: string } = {};

    const status = searchParams.get('status');
    if (status) filters.status = status;

    // Only leadership may filter by an arbitrary leaderId; ignore it otherwise.
    const leaderId = searchParams.get('leaderId');
    if (leaderId && isLeadership) filters.leaderId = leaderId;

    // Non-leadership callers are restricted to missions they lead or participate in.
    if (!isLeadership) {
      filters.userId = userId;
    }

    logger.info('Fetching missions', { route: '/api/fleet-ops/missions', filters });

    // Get missions using the mission-storage module
    const missions = await missionStorage.getAllMissions(filters);

    logger.info('Returning missions', { route: '/api/fleet-ops/missions', count: missions.length });

    // Basic pagination at API layer (storage returns full list today)
    const pageRaw = parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '50', 10);
    const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(200, Math.max(1, pageSizeRaw)) : 50;
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
    logger.error(
      'Error fetching missions',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/missions' }
    );
    return NextResponse.json({ error: 'Failed to fetch missions' }, { status: 500 });
  }
}

// POST handler - Create a new mission
export async function POST(request: NextRequest) {
  try {
    // Only leadership (role or clearance 3+) may create missions.
    const auth = await requireLeadership();
    if (auth instanceof NextResponse) return auth;

    // Parse request body
    const missionData = await request.json();

    // Validate the full mission payload.
    const v = validateMissionData(missionData);
    if (!v.valid) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    try {
      // Create mission using the mission-storage module
      const mission = await missionStorage.createMission(missionData);
      logger.info('Mission created successfully', {
        route: '/api/fleet-ops/missions',
        missionId: mission.id,
      });
      return NextResponse.json(mission, { status: 201 });
    } catch (storageError) {
      logger.error(
        'Error in mission storage layer',
        storageError instanceof Error ? storageError : new Error(String(storageError)),
        { route: '/api/fleet-ops/missions', operation: 'create' }
      );

      return NextResponse.json({ error: 'Failed to create mission' }, { status: 500 });
    }
  } catch (error) {
    logger.error(
      'Error creating mission',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/missions' }
    );

    return NextResponse.json({ error: 'Failed to create mission' }, { status: 500 });
  }
}

// PUT handler - Update an existing mission
export async function PUT(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const userId = auth.userId;
    const isLeadership = hasLeadership(auth);

    // Parse request body
    const missionData = await request.json();

    // Basic validation
    if (!missionData || !missionData.id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    // Load the existing mission so we can authorize and validate against it.
    const currentMission = await missionStorage.getMissionById(missionData.id);
    if (!currentMission) {
      return NextResponse.json(
        { error: `Mission not found with ID: ${missionData.id}` },
        { status: 404 }
      );
    }

    // Only the mission leader or leadership may update a mission.
    if (currentMission.leaderId !== userId && !isLeadership) {
      return NextResponse.json(
        { error: 'You do not have permission to update this mission' },
        { status: 403 }
      );
    }

    try {
      // If status is being changed, validate the transition
      if (missionData.status) {
        const currentStatus = currentMission.status;
        const newStatus = missionData.status as MissionStatus;

        // Only validate if status is actually changing
        if (currentStatus !== newStatus) {
          if (!isValidMissionTransition(currentStatus, newStatus)) {
            const validOptions = getValidTransitions(currentStatus);
            return NextResponse.json(
              {
                error: `Invalid status transition from "${currentStatus}" to "${newStatus}". Valid transitions: ${validOptions.join(', ') || 'none'}`,
              },
              { status: 400 }
            );
          }
        }
      }

      // Whitelist mutable fields from the request body.
      const updateFields: Record<string, unknown> = {};
      for (const key of MUTABLE_MISSION_FIELDS) {
        if (missionData[key] !== undefined) {
          updateFields[key] = missionData[key];
        }
      }

      // Validate the resulting (merged) mission to ensure required fields remain valid.
      const merged = { ...currentMission, ...updateFields };
      const v = validateMissionData(merged);
      if (!v.valid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }

      // Optimistic locking: pass through expectedVersion when supplied.
      const expectedVersion =
        typeof missionData.expectedVersion === 'number' ? missionData.expectedVersion : undefined;

      // Update mission using the mission-storage module
      const mission = await missionStorage.updateMission(
        missionData.id,
        updateFields,
        expectedVersion
      );

      if (!mission) {
        return NextResponse.json(
          { error: `Mission not found with ID: ${missionData.id}` },
          { status: 404 }
        );
      }

      logger.info('Mission updated successfully', {
        route: '/api/fleet-ops/missions',
        missionId: mission.id,
      });
      return NextResponse.json(mission, { status: 200 });
    } catch (storageError) {
      if (storageError instanceof StaleDocumentError) {
        return NextResponse.json({ error: storageError.message }, { status: 409 });
      }

      logger.error(
        'Error in mission storage layer',
        storageError instanceof Error ? storageError : new Error(String(storageError)),
        { route: '/api/fleet-ops/missions', operation: 'update' }
      );

      return NextResponse.json({ error: 'Failed to update mission' }, { status: 500 });
    }
  } catch (error) {
    logger.error(
      'Error updating mission',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/missions' }
    );

    return NextResponse.json({ error: 'Failed to update mission' }, { status: 500 });
  }
}

// DELETE handler - Delete a mission
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const userId = auth.userId;
    const isLeadership = hasLeadership(auth);

    // Parse mission ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Mission ID is required' }, { status: 400 });
    }

    // Load the mission to enforce ownership/leadership before deleting.
    const existingMission = await missionStorage.getMissionById(id);
    if (!existingMission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    if (existingMission.leaderId !== userId && !isLeadership) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this mission' },
        { status: 403 }
      );
    }

    logger.info('Deleting mission', { route: '/api/fleet-ops/missions', missionId: id });

    // Delete mission using the mission-storage module
    const success = await missionStorage.deleteMission(id);

    if (!success) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    logger.info('Mission deleted successfully', {
      route: '/api/fleet-ops/missions',
      missionId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      'Error deleting mission',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/missions' }
    );

    return NextResponse.json({ error: 'Failed to delete mission' }, { status: 500 });
  }
}
