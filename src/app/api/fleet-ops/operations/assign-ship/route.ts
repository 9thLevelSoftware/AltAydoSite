import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guards';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const LEADERSHIP_ROLES = ['Director', 'Manager', 'Board Member'];

export async function POST(request: Request) {
  try {
    // Check authentication
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { userId, shipId, shipName, shipType, missionId } = await request.json();

    if (!userId || !shipId || !missionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Authorization: self-assignment OR leadership clearance
    const isSelfAssignment = userId === auth.userId;
    const hasLeadership = LEADERSHIP_ROLES.includes(auth.role) || auth.clearanceLevel >= 3;

    if (!isSelfAssignment && !hasLeadership) {
      console.log(`RBAC_AUDIT: User ${auth.userId} denied ship assignment to user ${userId} on mission ${missionId} (not self/leadership)`);
      return NextResponse.json(
        { error: 'Not authorized to assign ships to this operation' },
        { status: 403 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // BUSINESS LOGIC: Check if ship is already assigned to another active mission
    const existingAssignment = await db.collection('missions').findOne({
      _id: { $ne: new ObjectId(missionId) }, // Different mission
      'participants.shipId': shipId,
      status: { $in: ['Planning', 'Active', 'Scheduled'] } // Active statuses
    });

    if (existingAssignment) {
      return NextResponse.json({
        error: 'Ship conflict',
        message: `This ship is already assigned to mission: ${existingAssignment.name}`,
        conflictingMission: {
          id: existingAssignment._id.toString(),
          name: existingAssignment.name,
          status: existingAssignment.status
        }
      }, { status: 409 }); // 409 Conflict
    }

    // Update the mission participant's ship assignment
    const result = await db.collection('missions').updateOne(
      { 
        _id: new ObjectId(missionId),
        'participants.userId': userId 
      },
      { 
        $set: { 
          'participants.$.shipId': shipId,
          'participants.$.shipName': shipName,
          'participants.$.shipType': shipType,
          'participants.$.assignedAt': new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
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
        assignedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error in assign-ship route:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 
