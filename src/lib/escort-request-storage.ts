import {
  EscortRequest,
  EscortRequestResponse,
  EscortRequestStatus,
  EscortRequestFilters,
} from '@/types/EscortRequest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { shouldUseMongoDb } from './storage-utils';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import { StaleDocumentError } from './storage-errors';
import { logger } from '@/lib/logger';

// File storage paths
const dataDir = path.join(process.cwd(), 'data');
const escortRequestsFilePath = path.join(dataDir, 'escort-requests.json');

// Helper functions for local file storage
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    logger.info('Creating data directory', {
      storage: 'Fallback',
      collection: 'escort_requests',
      path: dataDir,
    });
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(escortRequestsFilePath)) {
    logger.info('Creating empty escort requests file', {
      storage: 'Fallback',
      collection: 'escort_requests',
      path: escortRequestsFilePath,
    });
    fs.writeFileSync(escortRequestsFilePath, JSON.stringify([]), 'utf8');
  }
}

function getLocalEscortRequests(): EscortRequestResponse[] {
  logger.info('Reading escort requests from local storage', {
    storage: 'Fallback',
    collection: 'escort_requests',
    operation: 'read',
  });
  ensureDataDir();

  try {
    const data = fs.readFileSync(escortRequestsFilePath, 'utf8');
    const requests = JSON.parse(data) as EscortRequestResponse[];
    logger.info('Found escort requests in local storage', {
      storage: 'Fallback',
      collection: 'escort_requests',
      count: requests.length,
    });
    return requests;
  } catch (error) {
    logger.error(
      'Error reading escort requests file',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'Fallback', collection: 'escort_requests' }
    );
    return [];
  }
}

function saveLocalEscortRequest(request: EscortRequestResponse): void {
  logger.info('Saving escort request to local storage', {
    storage: 'Fallback',
    collection: 'escort_requests',
    operation: 'save',
    requestId: request.id,
  });
  ensureDataDir();

  const requests = getLocalEscortRequests();

  // Check if request already exists
  const existingRequestIndex = requests.findIndex((r) => r.id === request.id);
  if (existingRequestIndex >= 0) {
    // Update existing request
    logger.info('Updating existing escort request', {
      storage: 'Fallback',
      collection: 'escort_requests',
      operation: 'update',
      requestId: request.id,
    });
    requests[existingRequestIndex] = request;
  } else {
    // Add new request
    logger.info('Adding new escort request', {
      storage: 'Fallback',
      collection: 'escort_requests',
      operation: 'insert',
      requestId: request.id,
    });
    requests.push(request);
  }

  fs.writeFileSync(escortRequestsFilePath, JSON.stringify(requests, null, 2), 'utf8');
  logger.info('Successfully saved escort requests to file', {
    storage: 'Fallback',
    collection: 'escort_requests',
    totalCount: requests.length,
  });
}

// Helper function to create appropriate ID filter for MongoDB queries
function createIdFilter(id: string) {
  try {
    // Try to create an ObjectId if the ID looks like a MongoDB ObjectId
    if (ObjectId.isValid(id) && id.length === 24) {
      return { _id: new ObjectId(id) };
    } else {
      // Fallback to string ID field
      return { id: id };
    }
  } catch {
    // If ObjectId creation fails, use string ID
    return { id: id };
  }
}

// Escort Request storage API
export async function getEscortRequestById(id: string): Promise<EscortRequestResponse | null> {
  logger.info('Getting escort request by ID', {
    collection: 'escort_requests',
    operation: 'getById',
    requestId: id,
  });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    const request = await db.collection('escort_requests').findOne(filter);

    if (!request) {
      logger.info('Escort request not found in MongoDB', {
        storage: 'MongoDB',
        collection: 'escort_requests',
        requestId: id,
      });
      return null;
    }

    // Transform MongoDB document to EscortRequestResponse
    const transformedRequest: EscortRequestResponse = {
      id: request._id.toString(),
      requestedBy: request.requestedBy,
      requestedByUserId: request.requestedByUserId,
      threatAssessment: request.threatAssessment,
      threatLevel: request.threatLevel,
      shipsToEscort: request.shipsToEscort,
      startLocation: request.startLocation,
      endLocation: request.endLocation,
      secondaryLocations: request.secondaryLocations || '',
      plannedRoute: request.plannedRoute,
      assetsRequested: request.assetsRequested || [],
      additionalNotes: request.additionalNotes || '',
      status: request.status,
      priority: request.priority,
      estimatedDuration: request.estimatedDuration,
      preferredDateTime: request.preferredDateTime,
      assignedPersonnel: request.assignedPersonnel || [],
      assignedSecurityOfficer: request.assignedSecurityOfficer,
      securityOfficerUserId: request.securityOfficerUserId,
      completionNotes: request.completionNotes,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      __v: request.__v ?? 0,
    } as EscortRequestResponse;

    logger.info('Found escort request in MongoDB', {
      storage: 'MongoDB',
      collection: 'escort_requests',
      requestId: transformedRequest.id,
    });
    return transformedRequest;
  } catch (error) {
    logger.error(
      'MongoDB getEscortRequestById failed',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'escort_requests', requestId: id }
    );
    throw new Error('Database connection failed: Cannot retrieve escort request data');
  }
}

export async function getAllEscortRequests(
  filters?: EscortRequestFilters,
  ownerScope?: string
): Promise<EscortRequestResponse[]> {
  logger.info('Getting all escort requests', {
    collection: 'escort_requests',
    operation: 'getAll',
  });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Prepare query filter
    const query: any = {};

    if (filters) {
      if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
      }

      if (filters.priority && filters.priority !== 'all') {
        query.priority = filters.priority;
      }

      // Ownership-scoped requests are handled via ownerScope below; only
      // leadership callers may filter by arbitrary requestedBy/assignedTo.
      if (!ownerScope) {
        if (filters.assignedTo) {
          query.securityOfficerUserId = filters.assignedTo;
        }

        if (filters.requestedBy) {
          query.requestedByUserId = filters.requestedBy;
        }
      }
    }

    // Restrict non-leadership callers to requests they own (creator) or are
    // assigned to (security officer), regardless of any client-supplied filters.
    if (ownerScope) {
      query.$or = [{ requestedByUserId: ownerScope }, { securityOfficerUserId: ownerScope }];
    }

    // Get requests from MongoDB
    const requests = await db.collection('escort_requests').find(query).toArray();

    // Transform to EscortRequestResponse objects
    const transformedRequests: EscortRequestResponse[] = requests.map(
      (request) =>
        ({
          id: request._id.toString(),
          requestedBy: request.requestedBy,
          requestedByUserId: request.requestedByUserId,
          threatAssessment: request.threatAssessment,
          threatLevel: request.threatLevel,
          shipsToEscort: request.shipsToEscort,
          startLocation: request.startLocation,
          endLocation: request.endLocation,
          secondaryLocations: request.secondaryLocations || '',
          plannedRoute: request.plannedRoute,
          assetsRequested: request.assetsRequested || [],
          additionalNotes: request.additionalNotes || '',
          status: request.status,
          priority: request.priority,
          estimatedDuration: request.estimatedDuration,
          preferredDateTime: request.preferredDateTime,
          assignedPersonnel: request.assignedPersonnel || [],
          assignedSecurityOfficer: request.assignedSecurityOfficer,
          securityOfficerUserId: request.securityOfficerUserId,
          completionNotes: request.completionNotes,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          __v: request.__v ?? 0,
        }) as EscortRequestResponse
    );

    // Sort by createdAt in descending order (newest first)
    transformedRequests.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    logger.info('Found escort requests after applying filters', {
      storage: 'MongoDB',
      collection: 'escort_requests',
      count: transformedRequests.length,
    });
    return transformedRequests;
  } catch (error) {
    logger.error(
      'MongoDB getAllEscortRequests failed',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'escort_requests' }
    );
    throw new Error('Database connection failed: Cannot retrieve escort request data');
  }
}

export async function createEscortRequest(
  requestData: Omit<EscortRequestResponse, 'id' | 'createdAt' | 'updatedAt'>
): Promise<EscortRequestResponse> {
  logger.info('Creating escort request', {
    collection: 'escort_requests',
    operation: 'create',
    requestedBy: requestData.requestedBy,
  });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a complete request object with timestamps and version
    const request = {
      ...requestData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
    };

    // Insert request into database
    const result = await db.collection('escort_requests').insertOne(request);

    if (!result.insertedId) {
      throw new Error('Failed to insert escort request: No insertedId returned');
    }

    // Create the final request response with the MongoDB _id
    const createdRequest: EscortRequestResponse = {
      ...request,
      id: result.insertedId.toString(),
    } as EscortRequestResponse;

    logger.info('Escort request created in MongoDB', {
      storage: 'MongoDB',
      collection: 'escort_requests',
      requestId: createdRequest.id,
    });
    return createdRequest;
  } catch (error) {
    logger.error(
      'MongoDB createEscortRequest failed',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'escort_requests', requestedBy: requestData.requestedBy }
    );
    throw new Error('Database connection failed: Cannot create escort request');
  }
}

export async function updateEscortRequest(
  id: string,
  requestData: Partial<EscortRequestResponse>,
  expectedVersion?: number
): Promise<EscortRequestResponse | null> {
  logger.info('Updating escort request', {
    collection: 'escort_requests',
    operation: 'update',
    requestId: id,
  });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    logger.info('Using filter for update', {
      storage: 'MongoDB',
      collection: 'escort_requests',
      filter: JSON.stringify(filter),
    });

    // Build version filter for optimistic locking
    const versionFilter: Record<string, unknown> = {};
    if (expectedVersion !== undefined) {
      if (expectedVersion === 0) {
        versionFilter.$or = [{ __v: 0 }, { __v: { $exists: false } }];
      } else {
        versionFilter.__v = expectedVersion;
      }
    }

    // Strip id, _id, and __v from update data to prevent conflicts
    const { id: _id, _id: _mongoId, __v: _v, ...updateFields } = requestData as any;

    // Update request in database with optimistic locking
    const result = await db.collection('escort_requests').findOneAndUpdate(
      { ...filter, ...versionFilter },
      {
        $set: {
          ...updateFields,
          updatedAt: new Date().toISOString(),
        },
        $inc: { __v: 1 },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      // Distinguish "not found" from "version mismatch"
      if (expectedVersion !== undefined) {
        const exists = await db
          .collection('escort_requests')
          .findOne(filter, { projection: { __v: 1 } });
        if (exists) {
          throw new StaleDocumentError('escort_requests', id);
        }
      }
      logger.info('Escort request not found in MongoDB', {
        storage: 'MongoDB',
        collection: 'escort_requests',
        requestId: id,
      });
      return null;
    }

    // Transform to EscortRequestResponse
    const updatedRequest: EscortRequestResponse = {
      id: result._id.toString(),
      requestedBy: result.requestedBy,
      requestedByUserId: result.requestedByUserId,
      threatAssessment: result.threatAssessment,
      threatLevel: result.threatLevel,
      shipsToEscort: result.shipsToEscort,
      startLocation: result.startLocation,
      endLocation: result.endLocation,
      secondaryLocations: result.secondaryLocations || '',
      plannedRoute: result.plannedRoute,
      assetsRequested: result.assetsRequested || [],
      additionalNotes: result.additionalNotes || '',
      status: result.status,
      priority: result.priority,
      estimatedDuration: result.estimatedDuration,
      preferredDateTime: result.preferredDateTime,
      assignedPersonnel: result.assignedPersonnel || [],
      assignedSecurityOfficer: result.assignedSecurityOfficer,
      securityOfficerUserId: result.securityOfficerUserId,
      completionNotes: result.completionNotes,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      __v: result.__v ?? 0,
    } as EscortRequestResponse;

    logger.info('Escort request updated in MongoDB', {
      storage: 'MongoDB',
      collection: 'escort_requests',
      requestId: updatedRequest?.id,
    });
    return updatedRequest;
  } catch (error) {
    if (error instanceof StaleDocumentError) {
      throw error; // Re-throw StaleDocumentError -- do NOT fall back to local storage for version conflicts
    }
    logger.error(
      'MongoDB updateEscortRequest failed',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'escort_requests', requestId: id }
    );
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Database connection failed: Cannot update escort request - ${errorMessage}`);
  }
}

export async function deleteEscortRequest(id: string): Promise<boolean> {
  logger.info('Deleting escort request', {
    collection: 'escort_requests',
    operation: 'delete',
    requestId: id,
  });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a filter that works with the ID format
    const filter = createIdFilter(id);

    // Delete request from database
    const result = await db.collection('escort_requests').deleteOne(filter);

    if (result.deletedCount === 0) {
      logger.info('Escort request not found in MongoDB', {
        storage: 'MongoDB',
        collection: 'escort_requests',
        requestId: id,
      });
      return false;
    }

    logger.info('Escort request deleted from MongoDB', {
      storage: 'MongoDB',
      collection: 'escort_requests',
      requestId: id,
    });
    return true;
  } catch (error) {
    logger.error(
      'MongoDB deleteEscortRequest failed',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'escort_requests', requestId: id }
    );
    throw new Error('Database connection failed: Cannot delete escort request');
  }
}
