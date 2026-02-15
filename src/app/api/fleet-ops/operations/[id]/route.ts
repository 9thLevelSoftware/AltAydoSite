import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as operationStorage from '@/lib/operation-storage';
import * as userStorage from '@/lib/user-storage';
import { Operation } from '@/types/Operation';
import { z } from 'zod';

// Validation schema for updating an operation
const operationParticipantSchema = z.object({
  userId: z.string(),
  shipName: z.string().optional(),
  shipManufacturer: z.string().optional(),
  role: z.string(),
  notes: z.string().optional()
});

const updateOperationSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').optional(),
  description: z.string().optional(),
  status: z.enum(['Planning', 'Briefing', 'Active', 'Completed', 'Debriefing', 'Cancelled']).optional(),
  plannedDateTime: z.string().optional(),
  location: z.string().optional(),
  objectives: z.string().optional(),
  participants: z.array(operationParticipantSchema).optional(),
  diagramLinks: z.array(z.string()).optional(),
  commsChannel: z.string().optional()
});

// Helper to check if user has leadership role
async function hasLeadershipRole(_userId: string): Promise<boolean> {
  // Remove role restrictions
  return true;

  // Commented out original implementation for future reference
  /*
  const user = await userStorage.getUserById(userId);
  if (!user) return false;

  // Check for leadership roles
  const leadershipRoles = ['Director', 'Manager', 'Board Member'];
  return leadershipRoles.includes(user.role) || user.clearanceLevel >= 3;
  */
}

// Helper to check if user can modify an operation
async function canModifyOperation(_userId: string, _operation: Operation): Promise<boolean> {
  // Remove role restrictions - anyone can modify any operation
  return true;

  // Commented out original implementation for future reference
  /*
  // Leaders can modify any operation
  const isLeadership = await hasLeadershipRole(userId);
  if (isLeadership) return true;

  // Operation leaders can modify their own operations
  return operation.leaderId === userId;
  */
}

// GET handler - Get a specific operation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get the operation
    const operation = await operationStorage.getOperationById(id);

    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }

    // Check if the user has access to this operation
    const isLeadership = await hasLeadershipRole(userId);
    const isParticipant = operation.participants.some(p => p.userId === userId);
    const isLeader = operation.leaderId === userId;

    if (!isLeadership && !isParticipant && !isLeader) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get leader details for response
    const leader = await userStorage.getUserById(operation.leaderId);

    // Return the operation with leader name
    return NextResponse.json({
      ...operation,
      leaderName: leader ? leader.aydoHandle : 'Unknown'
    });

  } catch (error) {
    console.error('Error fetching operation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operation' },
      { status: 500 }
    );
  }
}

// PUT handler - Update an operation
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get the operation
    const operation = await operationStorage.getOperationById(id);

    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }

    // Check if the user can modify this operation
    const canModify = await canModifyOperation(userId, operation);
    if (!canModify) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validationResult = updateOperationSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Update the operation
    const updates = validationResult.data;
    const updatedOperation = await operationStorage.updateOperation(id, updates);

    if (!updatedOperation) {
      return NextResponse.json({ error: 'Failed to update operation' }, { status: 500 });
    }

    // Get leader details for response
    const leader = await userStorage.getUserById(updatedOperation.leaderId);

    // Return the updated operation with leader name
    return NextResponse.json({
      ...updatedOperation,
      leaderName: leader ? leader.aydoHandle : 'Unknown'
    });

  } catch (error) {
    console.error('Error updating operation:', error);
    return NextResponse.json(
      { error: 'Failed to update operation' },
      { status: 500 }
    );
  }
}

// DELETE handler - Delete an operation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const operationId = id;

    // Get the operation
    const operation = await operationStorage.getOperationById(operationId);

    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }

    // Check if the user can modify this operation
    const canModify = await canModifyOperation(userId, operation);
    if (!canModify) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the operation
    const success = await operationStorage.deleteOperation(operationId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete operation' }, { status: 500 });
    }

    // Return success response
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting operation:', error);
    return NextResponse.json(
      { error: 'Failed to delete operation' },
      { status: 500 }
    );
  }
} 
