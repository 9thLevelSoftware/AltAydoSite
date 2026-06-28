import { NextRequest, NextResponse } from 'next/server';
import * as resourceStorage from '@/lib/resource-storage';
import * as userStorage from '@/lib/user-storage';
import { ResourceType, ResourceStatus } from '@/types/Resource';
import { z } from 'zod';
import { requireAuth, requireLeadership } from '@/lib/auth-guards';
import { logger } from '@/lib/logger';

// Leadership roles mirror the logic in requireLeadership() so that GET can
// branch on visibility without emitting an "access denied" log for normal users.
const LEADERSHIP_ROLES = ['Director', 'Manager', 'Board Member'];

// Validation schema for creating a resource
const resourceSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  type: z.enum(['Vehicle', 'Ship', 'Equipment', 'Consumable', 'Personnel']),
  status: z.enum(['Available', 'Reserved', 'Deployed', 'Maintenance', 'Unavailable']),
  description: z.string(),
  location: z.string(),
  owner: z.string(),
  assignedTo: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
  specs: z.record(z.string()).optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  imageUrl: z.string().optional(),
});

// GET /api/fleet-ops/resources - Get all resources or filter by type, status, owner
export async function GET(req: NextRequest) {
  try {
    // Require an authenticated session
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    // Determine leadership status to scope visibility. Mirrors requireLeadership()
    // without triggering its denial path/log for ordinary users.
    const isLeadership = LEADERSHIP_ROLES.includes(auth.role) || auth.clearanceLevel >= 3;

    // Parse query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') as ResourceType | null;
    const status = searchParams.get('status') as ResourceStatus | null;
    const ownerId = searchParams.get('owner');

    // Get all resources
    let resources = await resourceStorage.getAllResources();

    // Visibility scoping: leadership sees all resources; everyone else only
    // sees resources they own.
    if (!isLeadership) {
      resources = resources.filter((resource) => resource.owner === auth.userId);
    }

    // Apply filters if provided
    if (type) {
      resources = resources.filter((resource) => resource.type === type);
    }

    if (status) {
      resources = resources.filter((resource) => resource.status === status);
    }

    if (ownerId) {
      resources = resources.filter((resource) => resource.owner === ownerId);
    }

    // Enhance resources with owner names
    const resourcesWithOwnerNames = await Promise.all(
      resources.map(async (resource) => {
        const owner = await userStorage.getUserById(resource.owner);
        const ownerName = owner ? owner.aydoHandle : 'Unknown';

        // If assigned to someone, get their name
        let assignedToName;
        if (resource.assignedTo) {
          const assignedUser = await userStorage.getUserById(resource.assignedTo);
          assignedToName = assignedUser ? assignedUser.aydoHandle : 'Unknown';
        }

        return {
          ...resource,
          ownerName,
          assignedToName,
        };
      })
    );

    // Basic pagination at API layer (NaN-guard before clamping)
    const pageRaw = parseInt(searchParams.get('page') || '1', 10);
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '50', 10);
    const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
    const pageSize = Math.min(200, Math.max(1, Number.isFinite(pageSizeRaw) ? pageSizeRaw : 50));
    const start = (page - 1) * pageSize;
    const paged = resourcesWithOwnerNames.slice(start, start + pageSize);

    const res = NextResponse.json({
      items: paged,
      page,
      pageSize,
      total: resourcesWithOwnerNames.length,
      totalPages: Math.ceil(resourcesWithOwnerNames.length / pageSize) || 1,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    logger.error(
      'Error getting resources',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/resources' }
    );
    return NextResponse.json({ error: 'Failed to get resources' }, { status: 500 });
  }
}

// POST /api/fleet-ops/resources - Create a new resource
export async function POST(req: NextRequest) {
  try {
    // Only leadership can create resources
    const auth = await requireLeadership();
    if (auth instanceof NextResponse) return auth;

    // Parse and validate request body
    const requestData = await req.json();

    try {
      const validatedData = resourceSchema.parse(requestData);

      // Verify the supplied owner actually exists before trusting the client.
      // (assignedTo references an operationId, not a user, so it is not checked here.)
      const owner = await userStorage.getUserById(validatedData.owner);
      if (!owner) {
        return NextResponse.json(
          { error: 'Validation error: owner does not reference an existing user' },
          { status: 400 }
        );
      }

      // Create the resource
      const resource = await resourceStorage.createResource(validatedData);

      return NextResponse.json(resource, { status: 201 });
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
      'Error creating resource',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/resources' }
    );
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
  }
}
