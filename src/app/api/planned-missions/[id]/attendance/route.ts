import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth';
import {
  getPlannedMissionById,
  updateConfirmedParticipants,
  canUserModifyMission,
} from '@/lib/planned-mission-storage';
import { ConfirmedParticipant } from '@/types/PlannedMission';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Validation schema for an incoming confirmed participant.
// confirmedBy/confirmedAt are intentionally omitted: they are derived
// server-side and any client-supplied values are stripped by zod.
const confirmedParticipantInputSchema = z.object({
  odId: z.string().min(1, 'odId is required'),
  displayName: z.string().min(1, 'displayName is required'),
  discordId: z.string().optional(),
  userId: z.string().optional(),
  aydoHandle: z.string().optional(),
  role: z.string().optional(),
  notes: z.string().optional(),
});

const attendanceSchema = z.object({
  confirmedParticipants: z.array(confirmedParticipantInputSchema),
});

// POST - Save confirmed participants (attendance)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Only allow attendance marking for ACTIVE or DEBRIEFING missions
    if (!['ACTIVE', 'DEBRIEFING'].includes(mission.status)) {
      return NextResponse.json(
        { error: 'Attendance can only be marked for ACTIVE or DEBRIEFING missions' },
        { status: 400 }
      );
    }

    // Parse JSON body separately so malformed JSON yields a 400, not a 500.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parseResult = attendanceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const incomingParticipants = parseResult.data.confirmedParticipants;

    // Reject duplicate participant identifiers within the same request.
    const seenIds = new Set<string>();
    for (const participant of incomingParticipants) {
      if (seenIds.has(participant.odId)) {
        return NextResponse.json(
          { error: `Duplicate participant: ${participant.odId}` },
          { status: 400 }
        );
      }
      seenIds.add(participant.odId);
    }

    // Derive confirmedBy/confirmedAt server-side. Preserve the original
    // attribution for participants already confirmed; stamp newly added ones
    // with the current user and timestamp. This prevents clients from spoofing
    // who confirmed attendance.
    const now = new Date().toISOString();
    const existingById = new Map(mission.confirmedParticipants.map((p) => [p.odId, p]));
    const confirmedParticipants: ConfirmedParticipant[] = incomingParticipants.map(
      (participant) => {
        const existing = existingById.get(participant.odId);
        return {
          ...participant,
          confirmedBy: existing?.confirmedBy ?? userId,
          confirmedAt: existing?.confirmedAt ?? now,
        };
      }
    );

    // Update the confirmed participants
    const updatedMission = await updateConfirmedParticipants(missionId, confirmedParticipants);

    if (!updatedMission) {
      return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mission: updatedMission,
      confirmedCount: confirmedParticipants.length,
    });
  } catch (error) {
    logger.error(
      'Error saving attendance',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions/[id]/attendance' }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get attendance info for a mission
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const missionId = resolvedParams.id;

    const mission = await getPlannedMissionById(missionId);
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    return NextResponse.json({
      expectedParticipants: mission.expectedParticipants,
      confirmedParticipants: mission.confirmedParticipants,
      expectedCount: mission.expectedParticipants.length,
      confirmedCount: mission.confirmedParticipants.length,
    });
  } catch (error) {
    logger.error(
      'Error getting attendance',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/planned-missions/[id]/attendance' }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
