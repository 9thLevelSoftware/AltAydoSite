import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as plannedMissionStorage from '@/lib/planned-mission-storage';
import { getDiscordService, DiscordEventUser, CreateDiscordEventParams } from '@/lib/discord';
import { DiscordEventStatus } from '@/types/DiscordEvent';
import { PlannedMissionResponse, PlannedMissionStatus } from '@/types/PlannedMission';
import { buildEventDescription } from '@/lib/discord-event-description';
import { logger } from '@/lib/logger';

const DEFAULT_DISCORD_EVENT_DURATION_MINUTES = 120;

// Map Discord event status to mission status
function mapDiscordStatusToMissionStatus(discordStatus: number, currentMissionStatus: PlannedMissionStatus): PlannedMissionStatus | null {
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
  const startDate = new Date(mission.scheduledDateTime);
  const durationMinutes = typeof mission.duration === 'number' && mission.duration > 0
    ? mission.duration
    : DEFAULT_DISCORD_EVENT_DURATION_MINUTES;

  return new Date(startDate.getTime() + durationMinutes * 60 * 1000).toISOString();
}

function isTerminalDiscordEventStatus(discordStatus: number): boolean {
  return discordStatus === DiscordEventStatus.COMPLETED || discordStatus === DiscordEventStatus.CANCELED;
}

function buildDiscordEventUpdateParams(
  mission: PlannedMissionResponse,
  description: string,
  discordStatus: number
): Partial<CreateDiscordEventParams> {
  const updateParams: Partial<CreateDiscordEventParams> = {
    name: mission.name,
    description,
    scheduledEndTime: getMissionEndTime(mission),
    location: mission.location || 'Star Citizen'
  };

  // Active external Discord events already have a start time in the past.
  // Resending that value can make Discord reject an otherwise valid details update.
  if (discordStatus !== DiscordEventStatus.ACTIVE) {
    updateParams.scheduledStartTime = mission.scheduledDateTime;
  }

  return updateParams;
}

// POST - Publish mission to Discord (create event)
export async function POST(
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

    // Get the mission
    const mission = await plannedMissionStorage.getPlannedMissionById(id);
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Check permissions
    const canModify = await plannedMissionStorage.canUserModifyMission(userId, id);
    if (!canModify) {
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
      return NextResponse.json(
        { error: 'Discord is not configured' },
        { status: 500 }
      );
    }

    // Get base URL from request
    const baseUrl = request.headers.get('origin') || process.env.NEXTAUTH_URL || '';

    // Build description
    const description = buildEventDescription(mission, baseUrl);

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
      location: mission.location || 'Star Citizen'
    });

    // Update mission with Discord event reference
    const updatedMission = await plannedMissionStorage.updatePlannedMission(id, {
      discordEvent: {
        eventId: discordEvent.id,
        guildId: discordEvent.guild_id,
        createdAt: new Date().toISOString(),
        status: 'SCHEDULED'
      },
      status: 'SCHEDULED'
    });

    logger.info('Mission published to Discord', { route: '/api/planned-missions/[id]/discord', missionId: id, discordEventId: discordEvent.id });

    return NextResponse.json({
      success: true,
      discordEvent: {
        id: discordEvent.id,
        guild_id: discordEvent.guild_id,
        name: discordEvent.name
      },
      mission: updatedMission
    });

  } catch (error) {
    logger.error('Error publishing mission to Discord', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions/[id]/discord' });
    return NextResponse.json(
      { error: 'Failed to publish to Discord' },
      { status: 500 }
    );
  }
}

// GET - Get Discord event RSVPs (interested users)
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
      return NextResponse.json(
        { error: 'Discord is not configured' },
        { status: 500 }
      );
    }

    // Fetch RSVPs from Discord
    const rsvpUsers: DiscordEventUser[] = await discord.getEventUsers(mission.discordEvent.eventId);

    // Also get updated event info
    const discordEvent = await discord.getScheduledEvent(mission.discordEvent.eventId);

    // Sync mission status with Discord event status
    let updatedMission = mission;
    let statusSynced = false;
    if (discordEvent?.status) {
      const newStatus = mapDiscordStatusToMissionStatus(discordEvent.status, mission.status);
      if (newStatus && newStatus !== mission.status) {
        logger.info('Syncing mission status from Discord', { route: '/api/planned-missions/[id]/discord', missionId: id, oldStatus: mission.status, newStatus, discordEventStatus: discordEvent.status });
        updatedMission = await plannedMissionStorage.updatePlannedMission(id, { status: newStatus }) || mission;
        statusSynced = true;
      }
    }

    // Transform to a simpler format
    const rsvps = rsvpUsers.map(u => ({
      discordId: u.user.id,
      username: u.user.username,
      globalName: u.user.global_name,
      nickname: u.member?.nick,
      avatar: u.user.avatar
    }));

    const res = NextResponse.json({
      rsvps,
      count: rsvps.length,
      discordUserCount: discordEvent?.user_count || rsvps.length,
      eventStatus: discordEvent?.status,
      missionStatus: updatedMission.status,
      statusSynced
    });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;

  } catch (error) {
    logger.error('Error fetching Discord RSVPs', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions/[id]/discord' });
    return NextResponse.json(
      { error: 'Failed to fetch RSVPs' },
      { status: 500 }
    );
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
    if (!canModify) {
      return NextResponse.json(
        { error: 'You do not have permission to unpublish this mission' },
        { status: 403 }
      );
    }

    // Check if published
    if (!mission.discordEvent) {
      return NextResponse.json(
        { error: 'Mission is not published to Discord' },
        { status: 400 }
      );
    }

    // Get Discord service
    const discord = getDiscordService();
    if (!discord.isConfigured()) {
      return NextResponse.json(
        { error: 'Discord is not configured' },
        { status: 500 }
      );
    }

    // Delete Discord event
    await discord.deleteScheduledEvent(mission.discordEvent.eventId);

    // Update mission to remove Discord reference
    const updatedMission = await plannedMissionStorage.updatePlannedMission(id, {
      discordEvent: undefined,
      status: 'DRAFT'
    });

    logger.info('Mission unpublished from Discord', { route: '/api/planned-missions/[id]/discord', missionId: id });

    return NextResponse.json({
      success: true,
      mission: updatedMission
    });

  } catch (error) {
    logger.error('Error unpublishing mission from Discord', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions/[id]/discord' });
    return NextResponse.json(
      { error: 'Failed to unpublish from Discord' },
      { status: 500 }
    );
  }
}

// PATCH - Update Discord event (sync changes)
export async function PATCH(
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

    // Get the mission
    const mission = await plannedMissionStorage.getPlannedMissionById(id);
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Check permissions
    const canModify = await plannedMissionStorage.canUserModifyMission(userId, id);
    if (!canModify) {
      return NextResponse.json(
        { error: 'You do not have permission to update this mission' },
        { status: 403 }
      );
    }

    // Check if published
    if (!mission.discordEvent) {
      return NextResponse.json(
        { error: 'Mission is not published to Discord' },
        { status: 400 }
      );
    }

    // Get Discord service
    const discord = getDiscordService();
    if (!discord.isConfigured()) {
      return NextResponse.json(
        { error: 'Discord is not configured' },
        { status: 500 }
      );
    }

    // Get base URL from request
    const baseUrl = request.headers.get('origin') || process.env.NEXTAUTH_URL || '';

    const currentDiscordEvent = await discord.getScheduledEvent(mission.discordEvent.eventId);
    if (!currentDiscordEvent) {
      return NextResponse.json(
        { error: 'Discord event was not found. The mission was saved locally but is no longer linked to an existing Discord event.' },
        { status: 404 }
      );
    }

    if (isTerminalDiscordEventStatus(currentDiscordEvent.status)) {
      return NextResponse.json(
        { error: 'Discord event is already completed or canceled and cannot be updated. The mission was saved locally only.' },
        { status: 409 }
      );
    }

    // Build updated description
    const description = buildEventDescription(mission, baseUrl);
    const updateParams = buildDiscordEventUpdateParams(mission, description, currentDiscordEvent.status);

    // Update Discord event
    const updatedEvent = await discord.updateScheduledEvent(mission.discordEvent.eventId, updateParams);

    logger.info('Discord event updated for mission', { route: '/api/planned-missions/[id]/discord', missionId: id });

    return NextResponse.json({
      success: true,
      discordEvent: {
        id: updatedEvent.id,
        name: updatedEvent.name
      }
    });

  } catch (error) {
    logger.error('Error updating Discord event', error instanceof Error ? error : new Error(String(error)), { route: '/api/planned-missions/[id]/discord' });
    return NextResponse.json(
      { error: 'Failed to update Discord event' },
      { status: 500 }
    );
  }
}
