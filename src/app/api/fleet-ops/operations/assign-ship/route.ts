import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, shipId, shipName, shipType, missionId } = await request.json();

    if (!userId || !shipId || !missionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
