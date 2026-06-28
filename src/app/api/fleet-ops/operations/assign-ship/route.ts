import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guards';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';

const LEADERSHIP_ROLES = ['Director', 'Manager', 'Board Member'];

// Mission statuses that represent an "active" assignment, aligned with the
// MissionStatus state machine in @/lib/state-machines/mission-status.
// A ship counts as conflicting only while a mission is in one of these states.
const ACTIVE_MISSION_STATUSES = ['Planning', 'Briefing', 'In Progress', 'Debriefing'];

export async function POST(request: Request) {
  try {
    // Check authentication
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { userId, shipId, shipName, shipType, missionId } = await request.json();

    if (!userId || !shipId || !missionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate the mission id before constructing an ObjectId (an invalid hex
    // string would otherwise throw and surface as a generic 500).
    if (!ObjectId.isValid(missionId)) {
      return NextResponse.json({ error: 'Invalid mission id' }, { status: 400 });
    }
    const missionObjectId = new ObjectId(missionId);

    // Authorization: self-assignment OR leadership clearance
    const isSelfAssignment = userId === auth.userId;
    const hasLeadership = LEADERSHIP_ROLES.includes(auth.role) || auth.clearanceLevel >= 3;

    if (!isSelfAssignment && !hasLeadership) {
      logger.info('RBAC_AUDIT: User denied ship assignment', {
        route: '/api/fleet-ops/operations/assign-ship',
        userId: auth.userId,
        targetUserId: userId,
        missionId,
        reason: 'not self/leadership',
      });
      return NextResponse.json(
        { error: 'Not authorized to assign ships to this operation' },
        { status: 403 }
      );
    }

    // Connect to MongoDB
    const { client, db } = await connectToDatabase();

    // Run the conflict check and the assignment inside a single transaction so
    // the "ship is not already on another active mission" invariant is enforced
    // atomically (closes the TOCTOU window between the read and the write).
    // A holder object is used (rather than plain locals) so the assignments made
    // inside the callback are visible to TypeScript control-flow narrowing.
    const txState: {
      conflictMission: { id: string; name: string; status: string } | null;
      matchedCount: number;
    } = { conflictMission: null, matchedCount: 0 };

    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        // Reset per-attempt state (withTransaction may retry the callback).
        txState.conflictMission = null;
        txState.matchedCount = 0;

        // BUSINESS LOGIC: Check if ship is already assigned to another active mission
        const existingAssignment = await db.collection('missions').findOne(
          {
            _id: { $ne: missionObjectId }, // Different mission
            'participants.shipId': shipId,
            status: { $in: ACTIVE_MISSION_STATUSES }, // Active statuses
          },
          { session }
        );

        if (existingAssignment) {
          txState.conflictMission = {
            id: existingAssignment._id.toString(),
            name: existingAssignment.name,
            status: existingAssignment.status,
          };
          return; // No write; transaction commits with no changes.
        }

        // Update the mission participant's ship assignment
        const result = await db.collection('missions').updateOne(
          {
            _id: missionObjectId,
            'participants.userId': userId,
          },
          {
            $set: {
              'participants.$.shipId': shipId,
              'participants.$.shipName': shipName,
              'participants.$.shipType': shipType,
              'participants.$.assignedAt': new Date(),
            },
          },
          { session }
        );

        txState.matchedCount = result.matchedCount;
      });
    } finally {
      await session.endSession();
    }

    if (txState.conflictMission) {
      return NextResponse.json(
        {
          error: 'Ship conflict',
          message: `This ship is already assigned to mission: ${txState.conflictMission.name}`,
          conflictingMission: txState.conflictMission,
        },
        { status: 409 }
      ); // 409 Conflict
    }

    if (txState.matchedCount === 0) {
      return NextResponse.json({ error: 'Mission or participant not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Ship assigned successfully',
      data: {
        userId,
        shipId,
        shipName,
        shipType,
        assignedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error(
      'Error in assign-ship route',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/operations/assign-ship' }
    );
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
