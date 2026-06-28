import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as resourceStorage from '@/lib/resource-storage';
import * as userStorage from '@/lib/user-storage';
import { Resource } from '@/types/Resource';
import { z } from 'zod';
import { requireAuth, requireLeadership } from '@/lib/auth-guards';
import { logger } from '@/lib/logger';

// GET /api/fleet-ops/resources/[id] - Get a specific resource
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Get the session to check if the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resource = await resourceStorage.getResourceById(id);
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Enhance resource with owner name
    const owner = await userStorage.getUserById(resource.owner);
    const ownerName = owner ? owner.aydoHandle : 'Unknown';

    // If assigned to someone, get their name
    let assignedToName;
    if (resource.assignedTo) {
      const assignedUser = await userStorage.getUserById(resource.assignedTo);
      assignedToName = assignedUser ? assignedUser.aydoHandle : 'Unknown';
    }

    return NextResponse.json({
      ...resource,
      ownerName,
      assignedToName,
    });
  } catch (error) {
    logger.error(
      'Error getting resource',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/resources/[id]' }
    );
    return NextResponse.json({ error: 'Failed to get resource' }, { status: 500 });
  }
}

// PUT /api/fleet-ops/resources/[id] - Update a resource
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Authenticate user
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const resourceId = id;

    // Get the existing resource
    const existingResource = await resourceStorage.getResourceById(resourceId);
    if (!existingResource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Check if the user has permission to update this resource
    const leadershipCheck = await requireLeadership();
    const userHasLeadershipRole = !(leadershipCheck instanceof NextResponse);
    const isOwner = existingResource.owner === auth.userId;

    if (!userHasLeadershipRole && !isOwner) {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Operational fields change a resource's availability/assignment and must not
    // be mutated directly by a plain owner. They are managed by leadership or via
    // the allocation workflow (status/assignedTo are driven by allocate/deallocate).
    const OPERATIONAL_FIELDS = ['status', 'assignedTo', 'quantity', 'capacity'] as const;
    const attemptedOperationalChange = OPERATIONAL_FIELDS.some(
      (field) => requestData[field] !== undefined
    );
    if (attemptedOperationalChange && !userHasLeadershipRole) {
      return NextResponse.json(
        {
          error:
            'Only leadership can change operational fields (status, assignedTo, quantity, capacity). Use the allocation workflow to change assignment.',
        },
        { status: 403 }
      );
    }

    try {
      // Partial validation for update - only validate fields that are provided
      const validatedData: Partial<Resource> = {};

      if (requestData.name !== undefined) {
        validatedData.name = z.string().min(3).parse(requestData.name);
      }

      if (requestData.type !== undefined) {
        validatedData.type = z
          .enum(['Vehicle', 'Ship', 'Equipment', 'Consumable', 'Personnel'])
          .parse(requestData.type);
      }

      if (requestData.status !== undefined) {
        validatedData.status = z
          .enum(['Available', 'Reserved', 'Deployed', 'Maintenance', 'Unavailable'])
          .parse(requestData.status);
      }

      if (requestData.description !== undefined) {
        validatedData.description = z.string().parse(requestData.description);
      }

      if (requestData.location !== undefined) {
        validatedData.location = z.string().parse(requestData.location);
      }

      if (requestData.assignedTo !== undefined) {
        validatedData.assignedTo = z.string().optional().parse(requestData.assignedTo);
      }

      if (requestData.quantity !== undefined) {
        validatedData.quantity = z.number().int().positive().optional().parse(requestData.quantity);
      }

      if (requestData.capacity !== undefined) {
        validatedData.capacity = z.number().int().positive().optional().parse(requestData.capacity);
      }

      if (requestData.specs !== undefined) {
        validatedData.specs = z.record(z.string()).optional().parse(requestData.specs);
      }

      if (requestData.manufacturer !== undefined) {
        validatedData.manufacturer = z.string().optional().parse(requestData.manufacturer);
      }

      if (requestData.model !== undefined) {
        validatedData.model = z.string().optional().parse(requestData.model);
      }

      if (requestData.imageUrl !== undefined) {
        validatedData.imageUrl = z.string().optional().parse(requestData.imageUrl);
      }

      // Only leadership can change ownership
      if (requestData.owner !== undefined) {
        if (!userHasLeadershipRole) {
          return NextResponse.json(
            { error: 'Only leadership can change resource ownership' },
            { status: 403 }
          );
        }
        validatedData.owner = z.string().parse(requestData.owner);
      }

      // Update the resource
      const updatedResource = await resourceStorage.updateResource(resourceId, validatedData);

      if (!updatedResource) {
        return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
      }

      return NextResponse.json(updatedResource);
    } catch (validationError: any) {
      return NextResponse.json(
        {
          error: `Validation error: ${validationError.errors?.[0]?.message || validationError.message}`,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error(
      'Error updating resource',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/resources/[id]' }
    );
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
  }
}

// DELETE /api/fleet-ops/resources/[id] - Delete a resource
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Authenticate user
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const resourceId = id;

    // Get the existing resource
    const existingResource = await resourceStorage.getResourceById(resourceId);
    if (!existingResource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Check if the user has permission to delete this resource
    const leadershipCheck = await requireLeadership();
    const userHasLeadershipRole = !(leadershipCheck instanceof NextResponse);
    const isOwner = existingResource.owner === auth.userId;

    if (!userHasLeadershipRole && !isOwner) {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    // Reject deletion while the resource still has allocations, otherwise those
    // allocations would be orphaned (pointing at a resource that no longer exists).
    const allocations = await resourceStorage.getAllAllocationsByResource(resourceId);
    if (allocations.length > 0) {
      return NextResponse.json(
        {
          error: `Resource has ${allocations.length} active allocation(s). Deallocate them before deleting.`,
        },
        { status: 409 }
      );
    }

    // Delete the resource
    await resourceStorage.deleteResource(resourceId);

    return NextResponse.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    logger.error(
      'Error deleting resource',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/resources/[id]' }
    );
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
  }
}
