import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth';
import {
  getPlannedMissionById,
  updatePlannedMissionStatus,
  updatePlannedMission,
  canUserModifyMission
} from '@/lib/planned-mission-storage';
import { PlannedMissionStatus } from '@/types/PlannedMission';
import { getDiscordService } from '@/lib/discord';

// Helper to build Discord event description from mission
function buildEventDescription(mission: any, baseUrl?: string): string {
  const parts: string[] = [];

  if (mission.objectives) {
    parts.push(`**Objectives:**\n${mission.objectives}`);
  }

  const activities = [mission.primaryActivity];
  if (mission.secondaryActivity) activities.push(mission.secondaryActivity);
  if (mission.tertiaryActivity) activities.push(mission.tertiaryActivity);
  parts.push(`**Type:** ${mission.operationType}`);
  parts.push(`**Activities:** ${activities.join(', ')}`);

  if (mission.leaders && mission.leaders.length > 0) {
    const leaderList = mission.leaders
      .map((l: any) => `${l.role}: ${l.aydoHandle}`)
      .join('\n');
    parts.push(`**Leadership:**\n${leaderList}`);
  }

  if (baseUrl) {
    parts.push(`\n📋 **Full Briefing:** ${baseUrl}/dashboard/mission-planner?missionId=${mission.id}`);
  }

  return parts.join('\n\n');
}

// Auto-publish mission to Discord
async function autoPublishToDiscord(mission: any, baseUrl?: string): Promise<{ success: boolean; discordEvent?: any; error?: string }> {
  try {
    const discord = getDiscordService();
    if (!discord.isConfigured()) {
      console.log('Discord not configured, skipping auto-publish');
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
    await updatePlannedMission(mission.id, {
      discordEvent: {
        eventId: discordEvent.id,
        guildId: discordEvent.guild_id,
        createdAt: new Date().toISOString(),
        status: 'SCHEDULED'
      }
    });

    console.log('Auto-published mission to Discord:', mission.id, '-> Event:', discordEvent.id);
    return { success: true, discordEvent };
  } catch (error) {
    console.error('Failed to auto-publish to Discord:', error);
    return { success: false, error: 'Failed to publish to Discord' };
  }
}

const VALID_STATUSES: PlannedMissionStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'DEBRIEFING',
  'COMPLETED',
  'CANCELLED'
];

// Valid status transitions
const STATUS_TRANSITIONS: Record<PlannedMissionStatus, PlannedMissionStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['ACTIVE', 'CANCELLED', 'DRAFT'],
  ACTIVE: ['DEBRIEFING', 'COMPLETED', 'CANCELLED'],
  DEBRIEFING: ['COMPLETED', 'ACTIVE'],
  COMPLETED: [], // Terminal state
  CANCELLED: ['DRAFT'] // Can restore to draft
};

// PATCH - Update mission status
export async function PATCH(
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

    const body = await request.json();
    const { status } = body as { status: PlannedMissionStatus };

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if transition is valid
    const allowedTransitions = STATUS_TRANSITIONS[mission.status];
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${mission.status} to ${status}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}` },
        { status: 400 }
      );
    }

    // Update the status
    const updatedMission = await updatePlannedMissionStatus(missionId, status);

    if (!updatedMission) {
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    // Auto-publish to Discord when transitioning to SCHEDULED
    let discordPublishResult: { success: boolean; discordEvent?: any; error?: string } | null = null;
    if (status === 'SCHEDULED' && !mission.discordEvent) {
      const baseUrl = request.headers.get('origin') || process.env.NEXTAUTH_URL || '';
      discordPublishResult = await autoPublishToDiscord(updatedMission, baseUrl);
    }

    return NextResponse.json({
      success: true,
      mission: updatedMission,
      previousStatus: mission.status,
      newStatus: status,
      discordPublished: discordPublishResult?.success || false,
      discordError: discordPublishResult?.error
    });
  } catch (error) {
    console.error('Error updating mission status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get current status and allowed transitions
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
      currentStatus: mission.status,
      allowedTransitions: STATUS_TRANSITIONS[mission.status]
    });
  } catch (error) {
    console.error('Error getting mission status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
