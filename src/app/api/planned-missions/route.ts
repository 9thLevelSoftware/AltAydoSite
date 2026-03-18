import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { ActivityType, OperationType } from '@/types/MissionTemplate';
import { PlannedMissionStatus } from '@/types/PlannedMission';
import * as plannedMissionStorage from '@/lib/planned-mission-storage';
import { getDiscordService } from '@/lib/discord';
import { buildEventDescription } from '@/lib/discord-event-description';
import { logger } from '@/lib/logger';

// Auto-publish mission to Discord
async function autoPublishToDiscord(mission: any, baseUrl?: string): Promise<{ success: boolean; discordEvent?: any; error?: string }> {
  try {
    const discord = getDiscordService();
    if (!discord.isConfigured()) {
      logger.info('Discord not configured, skipping auto-publish', { route: '/api/planned-missions', missionId: mission.id });
      return { success: false, error: 'Discord not configured' };
    }

    const description = buildEventDescription(mission, baseUrl);

    let endTime: string | undefined;
    if (mission.duration) {
      const startDate = new Date(mission.scheduledDateTime);
      const endDate = new Date(startDate.getTime() + mission.duration * 60 * 1000);
      endTime = endDate.toISOString();
    }

    const discordEvent = await discord.createScheduledEvent({
      name: mission.name,
      description,
      scheduledStartTime: mission.scheduledDateTime,
      scheduledEndTime: endTime,
      location: mission.location || 'Star Citizen'
    });

    // Update mission with Discord event reference
    await plannedMissionStorage.updatePlannedMission(mission.id, {
      discordEvent: {
        eventId: discordEvent.id,
        guildId: discordEvent.guild_id,
        createdAt: new Date().toISOString(),
        status: 'SCHEDULED'
      }
    });

    logger.info('Auto-published mission to Discord', { route: '/api/planned-missions', missionId: mission.id, discordEventId: discordEvent.id });
    return { success: true, discordEvent };
  } catch (error) {
    logger.error('Failed to auto-publish to Discord', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions', missionId: mission.id });
    return { success: false, error: 'Failed to publish to Discord' };
  }
}

// Validation for mission ships (actual ships from compendium)
const validateMissionShips = (ships: any[]) => {
  if (!Array.isArray(ships)) return false;

  for (const ship of ships) {
    if (!ship.shipName || typeof ship.shipName !== 'string') return false;
    if (!ship.manufacturer || typeof ship.manufacturer !== 'string') return false;
    if (typeof ship.quantity !== 'number' || ship.quantity < 1) return false;
    if (!ship.fleetyardsId || typeof ship.fleetyardsId !== 'string') return false;
  }

  return true;
};

// Validation for leaders
const validateLeaders = (leaders: any[]) => {
  if (!Array.isArray(leaders)) return false;

  for (const leader of leaders) {
    if (!leader.userId || typeof leader.userId !== 'string') return false;
    if (!leader.aydoHandle || typeof leader.aydoHandle !== 'string') return false;
    if (!leader.role || typeof leader.role !== 'string') return false;
  }

  return true;
};

// Validation for planned mission data
const validatePlannedMissionData = (data: any) => {
  if (!data.name || typeof data.name !== 'string' || data.name.length < 3) {
    return { valid: false, error: 'Name must be at least 3 characters' };
  }

  if (!data.scheduledDateTime) {
    return { valid: false, error: 'Scheduled date/time is required' };
  }

  // Validate date format
  const scheduledDate = new Date(data.scheduledDateTime);
  if (isNaN(scheduledDate.getTime())) {
    return { valid: false, error: 'Invalid scheduled date/time format' };
  }

  if (!data.operationType) {
    return { valid: false, error: 'Operation type is required' };
  }

  const validOperationTypes: OperationType[] = ['Ground Operations', 'Space Operations'];
  if (!validOperationTypes.includes(data.operationType)) {
    return { valid: false, error: 'Invalid operation type' };
  }

  if (!data.primaryActivity) {
    return { valid: false, error: 'Primary activity is required' };
  }

  const validActivities: ActivityType[] = ['Mining', 'Salvage', 'Escort', 'Transport', 'Medical', 'Combat'];
  if (!validActivities.includes(data.primaryActivity)) {
    return { valid: false, error: 'Invalid primary activity' };
  }

  // Validate secondary/tertiary activities if provided
  if (data.secondaryActivity && !validActivities.includes(data.secondaryActivity)) {
    return { valid: false, error: 'Invalid secondary activity' };
  }
  if (data.tertiaryActivity && !validActivities.includes(data.tertiaryActivity)) {
    return { valid: false, error: 'Invalid tertiary activity' };
  }

  // Validate leaders if provided
  if (data.leaders && !validateLeaders(data.leaders)) {
    return { valid: false, error: 'Invalid leaders data' };
  }

  // Validate ships if provided
  if (data.ships && !validateMissionShips(data.ships)) {
    return { valid: false, error: 'Invalid ships data' };
  }

  // Validate status if provided
  const validStatuses: PlannedMissionStatus[] = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'DEBRIEFING', 'COMPLETED', 'CANCELLED'];
  if (data.status && !validStatuses.includes(data.status)) {
    return { valid: false, error: 'Invalid status' };
  }

  return { valid: true };
};

// GET handler - List planned missions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: {
      createdBy?: string;
      status?: PlannedMissionStatus;
      operationType?: string;
      primaryActivity?: string;
      fromDate?: string;
      toDate?: string;
    } = {};

    const createdBy = searchParams.get('createdBy');
    if (createdBy) filters.createdBy = createdBy;

    const status = searchParams.get('status');
    if (status) filters.status = status as PlannedMissionStatus;

    const operationType = searchParams.get('operationType');
    if (operationType) filters.operationType = operationType;

    const primaryActivity = searchParams.get('primaryActivity');
    if (primaryActivity) filters.primaryActivity = primaryActivity;

    const fromDate = searchParams.get('fromDate');
    if (fromDate) filters.fromDate = fromDate;

    const toDate = searchParams.get('toDate');
    if (toDate) filters.toDate = toDate;

    // Check for upcoming only
    const upcoming = searchParams.get('upcoming');
    if (upcoming === 'true') {
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const missions = await plannedMissionStorage.getUpcomingPlannedMissions(limit);
      const res = NextResponse.json({ items: missions, total: missions.length });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '25', 10);
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw));

    logger.info('Fetching planned missions', { route: '/api/planned-missions', filters, page, pageSize });

    // DB-level pagination via skip/limit
    const result = await plannedMissionStorage.getAllPlannedMissionsPaginated(page, pageSize, filters);

    logger.info('Returning planned missions', { route: '/api/planned-missions', count: result.missions.length, total: result.total, page });

    const res = NextResponse.json({
      items: result.missions,
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize) || 1,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;

  } catch (error) {
    logger.error('Error fetching planned missions', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions' });
    return NextResponse.json(
      { error: 'Failed to fetch planned missions' },
      { status: 500 }
    );
  }
}

// POST handler - Create a new planned mission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check clearance level (3+ required for creating missions)
    const userClearance = (session.user as any).clearanceLevel || 1;
    if (userClearance < 3) {
      return NextResponse.json(
        { error: 'Insufficient clearance level. Level 3+ required to create missions.' },
        { status: 403 }
      );
    }

    const missionData = await request.json();

    // Validate data
    const validation = validatePlannedMissionData(missionData);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Set defaults
    const missionToCreate = {
      ...missionData,
      createdBy: userId,
      status: missionData.status || 'DRAFT',
      leaders: missionData.leaders || [],
      ships: missionData.ships || [],
      images: missionData.images || [],
      objectives: missionData.objectives || '',
      briefing: missionData.briefing || '',
      expectedParticipants: missionData.expectedParticipants || [],
      confirmedParticipants: missionData.confirmedParticipants || []
    };

    try {
      const mission = await plannedMissionStorage.createPlannedMission(missionToCreate);
      logger.info('Planned mission created successfully', { route: '/api/planned-missions', missionId: mission.id });

      // Auto-publish to Discord if status is SCHEDULED
      let discordPublishResult: { success: boolean; discordEvent?: any; error?: string } | null = null;
      if (mission.status === 'SCHEDULED' && !mission.discordEvent) {
        const baseUrl = request.headers.get('origin') || process.env.NEXTAUTH_URL || '';
        discordPublishResult = await autoPublishToDiscord(mission, baseUrl);
      }

      // Re-fetch mission if Discord event was added
      const finalMission = discordPublishResult?.success
        ? await plannedMissionStorage.getPlannedMissionById(mission.id) || mission
        : mission;

      return NextResponse.json({
        ...finalMission,
        discordPublished: discordPublishResult?.success || false,
        discordError: discordPublishResult?.error
      }, { status: 201 });
    } catch (storageError) {
      logger.error('Error in planned mission storage layer', storageError instanceof Error ? storageError : new Error(String(storageError)), { route: '/api/planned-missions', operation: 'create' });
      return NextResponse.json(
        { error: 'Failed to create planned mission' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error creating planned mission', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions' });
    return NextResponse.json(
      { error: 'Failed to create planned mission' },
      { status: 500 }
    );
  }
}

// PUT handler - Update an existing planned mission
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const missionData = await request.json();

    if (!missionData || !missionData.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Check if user can modify this mission
    const canModify = await plannedMissionStorage.canUserModifyMission(userId, missionData.id);
    if (!canModify) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this mission' },
        { status: 403 }
      );
    }

    // Get existing mission to check for status change
    const existingMission = await plannedMissionStorage.getPlannedMissionById(missionData.id);

    // Validate if updating core fields
    if (missionData.name || missionData.scheduledDateTime || missionData.operationType || missionData.primaryActivity) {
      const validation = validatePlannedMissionData(missionData);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    try {
      const mission = await plannedMissionStorage.updatePlannedMission(missionData.id, missionData);

      if (!mission) {
        return NextResponse.json(
          { error: `Planned mission not found with ID: ${missionData.id}` },
          { status: 404 }
        );
      }

      // Auto-publish to Discord if status changed to SCHEDULED and no Discord event yet
      let discordPublishResult: { success: boolean; discordEvent?: any; error?: string } | null = null;
      const statusChangedToScheduled = missionData.status === 'SCHEDULED' &&
        existingMission?.status !== 'SCHEDULED' &&
        !existingMission?.discordEvent;

      if (statusChangedToScheduled) {
        const baseUrl = request.headers.get('origin') || process.env.NEXTAUTH_URL || '';
        discordPublishResult = await autoPublishToDiscord(mission, baseUrl);
      }

      // Re-fetch mission if Discord event was added
      const finalMission = discordPublishResult?.success
        ? await plannedMissionStorage.getPlannedMissionById(mission.id) || mission
        : mission;

      logger.info('Planned mission updated successfully', { route: '/api/planned-missions', missionId: mission.id });
      return NextResponse.json({
        ...finalMission,
        discordPublished: discordPublishResult?.success || false,
        discordError: discordPublishResult?.error
      }, { status: 200 });
    } catch (storageError) {
      logger.error('Error in planned mission storage layer', storageError instanceof Error ? storageError : new Error(String(storageError)), { route: '/api/planned-missions', operation: 'update' });
      return NextResponse.json(
        { error: 'Failed to update planned mission' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error updating planned mission', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions' });
    return NextResponse.json(
      { error: 'Failed to update planned mission' },
      { status: 500 }
    );
  }
}

// DELETE handler - Delete a planned mission
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Planned mission ID is required' }, { status: 400 });
    }

    // Check if user can delete this mission
    const canDelete = await plannedMissionStorage.canUserDeleteMission(userId, id);
    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this mission' },
        { status: 403 }
      );
    }

    logger.info('Deleting planned mission', { route: '/api/planned-missions', missionId: id });

    const success = await plannedMissionStorage.deletePlannedMission(id);

    if (!success) {
      return NextResponse.json({ error: 'Planned mission not found' }, { status: 404 });
    }

    logger.info('Planned mission deleted successfully', { route: '/api/planned-missions', missionId: id });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Error deleting planned mission', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions' });
    return NextResponse.json(
      { error: 'Failed to delete planned mission' },
      { status: 500 }
    );
  }
}
