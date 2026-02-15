import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { EscortRequestResponse, EscortRequestStatus, EscortRequestFilters } from '@/types/EscortRequest';
import * as escortRequestStorage from '@/lib/escort-request-storage';

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

    console.log('Fetching escort requests with filters:', filters);

    // Get escort requests using the escort-request-storage module
    const requests = await escortRequestStorage.getAllEscortRequests(filters);

    console.log(`Returning ${requests.length} escort requests`);

    return NextResponse.json(requests);

  } catch (error) {
    console.error('Error fetching escort requests:', error);
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
      console.log('Escort request created successfully:', escortRequest.id);
      return NextResponse.json(escortRequest, { status: 201 });
    } catch (storageError) {
      console.error('Error in escort request storage layer:', storageError);

      return NextResponse.json(
        { error: 'Failed to create escort request' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating escort request:', error);

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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const requestData = await request.json();

    // Basic validation
    if (!requestData || !requestData.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
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

      console.log('Escort request updated successfully:', escortRequest.id);
      return NextResponse.json(escortRequest, { status: 200 });
    } catch (storageError) {
      console.error('Error in escort request storage layer:', storageError);

      return NextResponse.json(
        { error: 'Failed to update escort request' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating escort request:', error);

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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
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

      console.log('Escort request deleted successfully:', id);
      return NextResponse.json({ message: 'Escort request deleted successfully' }, { status: 200 });
    } catch (storageError) {
      console.error('Error in escort request storage layer:', storageError);

      return NextResponse.json(
        { error: 'Failed to delete escort request' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting escort request:', error);

    return NextResponse.json(
      { error: 'Failed to delete escort request' },
      { status: 500 }
    );
  }
} 