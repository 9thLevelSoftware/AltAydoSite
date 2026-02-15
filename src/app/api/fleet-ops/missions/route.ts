import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { MissionResponse, MissionStatus, MissionType } from '@/types/Mission';
import * as missionStorage from '@/lib/mission-storage';

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

    console.log('Fetching missions with filters:', filters);

    // Get missions using the mission-storage module
    const missions = await missionStorage.getAllMissions(filters);

    console.log(`Returning ${missions.length} missions`);

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
    console.error('Error fetching missions:', error);
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
      console.log('Mission created successfully:', mission.id);
      return NextResponse.json(mission, { status: 201 });
    } catch (storageError) {
      console.error('Error in mission storage layer:', storageError);

      return NextResponse.json(
        { error: 'Failed to create mission' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating mission:', error);

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
      // Update mission using the mission-storage module
      const mission = await missionStorage.updateMission(missionData.id, missionData);

      if (!mission) {
        return NextResponse.json(
          { error: `Mission not found with ID: ${missionData.id}` },
          { status: 404 }
        );
      }

      console.log('Mission updated successfully:', mission.id);
      return NextResponse.json(mission, { status: 200 });
    } catch (storageError) {
      console.error('Error in mission storage layer:', storageError);

      return NextResponse.json(
        { error: 'Failed to update mission' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating mission:', error);

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

    console.log('Deleting mission:', id);

    // Delete mission using the mission-storage module
    const success = await missionStorage.deleteMission(id);

    if (!success) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    console.log('Mission deleted successfully:', id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting mission:', error);

    return NextResponse.json(
      { error: 'Failed to delete mission' },
      { status: 500 }
    );
  }
}
