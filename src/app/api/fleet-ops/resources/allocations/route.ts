import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as resourceStorage from '@/lib/resource-storage';
import * as userStorage from '@/lib/user-storage';
import * as operationStorage from '@/lib/operation-storage';
import { ResourceAllocation } from '@/types/Resource';
import { z } from 'zod';

// Validation schema for resource allocation
const allocationSchema = z.object({
  resourceId: z.string(),
  operationId: z.string(),
  quantity: z.number().int().positive().optional(),
  role: z.string().optional(),
  notes: z.string().optional(),
  startDateTime: z.string(),
  endDateTime: z.string(),
  allocatedById: z.string()
});

// Helper to check if user has leadership role
async function hasLeadershipRole(userId: string): Promise<boolean> {
  // Remove role restrictions
  return true;

  // Commented out original implementation for future reference
  /*
  const user = await userStorage.getUserById(userId);
  if (!user) return false;
  
  // Check for leadership roles or clearance level
  const leadershipRoles = ['Director', 'Manager', 'Board Member'];
  return leadershipRoles.includes(user.role) || user.clearanceLevel >= 3;
  */
}

// GET /api/fleet-ops/resources/allocations - Get allocations by operation
export async function GET(req: NextRequest) {
  try {
    // Get the session to check if the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const operationId = searchParams.get('operationId');
    const resourceId = searchParams.get('resourceId');
    
    if (!operationId && !resourceId) {
      return NextResponse.json(
        { error: 'Either operationId or resourceId must be provided' },
        { status: 400 }
      );
    }
    
    let allocations: ResourceAllocation[] = [];
    
    if (operationId) {
      // Get allocations by operation
      allocations = await resourceStorage.getAllocationsByOperation(operationId);
    } else if (resourceId) {
      // Get allocations by resource
      allocations = await resourceStorage.getAllAllocationsByResource(resourceId);
    }
    
    // Enhance allocations with additional information
    const enhancedAllocations = await Promise.all(allocations.map(async (allocation) => {
      // Get resource details
      const resource = await resourceStorage.getResourceById(allocation.resourceId);
      
      // Get operation details
      const operation = await operationStorage.getOperationById(allocation.operationId);
      
      // Get allocator details
      const allocator = await userStorage.getUserById(allocation.allocatedById);
      
      return {
        ...allocation,
        resourceName: resource?.name || 'Unknown Resource',
        resourceType: resource?.type || 'Unknown',
        operationName: operation?.name || 'Unknown Operation',
        allocatorName: allocator?.aydoHandle || 'Unknown'
      };
    }));
    
    return NextResponse.json(enhancedAllocations);
  } catch (error) {
    console.error('Error getting resource allocations:', error);
    return NextResponse.json(
      { error: 'Failed to get resource allocations' },
      { status: 500 }
    );
  }
}

// POST /api/fleet-ops/resources/allocations - Allocate a resource to an operation
export async function POST(req: NextRequest) {
  try {
    // Get the session to check if the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only leadership or operation leaders can allocate resources
    const userHasLeadershipRole = await hasLeadershipRole(session.user.id);
    
    // Parse and validate request body
    const requestData = await req.json();
    
    try {
      // Validate the data
      const validatedData = allocationSchema.parse(requestData);
      
      // Check if the resource exists
      const resource = await resourceStorage.getResourceById(validatedData.resourceId);
      if (!resource) {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
      }
      
      // Check if the operation exists
      const operation = await operationStorage.getOperationById(validatedData.operationId);
      if (!operation) {
        return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
      }
      
      // Check if user has permission to allocate this resource
      const isOperationLeader = operation.leaderId === session.user.id;
      const isResourceOwner = resource.owner === session.user.id;
      
      if (!userHasLeadershipRole && !isOperationLeader && !isResourceOwner) {
        return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
      }
      
      // Check if the resource is available
      if (resource.status !== 'Available') {
        return NextResponse.json(
          { error: `Resource is not available for allocation. Current status: ${resource.status}` },
          { status: 400 }
        );
      }
      
      // Allocate the resource
      const allocation = await resourceStorage.allocateResource({
        ...validatedData,
        allocatedById: session.user.id // Override with actual user ID
      });
      
      return NextResponse.json(allocation, { status: 201 });
    } catch (validationError: any) {
      return NextResponse.json(
        { error: `Validation error: ${validationError.errors?.[0]?.message || validationError.message}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error allocating resource:', error);
    return NextResponse.json(
      { error: 'Failed to allocate resource' },
      { status: 500 }
    );
  }
}

// DELETE /api/fleet-ops/resources/allocations - Deallocate a resource from an operation
export async function DELETE(req: NextRequest) {
  try {
    // Get the session to check if the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const resourceId = searchParams.get('resourceId');
    const operationId = searchParams.get('operationId');
    
    if (!resourceId || !operationId) {
      return NextResponse.json(
        { error: 'Both resourceId and operationId must be provided' },
        { status: 400 }
      );
    }
    
    // Check if the resource exists
    const resource = await resourceStorage.getResourceById(resourceId);
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }
    
    // Check if the operation exists
    const operation = await operationStorage.getOperationById(operationId);
    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }
    
    // Check if user has permission to deallocate this resource
    const userHasLeadershipRole = await hasLeadershipRole(session.user.id);
    const isOperationLeader = operation.leaderId === session.user.id;
    const isResourceOwner = resource.owner === session.user.id;
    
    if (!userHasLeadershipRole && !isOperationLeader && !isResourceOwner) {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
    }
    
    // Deallocate the resource
    await resourceStorage.deallocateResource(resourceId, operationId);
    
    return NextResponse.json({ message: 'Resource deallocated successfully' });
  } catch (error) {
    console.error('Error deallocating resource:', error);
    return NextResponse.json(
      { error: 'Failed to deallocate resource' },
      { status: 500 }
    );
  }
} 