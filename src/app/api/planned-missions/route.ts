import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import {
  ACTIVITIES,
  ActivityType,
  OPERATION_TYPES,
  OperationType,
  PERSONNEL_PROFESSIONS,
  SHIP_CATEGORIES,
  SHIP_SIZES,
} from '@/types/MissionPlanning';
import { PlannedMissionStatus } from '@/types/PlannedMission';
import * as plannedMissionStorage from '@/lib/planned-mission-storage';
import { getDiscordService } from '@/lib/discord';
import { buildEventDescription } from '@/lib/discord-event-description';
import { getDiscordEventImageForMission } from '@/lib/discord-event-image';
import { logger } from '@/lib/logger';

const MISSION_ADMIN_CLEARANCE_LEVEL = 4;

// Fields a client is allowed to author on create/update. Status, attendance
// (expected/confirmed participants) and Discord state are deliberately excluded:
// they are system-derived and mutated only via their dedicated endpoints
// (`/[id]/status`, `/[id]/attendance`, `/[id]/discord`).
const MUTABLE_MISSION_FIELDS = [
  'name',
  'scheduledDateTime',
  'duration',
  'location',
  'operationType',
  'primaryActivity',
  'secondaryActivity',
  'tertiaryActivity',
  'leaders',
  'shipRequirements',
  'personnelRequirements',
  'ships',
  'objectives',
  'briefing',
  'equipmentNotes',
  'images',
] as const;

// Pick only whitelisted, supplied fields from a raw request body. A field that
// is present but null (e.g. clearing secondaryActivity) is preserved; only
// `undefined` keys are dropped so partial updates stay partial.
function pickMutableMissionFields(data: any): any {
  const result: Record<string, any> = {};
  if (!data || typeof data !== 'object') return result;
  for (const key of MUTABLE_MISSION_FIELDS) {
    if (data[key] !== undefined) {
      result[key] = data[key];
    }
  }
  return result;
}

// Parse an integer query param with a NaN-safe fallback and inclusive clamping.
function parseIntParam(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

// Auto-publish mission to Discord
async function autoPublishToDiscord(
  mission: any,
  baseUrl?: string
): Promise<{ success: boolean; discordEvent?: any; error?: string }> {
  try {
    const discord = getDiscordService();
    if (!discord.isConfigured()) {
      logger.info('Discord not configured, skipping auto-publish', {
        route: '/api/planned-missions',
        missionId: mission.id,
      });
      return { success: false, error: 'Discord not configured' };
    }

    const description = buildEventDescription(mission, baseUrl);
    const image = await getDiscordEventImageForMission(mission);

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
      location: mission.location || 'Star Citizen',
      image,
    });

    // Update mission with Discord event reference
    await plannedMissionStorage.updatePlannedMission(mission.id, {
      discordEvent: {
        eventId: discordEvent.id,
        guildId: discordEvent.guild_id,
        createdAt: new Date().toISOString(),
        status: 'SCHEDULED',
      },
    });

    logger.info('Auto-published mission to Discord', {
      route: '/api/planned-missions',
      missionId: mission.id,
      discordEventId: discordEvent.id,
    });
    return { success: true, discordEvent };
  } catch (error) {
    logger.error(
      'Failed to auto-publish to Discord',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions', missionId: mission.id }
    );
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

const validateShipRequirements = (requirements: any[]) => {
  if (!Array.isArray(requirements)) return false;

  for (const requirement of requirements) {
    if (!requirement || typeof requirement !== 'object') return false;
    if (!SHIP_SIZES.includes(requirement.size)) return false;
    if (!SHIP_CATEGORIES.includes(requirement.category)) return false;
    if (typeof requirement.count !== 'number' || requirement.count < 1 || requirement.count > 20)
      return false;
  }

  return true;
};

const validatePersonnelRequirements = (requirements: any[]) => {
  if (!Array.isArray(requirements)) return false;

  for (const requirement of requirements) {
    if (!requirement || typeof requirement !== 'object') return false;
    if (!PERSONNEL_PROFESSIONS.includes(requirement.profession)) return false;
    if (typeof requirement.count !== 'number' || requirement.count < 1 || requirement.count > 50)
      return false;
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

  const validOperationTypes: OperationType[] = OPERATION_TYPES;
  if (!validOperationTypes.includes(data.operationType)) {
    return { valid: false, error: 'Invalid operation type' };
  }

  if (!data.primaryActivity) {
    return { valid: false, error: 'Primary activity is required' };
  }

  const validActivities: ActivityType[] = ACTIVITIES;
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

  if (data.shipRequirements && !validateShipRequirements(data.shipRequirements)) {
    return { valid: false, error: 'Invalid ship requirements data' };
  }

  if (data.personnelRequirements && !validatePersonnelRequirements(data.personnelRequirements)) {
    return { valid: false, error: 'Invalid personnel requirements data' };
  }

  // Validate status if provided
  const validStatuses: PlannedMissionStatus[] = [
    'DRAFT',
    'SCHEDULED',
    'ACTIVE',
    'DEBRIEFING',
    'COMPLETED',
    'CANCELLED',
  ];
  if (data.status && !validStatuses.includes(data.status)) {
    return { valid: false, error: 'Invalid status' };
  }

  return { valid: true };
};

// Partial-update validation: only validates fields that are actually supplied.
// This avoids the full validator's all-or-nothing requirement (which both
// rejected legitimate single-field edits and skipped validation unless a core
// field was present). Status/attendance/Discord state are not validated here
// because they are not mutable via this route.
const validatePartialMissionUpdate = (data: any) => {
  const validActivities: ActivityType[] = ACTIVITIES;
  const validOperationTypes: OperationType[] = OPERATION_TYPES;

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.length < 3) {
      return { valid: false, error: 'Name must be at least 3 characters' };
    }
  }

  if (data.scheduledDateTime !== undefined) {
    const scheduledDate = new Date(data.scheduledDateTime);
    if (!data.scheduledDateTime || isNaN(scheduledDate.getTime())) {
      return { valid: false, error: 'Invalid scheduled date/time format' };
    }
  }

  if (data.operationType !== undefined && !validOperationTypes.includes(data.operationType)) {
    return { valid: false, error: 'Invalid operation type' };
  }

  if (data.primaryActivity !== undefined && !validActivities.includes(data.primaryActivity)) {
    return { valid: false, error: 'Invalid primary activity' };
  }

  // Activities may be cleared with null; only validate concrete values.
  if (data.secondaryActivity != null && !validActivities.includes(data.secondaryActivity)) {
    return { valid: false, error: 'Invalid secondary activity' };
  }
  if (data.tertiaryActivity != null && !validActivities.includes(data.tertiaryActivity)) {
    return { valid: false, error: 'Invalid tertiary activity' };
  }

  if (data.leaders !== undefined && !validateLeaders(data.leaders)) {
    return { valid: false, error: 'Invalid leaders data' };
  }

  if (data.ships !== undefined && !validateMissionShips(data.ships)) {
    return { valid: false, error: 'Invalid ships data' };
  }

  if (data.shipRequirements !== undefined && !validateShipRequirements(data.shipRequirements)) {
    return { valid: false, error: 'Invalid ship requirements data' };
  }

  if (
    data.personnelRequirements !== undefined &&
    !validatePersonnelRequirements(data.personnelRequirements)
  ) {
    return { valid: false, error: 'Invalid personnel requirements data' };
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
      const limit = parseIntParam(searchParams.get('limit'), 10, 1, 100);
      const missions = await plannedMissionStorage.getUpcomingPlannedMissions(limit);
      const res = NextResponse.json({ items: missions, total: missions.length });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // Pagination params (NaN-safe, clamped to sane bounds)
    const page = parseIntParam(searchParams.get('page'), 1, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = parseIntParam(searchParams.get('pageSize'), 25, 1, 100);

    logger.info('Fetching planned missions', {
      route: '/api/planned-missions',
      filters,
      page,
      pageSize,
    });

    // DB-level pagination via skip/limit
    const result = await plannedMissionStorage.getAllPlannedMissionsPaginated(
      page,
      pageSize,
      filters
    );

    logger.info('Returning planned missions', {
      route: '/api/planned-missions',
      count: result.missions.length,
      total: result.total,
      page,
    });

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
    logger.error(
      'Error fetching planned missions',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions' }
    );
    return NextResponse.json({ error: 'Failed to fetch planned missions' }, { status: 500 });
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
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Whitelist the fields a client may author rather than spreading the whole
    // body. This drops read-only metadata (id/_id/createdBy/createdAt/updatedAt)
    // and, critically, any client-seeded Discord/attendance state.
    const allowedData = pickMutableMissionFields(missionData);

    // Set defaults. System-derived state is forced server-side here:
    // - status defaults to DRAFT (a SCHEDULED create still auto-publishes below)
    // - expected/confirmed participants always start empty (attendance endpoint owns them)
    // - discordEvent is never accepted from the client (set by autoPublishToDiscord)
    const missionToCreate = {
      ...allowedData,
      createdBy: userId,
      status: missionData.status || 'DRAFT',
      leaders: allowedData.leaders ?? [],
      shipRequirements: allowedData.shipRequirements ?? [],
      personnelRequirements: allowedData.personnelRequirements ?? [],
      ships: allowedData.ships ?? [],
      images: allowedData.images ?? [],
      objectives: allowedData.objectives ?? '',
      briefing: allowedData.briefing ?? '',
      expectedParticipants: [],
      confirmedParticipants: [],
    };

    try {
      // Required create fields are guaranteed by validatePlannedMissionData above.
      const mission = await plannedMissionStorage.createPlannedMission(missionToCreate);
      logger.info('Planned mission created successfully', {
        route: '/api/planned-missions',
        missionId: mission.id,
      });

      // Auto-publish to Discord if status is SCHEDULED
      let discordPublishResult: { success: boolean; discordEvent?: any; error?: string } | null =
        null;
      if (mission.status === 'SCHEDULED' && !mission.discordEvent) {
        const baseUrl = request.headers.get('origin') || process.env.NEXTAUTH_URL || '';
        discordPublishResult = await autoPublishToDiscord(mission, baseUrl);
      }

      // Re-fetch mission if Discord event was added
      const finalMission = discordPublishResult?.success
        ? (await plannedMissionStorage.getPlannedMissionById(mission.id)) || mission
        : mission;

      return NextResponse.json(
        {
          ...finalMission,
          discordPublished: discordPublishResult?.success || false,
          discordError: discordPublishResult?.error,
        },
        { status: 201 }
      );
    } catch (storageError) {
      logger.error(
        'Error in planned mission storage layer',
        storageError instanceof Error ? storageError : new Error(String(storageError)),
        { route: '/api/planned-missions', operation: 'create' }
      );
      return NextResponse.json({ error: 'Failed to create planned mission' }, { status: 500 });
    }
  } catch (error) {
    logger.error(
      'Error creating planned mission',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions' }
    );
    return NextResponse.json({ error: 'Failed to create planned mission' }, { status: 500 });
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
    const userClearance = session.user.clearanceLevel ?? 1;
    const missionData = await request.json();

    if (!missionData || !missionData.id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    // Check if user can modify this mission
    const canModify = await plannedMissionStorage.canUserModifyMission(userId, missionData.id);
    if (!canModify && userClearance < MISSION_ADMIN_CLEARANCE_LEVEL) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this mission' },
        { status: 403 }
      );
    }

    // Validate only the fields that were actually supplied.
    const validation = validatePartialMissionUpdate(missionData);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Whitelist mutable fields. Status, attendance (expected/confirmed
    // participants) and Discord state are intentionally excluded — those are
    // changed only via the dedicated `/[id]/status`, `/[id]/attendance` and
    // `/[id]/discord` endpoints, so any such values in this body are ignored.
    const updateData = pickMutableMissionFields(missionData);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    try {
      const mission = await plannedMissionStorage.updatePlannedMission(missionData.id, updateData);

      if (!mission) {
        return NextResponse.json(
          { error: `Planned mission not found with ID: ${missionData.id}` },
          { status: 404 }
        );
      }

      logger.info('Planned mission updated successfully', {
        route: '/api/planned-missions',
        missionId: mission.id,
      });
      return NextResponse.json(mission, { status: 200 });
    } catch (storageError) {
      logger.error(
        'Error in planned mission storage layer',
        storageError instanceof Error ? storageError : new Error(String(storageError)),
        { route: '/api/planned-missions', operation: 'update' }
      );
      return NextResponse.json({ error: 'Failed to update planned mission' }, { status: 500 });
    }
  } catch (error) {
    logger.error(
      'Error updating planned mission',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions' }
    );
    return NextResponse.json({ error: 'Failed to update planned mission' }, { status: 500 });
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
    const userClearance = session.user.clearanceLevel ?? 1;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Planned mission ID is required' }, { status: 400 });
    }

    // Check if user can delete this mission
    const canDelete = await plannedMissionStorage.canUserDeleteMission(userId, id);
    if (!canDelete && userClearance < MISSION_ADMIN_CLEARANCE_LEVEL) {
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

    logger.info('Planned mission deleted successfully', {
      route: '/api/planned-missions',
      missionId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      'Error deleting planned mission',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions' }
    );
    return NextResponse.json({ error: 'Failed to delete planned mission' }, { status: 500 });
  }
}
