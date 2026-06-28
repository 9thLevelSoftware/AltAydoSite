import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import {
  ACTIVITIES,
  OPERATION_TYPES,
  PERSONNEL_PROFESSIONS,
  SHIP_CATEGORIES,
  SHIP_SIZES,
} from '@/types/MissionPlanning';
import * as plannedMissionStorage from '@/lib/planned-mission-storage';
import { logger } from '@/lib/logger';

const MISSION_ADMIN_CLEARANCE_LEVEL = 4;

// Fields a client may set/clear through this generic update endpoint.
// Anything outside this list is either managed by the server or owned by a
// dedicated endpoint (see PROTECTED_FIELDS below).
const MUTABLE_FIELDS = [
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
  'creatorName',
] as const;

// Fields that have their own dedicated endpoints. Changing these through the
// generic PUT would bypass status-transition rules, attendance gating, and
// Discord sync, so they are rejected here and routed to those endpoints.
const PROTECTED_FIELD_ENDPOINTS: Record<string, string> = {
  status: '/api/planned-missions/[id]/status',
  expectedParticipants: '/api/planned-missions/[id]/attendance',
  confirmedParticipants: '/api/planned-missions/[id]/attendance',
  discordEvent: '/api/planned-missions/[id]/discord',
};

// Shared partial validators for the mutable subset of a planned mission.
// Each validator only runs when the field is present in the request body.
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const validateLeaders = (leaders: unknown): boolean => {
  if (!Array.isArray(leaders)) return false;
  return leaders.every(
    (leader) =>
      leader &&
      typeof leader === 'object' &&
      isNonEmptyString((leader as Record<string, unknown>).userId) &&
      isNonEmptyString((leader as Record<string, unknown>).aydoHandle) &&
      isNonEmptyString((leader as Record<string, unknown>).role)
  );
};

const validateShipRequirements = (requirements: unknown): boolean => {
  if (!Array.isArray(requirements)) return false;
  return requirements.every((requirement) => {
    if (!requirement || typeof requirement !== 'object') return false;
    const r = requirement as Record<string, unknown>;
    if (!SHIP_SIZES.includes(r.size as never)) return false;
    if (!SHIP_CATEGORIES.includes(r.category as never)) return false;
    return typeof r.count === 'number' && r.count >= 1 && r.count <= 20;
  });
};

const validatePersonnelRequirements = (requirements: unknown): boolean => {
  if (!Array.isArray(requirements)) return false;
  return requirements.every((requirement) => {
    if (!requirement || typeof requirement !== 'object') return false;
    const r = requirement as Record<string, unknown>;
    if (!PERSONNEL_PROFESSIONS.includes(r.profession as never)) return false;
    return typeof r.count === 'number' && r.count >= 1 && r.count <= 50;
  });
};

const validateMissionShips = (ships: unknown): boolean => {
  if (!Array.isArray(ships)) return false;
  return ships.every((ship) => {
    if (!ship || typeof ship !== 'object') return false;
    const s = ship as Record<string, unknown>;
    if (!isNonEmptyString(s.shipName)) return false;
    if (!isNonEmptyString(s.manufacturer)) return false;
    if (!isNonEmptyString(s.fleetyardsId)) return false;
    return typeof s.quantity === 'number' && s.quantity >= 1;
  });
};

// Activity fields are clearable, so null/undefined is allowed; a provided
// value must be a known activity.
const isValidActivityOrCleared = (value: unknown): boolean =>
  value === null || value === undefined || ACTIVITIES.includes(value as never);

// Validate only the whitelisted fields that are present on the update payload.
function validatePlannedMissionUpdate(
  update: Record<string, unknown>
): { valid: true } | { valid: false; error: string } {
  if ('name' in update) {
    const { name } = update;
    if (typeof name !== 'string' || name.length < 3) {
      return { valid: false, error: 'Name must be at least 3 characters' };
    }
  }

  if ('scheduledDateTime' in update) {
    const { scheduledDateTime } = update;
    if (typeof scheduledDateTime !== 'string' || isNaN(new Date(scheduledDateTime).getTime())) {
      return { valid: false, error: 'Invalid scheduled date/time format' };
    }
  }

  if ('operationType' in update && !OPERATION_TYPES.includes(update.operationType as never)) {
    return { valid: false, error: 'Invalid operation type' };
  }

  if ('primaryActivity' in update && !ACTIVITIES.includes(update.primaryActivity as never)) {
    return { valid: false, error: 'Invalid primary activity' };
  }

  if ('secondaryActivity' in update && !isValidActivityOrCleared(update.secondaryActivity)) {
    return { valid: false, error: 'Invalid secondary activity' };
  }

  if ('tertiaryActivity' in update && !isValidActivityOrCleared(update.tertiaryActivity)) {
    return { valid: false, error: 'Invalid tertiary activity' };
  }

  if ('duration' in update) {
    const { duration } = update;
    if (
      duration !== null &&
      duration !== undefined &&
      (typeof duration !== 'number' || duration < 0)
    ) {
      return { valid: false, error: 'Invalid duration' };
    }
  }

  if ('leaders' in update && !validateLeaders(update.leaders)) {
    return { valid: false, error: 'Invalid leaders data' };
  }

  if ('shipRequirements' in update && !validateShipRequirements(update.shipRequirements)) {
    return { valid: false, error: 'Invalid ship requirements data' };
  }

  if (
    'personnelRequirements' in update &&
    !validatePersonnelRequirements(update.personnelRequirements)
  ) {
    return { valid: false, error: 'Invalid personnel requirements data' };
  }

  if ('ships' in update && !validateMissionShips(update.ships)) {
    return { valid: false, error: 'Invalid ships data' };
  }

  if ('images' in update && !Array.isArray(update.images)) {
    return { valid: false, error: 'Invalid images data' };
  }

  return { valid: true };
}

// True when a protected field present in the payload would actually change the
// stored value. Echoing back the unchanged value is tolerated so clients can
// safely round-trip the full mission object.
function protectedFieldChanged(
  field: string,
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>
): boolean {
  if (!(field in incoming)) return false;
  return JSON.stringify(incoming[field] ?? null) !== JSON.stringify(existing[field] ?? null);
}

// GET handler - Get a single planned mission by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    logger.error(
      'Error fetching planned mission',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions/[id]' }
    );
    return NextResponse.json({ error: 'Failed to fetch planned mission' }, { status: 500 });
  }
}

// PUT handler - Update a planned mission by ID
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    if (!canModify && userClearance < MISSION_ADMIN_CLEARANCE_LEVEL) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this mission' },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const missionData = body as Record<string, unknown>;

    // Load the existing mission once: needed for 404 detection and for
    // determining whether protected fields would actually change.
    const existingMission = await plannedMissionStorage.getPlannedMissionById(id);
    if (!existingMission) {
      return NextResponse.json({ error: 'Planned mission not found' }, { status: 404 });
    }

    // Reject changes to fields owned by dedicated endpoints (status transitions,
    // attendance, Discord). Unchanged echoes of these fields are tolerated.
    const existingRecord = existingMission as unknown as Record<string, unknown>;
    for (const [field, endpoint] of Object.entries(PROTECTED_FIELD_ENDPOINTS)) {
      if (protectedFieldChanged(field, missionData, existingRecord)) {
        return NextResponse.json(
          { error: `'${field}' cannot be changed here. Use ${endpoint} instead.` },
          { status: 400 }
        );
      }
    }

    // Whitelist only mutable fields; everything else (managed metadata,
    // protected fields, unknown keys) is dropped.
    const update: Record<string, unknown> = {};
    for (const field of MUTABLE_FIELDS) {
      if (field in missionData) {
        update[field] = missionData[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    // Validate the provided subset against the shared partial schema.
    const validation = validatePlannedMissionUpdate(update);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const mission = await plannedMissionStorage.updatePlannedMission(
      id,
      update as Parameters<typeof plannedMissionStorage.updatePlannedMission>[1]
    );

    if (!mission) {
      return NextResponse.json({ error: 'Planned mission not found' }, { status: 404 });
    }

    logger.info('Planned mission updated successfully', {
      route: '/api/planned-missions/[id]',
      missionId: mission.id,
    });
    return NextResponse.json(mission, { status: 200 });
  } catch (error) {
    logger.error(
      'Error updating planned mission',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions/[id]' }
    );
    return NextResponse.json({ error: 'Failed to update planned mission' }, { status: 500 });
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
    const userClearance = session.user.clearanceLevel ?? 1;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Mission ID is required' }, { status: 400 });
    }

    // Check if user can delete this mission
    const canDelete = await plannedMissionStorage.canUserDeleteMission(userId, id);
    if (!canDelete && userClearance < MISSION_ADMIN_CLEARANCE_LEVEL) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this mission' },
        { status: 403 }
      );
    }

    const success = await plannedMissionStorage.deletePlannedMission(id);

    if (!success) {
      return NextResponse.json({ error: 'Planned mission not found' }, { status: 404 });
    }

    logger.info('Planned mission deleted successfully', {
      route: '/api/planned-missions/[id]',
      missionId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      'Error deleting planned mission',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions/[id]' }
    );
    return NextResponse.json({ error: 'Failed to delete planned mission' }, { status: 500 });
  }
}
