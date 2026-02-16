import { NextRequest, NextResponse } from 'next/server';
import * as operationStorage from '@/lib/operation-storage';
import * as userStorage from '@/lib/user-storage';
import { z } from 'zod';
import { requireAuth, requireLeadership } from '@/lib/auth-guards';
import { logger } from '@/lib/logger';

// Validation schema for creating an operation
const operationParticipantSchema = z.object({
  userId: z.string(),
  shipName: z.string().optional(),
  shipManufacturer: z.string().optional(),
  role: z.string(),
  notes: z.string().optional()
});

const createOperationSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string(),
  status: z.enum(['Planning', 'Briefing', 'Active', 'Completed', 'Debriefing', 'Cancelled']),
  plannedDateTime: z.string(),
  location: z.string(),
  objectives: z.string(),
  participants: z.array(operationParticipantSchema).optional().default([]),
  diagramLinks: z.array(z.string()).optional().default([]),
  commsChannel: z.string().optional().default('')
});

// GET handler - List operations
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const userId = auth.userId;
    // Leadership users see all operations; others see only their own
    const isLeadership = auth.role === 'Director' || auth.role === 'Manager' || auth.role === 'Board Member' || auth.clearanceLevel >= 3;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: { status?: string; leaderId?: string; userId?: string } = {};
    
    const status = searchParams.get('status');
    if (status) filters.status = status;
    
    const leaderId = searchParams.get('leaderId');
    if (leaderId) filters.leaderId = leaderId;
    
    // If not leadership, restrict to operations the user is part of
    if (!isLeadership) {
      filters.userId = userId;
    }
    
    // Get operations based on filters
    const operations = await operationStorage.getAllOperations(filters);
    
    // Map operations to include leader name
    const operationsWithDetails = await Promise.all(operations.map(async (op) => {
      const leader = await userStorage.getUserById(op.leaderId);
      return {
        ...op,
        leaderName: leader ? leader.aydoHandle : 'Unknown'
      };
    }));
    
    const res = NextResponse.json(operationsWithDetails);
    res.headers.set('Cache-Control', 'no-store');
    return res;
    
  } catch (error) {
    logger.error('Error fetching operations', error instanceof Error ? error : new Error(String(error)), { route: '/api/fleet-ops/operations' });
    return NextResponse.json(
      { error: 'Failed to fetch operations' },
      { status: 500 }
    );
  }
}

// POST handler - Create a new operation
export async function POST(request: NextRequest) {
  try {
    // Only leadership can create operations
    const auth = await requireLeadership();
    if (auth instanceof NextResponse) return auth;

    const userId = auth.userId;

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
    
    const validationResult = createOperationSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    
    // Create the operation
    const operationData = validationResult.data;
    const operation = await operationStorage.createOperation({
      ...operationData,
      leaderId: userId
    });
    
    // Get leader details for response
    const leader = await userStorage.getUserById(userId);
    
    return NextResponse.json({
      ...operation,
      leaderName: leader?.aydoHandle || 'Unknown'
    }, { status: 201 });
    
  } catch (error) {
    logger.error('Error creating operation', error instanceof Error ? error : new Error(String(error)), { route: '/api/fleet-ops/operations' });
    return NextResponse.json(
      { error: 'Failed to create operation' },
      { status: 500 }
    );
  }
} 