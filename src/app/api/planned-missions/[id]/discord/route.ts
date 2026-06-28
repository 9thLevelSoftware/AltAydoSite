import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as plannedMissionStorage from '@/lib/planned-mission-storage';
import { getDiscordService, DiscordEventUser, CreateDiscordEventParams } from '@/lib/discord';
import { DiscordEventStatus } from '@/types/DiscordEvent';
import { PlannedMissionResponse, PlannedMissionStatus } from '@/types/PlannedMission';
import { buildEventDescription } from '@/lib/discord-event-description';
import { getDiscordEventImageForMission } from '@/lib/discord-event-image';
import { logger } from '@/lib/logger';

const DEFAULT_DISCORD_EVENT_DURATION_MINUTES = 120;
const MISSION_ADMIN_CLEARANCE_LEVEL = 4;

/**
 * Resolve the canonical base URL used when generating external links inside
 * Discord events.
 *
 * Prefer an explicitly configured app URL so we never embed a value derived
 * from the client-controlled `Origin` header (which can be spoofed). Falls back
 * to the request origin only when no canonical URL is configured.
 */
function resolveCanonicalBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (configured && configured.trim().length > 0) {
    try {
      return new URL(configured.trim()).origin;
    } catch {
      logger.warn('Invalid configured app URL - falling back to request origin', {
        route: '/api/planned-missions/[id]/discord',
        configured,
      });
    }
  }
  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

function getMissionStartDate(mission: PlannedMissionResponse): Date | null {
  const startDate = new Date(mission.scheduledDateTime);
  return Number.isNaN(startDate.getTime()) ? null : startDate;
}

// Map Discord event status to mission status
function mapDiscordStatusToMissionStatus(
  discordStatus: number,
  currentMissionStatus: PlannedMissionStatus
): PlannedMissionStatus | null {
  switch (discordStatus) {
    case DiscordEventStatus.ACTIVE:
      // Discord event is live -> Mission should be ACTIVE
      if (currentMissionStatus === 'SCHEDULED') {
        return 'ACTIVE';
      }
      break;
    case DiscordEventStatus.COMPLETED:
      // Discord event ended -> Mission should go to DEBRIEFING
      if (currentMissionStatus === 'SCHEDULED' || currentMissionStatus === 'ACTIVE') {
        return 'DEBRIEFING';
      }
      break;
    case DiscordEventStatus.CANCELED:
      // Discord event cancelled -> Mission should be CANCELLED
      if (currentMissionStatus !== 'COMPLETED' && currentMissionStatus !== 'CANCELLED') {
        return 'CANCELLED';
      }
      break;
  }
  return null; // No status change needed
}

function getMissionEndTime(mission: PlannedMissionResponse): string {
  const startDate = getMissionStartDate(mission);
  if (!startDate) {
    return new Date(Date.now() + DEFAULT_DISCORD_EVENT_DURATION_MINUTES * 60 * 1000).toISOString();
  }

  const durationMinutes =
    typeof mission.duration === 'number' && mission.duration > 0
      ? mission.duration
      : DEFAULT_DISCORD_EVENT_DURATION_MINUTES;

  return new Date(startDate.getTime() + durationMinutes * 60 * 1000).toISOString();
}

function isTerminalDiscordEventStatus(discordStatus: number): boolean {
  return (
    discordStatus === DiscordEventStatus.COMPLETED || discordStatus === DiscordEventStatus.CANCELED
  );
}

function buildDiscordEventUpdateParams(
  mission: PlannedMissionResponse,
  description: string,
  discordStatus: number,
  image?: string
): Partial<CreateDiscordEventParams> {
  const updateParams: Partial<CreateDiscordEventParams> = {
    name: mission.name,
    description,
    scheduledEndTime: getMissionEndTime(mission),
    location: mission.location || 'Star Citizen',
  };
  const startDate = getMissionStartDate(mission);

  // Active external Discord events already have a start time in the past.
  // Resending that value can make Discord reject an otherwise valid details update.
  if (discordStatus !== DiscordEventStatus.ACTIVE && startDate) {
    updateParams.scheduledStartTime = mission.scheduledDateTime;
  }

  if (image) {
    updateParams.image = image;
  }

  return updateParams;
}

function discordRsvpUnavailableResponse(
  mission: PlannedMissionResponse,
  discordError: string,
  eventStatus?: number
) {
  const res = NextResponse.json({
    rsvps: [],
    count: 0,
    discordUserCount: 0,
    eventStatus,
    missionStatus: mission.status,
    statusSynced: false,
    discordAvailable: false,
    discordError,
  });
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  return res;
}

// POST - Publish mission to Discord (create event)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get the mission
    const mission = await plannedMissionStorage.getPlannedMissionById(id);
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Check permissions
    const canModify = await plannedMissionStorage.canUserModifyMission(userId, id);
    if (!canModify && userClearance < MISSION_ADMIN_CLEARANCE_LEVEL) {
      return NextResponse.json(
        { error: 'You do not have permission to publish this mission' },
        { status: 403 }
      );
    }

    // Check if already published
    if (mission.discordEvent) {
      return NextResponse.json(
        { error: 'Mission is already published to Discord', discordEvent: mission.discordEvent },
        { status: 400 }
      );
    }

    // Get Discord service
    const discord = getDiscordService();
    if (!discord.isConfigured()) {
      return NextResponse.json({ error: 'Discord is not configured' }, { status: 500 });
    }

    // Use a configured canonical app URL instead of the client-controlled Origin header
    const baseUrl = resolveCanonicalBaseUrl(request);

    // Build description
    const description = buildEventDescription(mission, baseUrl);
    const image = await getDiscordEventImageForMission(mission);

    // Calculate end time (duration or default 2 hours)
    let endTime: string | undefined;
    if (mission.duration) {
      const startDate = new Date(mission.scheduledDateTime);
      const endDate = new Date(startDate.getTime() + mission.duration * 60 * 1000);
      endTime = endDate.toISOString();
    }

    // Create Discord event
    const discordEvent = await discord.createScheduledEvent({
      name: mission.name,
      description,
      scheduledStartTime: mission.scheduledDateTime,
      scheduledEndTime: endTime,
      location: mission.location || 'Star Citizen',
      image,
    });

    // Update mission with Discord event reference. If local persistence fails we
    // must compensate by deleting the Discord event we just created, otherwise we
    // leave an orphaned event that the mission no longer references.
    let updatedMission: PlannedMissionResponse | null;
    try {
      updatedMission = await plannedMissionStorage.updatePlannedMission(id, {
        discordEvent: {
          eventId: discordEvent.id,
          guildId: discordEvent.guild_id,
          createdAt: new Date().toISOString(),
          status: 'SCHEDULED',
        },
        status: 'SCHEDULED',
      });
    } catch (persistError) {
      updatedMission = null;
      logger.error(
        'Failed to persist Discord event reference - compensating by deleting the Discord event',
        persistError instanceof Error ? persistError : new Error(String(persistError)),
        {
          route: '/api/planned-missions/[id]/discord',
          missionId: id,
          discordEventId: discordEvent.id,
        }
      );
    }

    if (!updatedMission) {
      // Persistence either failed or could not find the mission. Roll back the
      // Discord event so we do not orphan it.
      try {
        await discord.deleteScheduledEvent(discordEvent.id);
      } catch (cleanupError) {
        logger.error(
          'Failed to clean up orphaned Discord event after persistence failure',
          cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)),
          {
            route: '/api/planned-missions/[id]/discord',
            missionId: id,
            discordEventId: discordEvent.id,
          }
        );
      }
      return NextResponse.json(
        { error: 'Failed to link Discord event to mission. The Discord event has been removed.' },
        { status: 500 }
      );
    }

    logger.info('Mission published to Discord', {
      route: '/api/planned-missions/[id]/discord',
      missionId: id,
      discordEventId: discordEvent.id,
    });

    return NextResponse.json({
      success: true,
      discordEvent: {
        id: discordEvent.id,
        guild_id: discordEvent.guild_id,
        name: discordEvent.name,
      },
      mission: updatedMission,
    });
  } catch (error) {
    logger.error(
      'Error publishing mission to Discord',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions/[id]/discord' }
    );
    return NextResponse.json({ error: 'Failed to publish to Discord' }, { status: 500 });
  }
}

// GET - Get Discord event RSVPs (interested users)
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

    // Get the mission
    const mission = await plannedMissionStorage.getPlannedMissionById(id);
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Check if published to Discord
    if (!mission.discordEvent) {
      return NextResponse.json(
        { error: 'Mission is not published to Discord', rsvps: [] },
        { status: 200 }
      );
    }

    // Get Discord service
    const discord = getDiscordService();
    if (!discord.isConfigured()) {
      return discordRsvpUnavailableResponse(mission, 'Discord is not configured');
    }

    let rsvpUsers: DiscordEventUser[];
    let discordEvent: Awaited<ReturnType<typeof discord.getScheduledEvent>>;

    try {
      // Fetch RSVPs from Discord and also get updated event info.
      rsvpUsers = await discord.getEventUsers(mission.discordEvent.eventId);
      discordEvent = await discord.getScheduledEvent(mission.discordEvent.eventId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Discord RSVP data unavailable', {
        route: '/api/planned-missions/[id]/discord',
        missionId: id,
        discordEventId: mission.discordEvent.eventId,
        error: message,
      });
      return discordRsvpUnavailableResponse(
        mission,
        'Discord RSVP data is temporarily unavailable'
      );
    }

    if (!discordEvent) {
      return discordRsvpUnavailableResponse(mission, 'Discord event was not found');
    }

    // Sync mission status with Discord event status. This is a write side effect,
    // so it is only performed for callers who are allowed to modify the mission;
    // unprivileged callers still receive the latest RSVP/event data read-only.
    let updatedMission = mission;
    let statusSynced = false;
    if (discordEvent?.status) {
      const newStatus = mapDiscordStatusToMissionStatus(discordEvent.status, mission.status);
      if (newStatus && newStatus !== mission.status) {
        const userId = session.user.id;
        const userClearance = session.user.clearanceLevel ?? 1;
        const canModify =
          userClearance >= MISSION_ADMIN_CLEARANCE_LEVEL ||
          (await plannedMissionStorage.canUserModifyMission(userId, id));

        if (canModify) {
          logger.info('Syncing mission status from Discord', {
            route: '/api/planned-missions/[id]/discord',
            missionId: id,
            oldStatus: mission.status,
            newStatus,
            discordEventStatus: discordEvent.status,
          });
          updatedMission =
            (await plannedMissionStorage.updatePlannedMission(id, { status: newStatus })) ||
            mission;
          statusSynced = true;
        } else {
          logger.info('Skipping Discord status sync - caller lacks modify permission', {
            route: '/api/planned-missions/[id]/discord',
            missionId: id,
            currentStatus: mission.status,
            proposedStatus: newStatus,
            discordEventStatus: discordEvent.status,
          });
        }
      }
    }

    // Transform to a simpler format
    const rsvps = rsvpUsers.map((u) => ({
      discordId: u.user.id,
      username: u.user.username,
      globalName: u.user.global_name,
      nickname: u.member?.nick,
      avatar: u.user.avatar,
    }));

    const res = NextResponse.json({
      rsvps,
      count: rsvps.length,
      discordUserCount: discordEvent?.user_count || rsvps.length,
      eventStatus: discordEvent?.status,
      missionStatus: updatedMission.status,
      statusSynced,
    });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error) {
    logger.error(
      'Error fetching Discord RSVPs',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions/[id]/discord' }
    );
    return NextResponse.json({ error: 'Failed to fetch RSVPs' }, { status: 500 });
  }
}

// DELETE - Unpublish mission from Discord (delete event)
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

    // Get the mission
    const mission = await plannedMissionStorage.getPlannedMissionById(id);
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Check permissions
    const canModify = await plannedMissionStorage.canUserModifyMission(userId, id);
    if (!canModify && userClearance < MISSION_ADMIN_CLEARANCE_LEVEL) {
      return NextResponse.json(
        { error: 'You do not have permission to unpublish this mission' },
        { status: 403 }
      );
    }

    // Check if published
    if (!mission.discordEvent) {
      return NextResponse.json({ error: 'Mission is not published to Discord' }, { status: 400 });
    }

    if (!mission.discordEvent.eventId) {
      return NextResponse.json(
        { error: 'Mission Discord event is missing an event ID' },
        { status: 400 }
      );
    }

    // Get Discord service
    const discord = getDiscordService();
    if (!discord.isConfigured()) {
      return NextResponse.json({ error: 'Discord is not configured' }, { status: 500 });
    }

    // Delete Discord event
    await discord.deleteScheduledEvent(mission.discordEvent.eventId);

    // Clear the local Discord reference. The Discord event is already gone, so a
    // failure here leaves a recoverable stale reference (not an orphaned event).
    // Retry once before surfacing an inconsistent-but-recoverable state.
    let updatedMission: PlannedMissionResponse | null = null;
    let cleanupError: unknown = null;
    for (let attempt = 0; attempt < 2 && !updatedMission; attempt++) {
      try {
        updatedMission = await plannedMissionStorage.updatePlannedMission(id, {
          discordEvent: undefined,
          status: 'DRAFT',
        });
      } catch (error) {
        cleanupError = error;
      }
    }

    if (!updatedMission) {
      logger.error(
        'Discord event deleted but mission still references it - stale reference left behind',
        cleanupError instanceof Error
          ? cleanupError
          : cleanupError
            ? new Error(String(cleanupError))
            : new Error('updatePlannedMission returned no mission'),
        {
          route: '/api/planned-missions/[id]/discord',
          missionId: id,
          discordEventId: mission.discordEvent.eventId,
        }
      );
      return NextResponse.json(
        {
          success: false,
          inconsistent: true,
          error:
            'The Discord event was deleted, but the mission could not be updated to remove the now-stale reference. Please retry to finish unpublishing.',
        },
        { status: 409 }
      );
    }

    logger.info('Mission unpublished from Discord', {
      route: '/api/planned-missions/[id]/discord',
      missionId: id,
    });

    return NextResponse.json({
      success: true,
      mission: updatedMission,
    });
  } catch (error) {
    logger.error(
      'Error unpublishing mission from Discord',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions/[id]/discord' }
    );
    return NextResponse.json({ error: 'Failed to unpublish from Discord' }, { status: 500 });
  }
}

// PATCH - Update Discord event (sync changes)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get the mission
    const mission = await plannedMissionStorage.getPlannedMissionById(id);
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Check permissions
    const canModify = await plannedMissionStorage.canUserModifyMission(userId, id);
    if (!canModify && userClearance < MISSION_ADMIN_CLEARANCE_LEVEL) {
      return NextResponse.json(
        { error: 'You do not have permission to update this mission' },
        { status: 403 }
      );
    }

    // Check if published
    if (!mission.discordEvent) {
      return NextResponse.json({ error: 'Mission is not published to Discord' }, { status: 400 });
    }

    if (!mission.discordEvent.eventId) {
      return NextResponse.json(
        { error: 'Mission Discord event is missing an event ID' },
        { status: 400 }
      );
    }

    // Get Discord service
    const discord = getDiscordService();
    if (!discord.isConfigured()) {
      return NextResponse.json({ error: 'Discord is not configured' }, { status: 500 });
    }

    // Use a configured canonical app URL instead of the client-controlled Origin header
    const baseUrl = resolveCanonicalBaseUrl(request);

    const currentDiscordEvent = await discord.getScheduledEvent(mission.discordEvent.eventId);
    if (!currentDiscordEvent) {
      return NextResponse.json(
        {
          error:
            'Discord event was not found. The mission was saved locally but is no longer linked to an existing Discord event.',
        },
        { status: 404 }
      );
    }

    if (isTerminalDiscordEventStatus(currentDiscordEvent.status)) {
      return NextResponse.json(
        {
          error:
            'Discord event is already completed or canceled and cannot be updated. The mission was saved locally only.',
        },
        { status: 409 }
      );
    }

    // Build updated description
    const description = buildEventDescription(mission, baseUrl);
    const image = await getDiscordEventImageForMission(mission);
    const updateParams = buildDiscordEventUpdateParams(
      mission,
      description,
      currentDiscordEvent.status,
      image
    );

    // Update Discord event
    const updatedEvent = await discord.updateScheduledEvent(
      mission.discordEvent.eventId,
      updateParams
    );

    logger.info('Discord event updated for mission', {
      route: '/api/planned-missions/[id]/discord',
      missionId: id,
    });

    return NextResponse.json({
      success: true,
      discordEvent: {
        id: updatedEvent.id,
        name: updatedEvent.name,
      },
    });
  } catch (error) {
    logger.error(
      'Error updating Discord event',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions/[id]/discord' }
    );
    return NextResponse.json({ error: 'Failed to update Discord event' }, { status: 500 });
  }
}
