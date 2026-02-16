import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import * as resourceStorage from '@/lib/resource-storage';
import * as userStorage from '@/lib/user-storage';
import { ResourceType, ResourceStatus } from '@/types/Resource';
import { z } from 'zod';
import { requireLeadership } from '@/lib/auth-guards';
import { logger } from '@/lib/logger';

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
  imageUrl: z.string().optional()
});

// GET /api/fleet-ops/resources - Get all resources or filter by type, status, owner
export async function GET(req: NextRequest) {
  try {
    // Get the session to check if the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters for filtering
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') as ResourceType | null;
    const status = searchParams.get('status') as ResourceStatus | null;
    const ownerId = searchParams.get('owner');
    
    // Get all resources
    let resources = await resourceStorage.getAllResources();
    
    // Apply filters if provided
    if (type) {
      resources = resources.filter(resource => resource.type === type);
    }
    
    if (status) {
      resources = resources.filter(resource => resource.status === status);
    }
    
    if (ownerId) {
      resources = resources.filter(resource => resource.owner === ownerId);
    }
    
    // Enhance resources with owner names
    const resourcesWithOwnerNames = await Promise.all(resources.map(async (resource) => {
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
        assignedToName
      };
    }));
    
    // Basic pagination at API layer
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || '50', 10);
    const pageSize = Math.min(200, Math.max(1, pageSizeRaw));
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
    logger.error('Error getting resources', error instanceof Error ? error : new Error(String(error)), { route: '/api/fleet-ops/resources' });
    return NextResponse.json(
      { error: 'Failed to get resources' },
      { status: 500 }
    );
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
      
      // Create the resource
      const resource = await resourceStorage.createResource(validatedData);
      
      return NextResponse.json(resource, { status: 201 });
    } catch (validationError: any) {
      return NextResponse.json(
        { error: `Validation error: ${validationError.errors?.[0]?.message || validationError.message}` },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Error creating resource', error instanceof Error ? error : new Error(String(error)), { route: '/api/fleet-ops/resources' });
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    );
  }
}
