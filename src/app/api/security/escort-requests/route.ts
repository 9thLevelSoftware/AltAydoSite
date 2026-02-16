import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { requireAuth, AuthResult } from '@/lib/auth-guards';
import { EscortRequestResponse, EscortRequestStatus, EscortRequestFilters } from '@/types/EscortRequest';
import * as escortRequestStorage from '@/lib/escort-request-storage';
import { logger } from '@/lib/logger';

const LEADERSHIP_ROLES = ['Director', 'Manager', 'Board Member'];

function isLeadership(auth: AuthResult): boolean {
  return LEADERSHIP_ROLES.includes(auth.role) || auth.clearanceLevel >= 3;
}

// Validation for escort request data
const validateEscortRequestData = (data: any) => {
  if (!data.requestedBy || typeof data.requestedBy !== 'string' || data.requestedBy.length < 2) {
    return { valid: false, error: 'Requested by field must be at least 2 characters' };
  }

  if (!data.startLocation || typeof data.startLocation !== 'string' || data.startLocation.length < 3) {
    return { valid: false, error: 'Start location must be at least 3 characters' };
  }

  if (!data.endLocation || typeof data.endLocation !== 'string' || data.endLocation.length < 3) {
    return { valid: false, error: 'End location must be at least 3 characters' };
  }

  if (!data.plannedRoute || typeof data.plannedRoute !== 'string' || data.plannedRoute.length < 10) {
    return { valid: false, error: 'Planned route must be at least 10 characters' };
  }

  if (!data.shipsToEscort || typeof data.shipsToEscort !== 'number' || data.shipsToEscort < 1) {
    return { valid: false, error: 'Number of ships to escort must be at least 1' };
  }

  if (!data.threatAssessment || !['done', 'needed'].includes(data.threatAssessment)) {
    return { valid: false, error: 'Threat assessment must be either "done" or "needed"' };
  }

  // Get all valid request statuses
  const validStatuses = ['Submitted', 'Under Review', 'Approved', 'Assigned', 'In Progress', 'Completed', 'Cancelled', 'Rejected'];
  
  if (data.status && !validStatuses.includes(data.status)) {
    return { valid: false, error: 'Invalid status' };
  }

  const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
  if (data.priority && !validPriorities.includes(data.priority)) {
    return { valid: false, error: 'Invalid priority level' };
  }

  return { valid: true };
};

// GET handler - List escort requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: EscortRequestFilters = {};

    const status = searchParams.get('status');
    if (status) filters.status = status as EscortRequestStatus | 'all';

    const priority = searchParams.get('priority');
    if (priority) filters.priority = priority;

    const assignedTo = searchParams.get('assignedTo');
    if (assignedTo) filters.assignedTo = assignedTo;

    const requestedBy = searchParams.get('requestedBy');
    if (requestedBy) filters.requestedBy = requestedBy;

    logger.info('Fetching escort requests', { route: '/api/security/escort-requests', filters });

    // Get escort requests using the escort-request-storage module
    const requests = await escortRequestStorage.getAllEscortRequests(filters);

    logger.info('Returning escort requests', { route: '/api/security/escort-requests', count: requests.length });

    return NextResponse.json(requests);

  } catch (error) {
    logger.error('Error fetching escort requests', error instanceof Error ? error : new Error(String(error)), { route: '/api/security/escort-requests' });
    return NextResponse.json(
      { error: 'Failed to fetch escort requests' },
      { status: 500 }
    );
  }
}

// POST handler - Create a new escort request
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const requestData = await request.json();

    // Validate required fields
    const validation = validateEscortRequestData(requestData);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Set default values and ensure proper structure
    const escortRequestData = {
      requestedBy: requestData.requestedBy,
      requestedByUserId: session.user.id,
      threatAssessment: requestData.threatAssessment,
      threatLevel: requestData.threatLevel || undefined,
      shipsToEscort: requestData.shipsToEscort,
      startLocation: requestData.startLocation,
      endLocation: requestData.endLocation,
      secondaryLocations: requestData.secondaryLocations || '',
      plannedRoute: requestData.plannedRoute,
      assetsRequested: requestData.assetsRequested || [],
      additionalNotes: requestData.additionalNotes || '',
      status: (requestData.status as EscortRequestStatus) || 'Submitted',
      priority: requestData.priority || 'Medium',
      estimatedDuration: requestData.estimatedDuration || undefined,
      preferredDateTime: requestData.preferredDateTime || undefined,
      assignedPersonnel: requestData.assignedPersonnel || [],
      assignedSecurityOfficer: requestData.assignedSecurityOfficer || undefined,
      securityOfficerUserId: requestData.securityOfficerUserId || undefined,
      completionNotes: requestData.completionNotes || undefined
    };

    try {
      // Create escort request using the escort-request-storage module
      const escortRequest = await escortRequestStorage.createEscortRequest(escortRequestData);
      logger.info('Escort request created successfully', { route: '/api/security/escort-requests', requestId: escortRequest.id });
      return NextResponse.json(escortRequest, { status: 201 });
    } catch (storageError) {
      logger.error('Error in escort request storage layer', storageError instanceof Error ? storageError : new Error(String(storageError)), { route: '/api/security/escort-requests', operation: 'create' });

      return NextResponse.json(
        { error: 'Failed to create escort request' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error creating escort request', error instanceof Error ? error : new Error(String(error)), { route: '/api/security/escort-requests' });

    return NextResponse.json(
      { error: 'Failed to create escort request' },
      { status: 500 }
    );
  }
}

// PUT handler - Update an existing escort request
export async function PUT(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    // Parse request body
    const requestData = await request.json();

    // Basic validation
    if (!requestData || !requestData.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Ownership check: creator, assigned security officer, or leadership
    const existing = await escortRequestStorage.getEscortRequestById(requestData.id);
    if (!existing) {
      return NextResponse.json(
        { error: `Escort request not found with ID: ${requestData.id}` },
        { status: 404 }
      );
    }

    const isCreator = existing.requestedByUserId === auth.userId;
    const isAssignedOfficer = existing.securityOfficerUserId === auth.userId;
    const hasLeadership = isLeadership(auth);

    if (!isCreator && !isAssignedOfficer && !hasLeadership) {
      logger.info('RBAC_AUDIT: User denied PUT on escort request', { route: '/api/security/escort-requests', userId: auth.userId, requestId: requestData.id, reason: 'not creator/officer/leadership' });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    try {
      // Update escort request using the escort-request-storage module
      const escortRequest = await escortRequestStorage.updateEscortRequest(requestData.id, requestData);

      if (!escortRequest) {
        return NextResponse.json(
          { error: `Escort request not found with ID: ${requestData.id}` },
          { status: 404 }
        );
      }

      logger.info('Escort request updated successfully', { route: '/api/security/escort-requests', requestId: escortRequest.id });
      return NextResponse.json(escortRequest, { status: 200 });
    } catch (storageError) {
      logger.error('Error in escort request storage layer', storageError instanceof Error ? storageError : new Error(String(storageError)), { route: '/api/security/escort-requests', operation: 'update' });

      return NextResponse.json(
        { error: 'Failed to update escort request' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error updating escort request', error instanceof Error ? error : new Error(String(error)), { route: '/api/security/escort-requests' });

    return NextResponse.json(
      { error: 'Failed to update escort request' },
      { status: 500 }
    );
  }
}

// DELETE handler - Delete an escort request
export async function DELETE(request: NextRequest) {
  try {
    // Check authorization
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Ownership check: only creator or leadership can delete (officer cannot)
    const existing = await escortRequestStorage.getEscortRequestById(id);
    if (!existing) {
      return NextResponse.json(
        { error: `Escort request not found with ID: ${id}` },
        { status: 404 }
      );
    }

    const isCreator = existing.requestedByUserId === auth.userId;
    const hasLeadership = isLeadership(auth);

    if (!isCreator && !hasLeadership) {
      logger.info('RBAC_AUDIT: User denied DELETE on escort request', { route: '/api/security/escort-requests', userId: auth.userId, requestId: id, reason: 'not creator/leadership' });
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    try {
      // Delete escort request using the escort-request-storage module
      const deleted = await escortRequestStorage.deleteEscortRequest(id);

      if (!deleted) {
        return NextResponse.json(
          { error: `Escort request not found with ID: ${id}` },
          { status: 404 }
        );
      }

      logger.info('Escort request deleted successfully', { route: '/api/security/escort-requests', requestId: id });
      return NextResponse.json({ message: 'Escort request deleted successfully' }, { status: 200 });
    } catch (storageError) {
      logger.error('Error in escort request storage layer', storageError instanceof Error ? storageError : new Error(String(storageError)), { route: '/api/security/escort-requests', operation: 'delete' });

      return NextResponse.json(
        { error: 'Failed to delete escort request' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error deleting escort request', error instanceof Error ? error : new Error(String(error)), { route: '/api/security/escort-requests' });

    return NextResponse.json(
      { error: 'Failed to delete escort request' },
      { status: 500 }
    );
  }
} 