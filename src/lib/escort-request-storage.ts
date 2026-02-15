import { EscortRequest, EscortRequestResponse, EscortRequestStatus, EscortRequestFilters } from '@/types/EscortRequest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { shouldUseMongoDb } from './storage-utils';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

// File storage paths
const dataDir = path.join(process.cwd(), 'data');
const escortRequestsFilePath = path.join(dataDir, 'escort-requests.json');

// Helper functions for local file storage
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    console.log(`ESCORT STORAGE: Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(escortRequestsFilePath)) {
    console.log(`ESCORT STORAGE: Creating empty escort requests file: ${escortRequestsFilePath}`);
    fs.writeFileSync(escortRequestsFilePath, JSON.stringify([]), 'utf8');
  }
}

function getLocalEscortRequests(): EscortRequestResponse[] {
  console.log('ESCORT STORAGE: Reading escort requests from local storage');
  ensureDataDir();

  try {
    const data = fs.readFileSync(escortRequestsFilePath, 'utf8');
    const requests = JSON.parse(data) as EscortRequestResponse[];
    console.log(`ESCORT STORAGE: Found ${requests.length} escort requests in local storage`);
    return requests;
  } catch (error) {
    console.error('ESCORT STORAGE: Error reading escort requests file:', error);
    return [];
  }
}

function saveLocalEscortRequest(request: EscortRequestResponse): void {
  console.log(`ESCORT STORAGE: Saving escort request to local storage: ${request.id}`);
  ensureDataDir();

  const requests = getLocalEscortRequests();

  // Check if request already exists
  const existingRequestIndex = requests.findIndex(r => r.id === request.id);
  if (existingRequestIndex >= 0) {
    // Update existing request
    console.log(`ESCORT STORAGE: Updating existing escort request: ${request.id}`);
    requests[existingRequestIndex] = request;
  } else {
    // Add new request
    console.log(`ESCORT STORAGE: Adding new escort request: ${request.id}`);
    requests.push(request);
  }

  fs.writeFileSync(escortRequestsFilePath, JSON.stringify(requests, null, 2), 'utf8');
  console.log(`ESCORT STORAGE: Successfully saved escort requests to file, total count: ${requests.length}`);
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
  console.log(`ESCORT STORAGE: Getting escort request by ID: ${id}`);

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    const request = await db.collection('escort_requests').findOne(filter);

    if (!request) {
      console.log(`ESCORT STORAGE: Escort request not found in MongoDB: ${id}`);
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
      updatedAt: request.updatedAt
    };

    console.log(`ESCORT STORAGE: Found escort request in MongoDB: ${transformedRequest.id}`);
    return transformedRequest;
  } catch (error) {
    console.error('ESCORT STORAGE: MongoDB getEscortRequestById failed:', error);
    throw new Error('Database connection failed: Cannot retrieve escort request data');
  }
}

export async function getAllEscortRequests(filters?: EscortRequestFilters): Promise<EscortRequestResponse[]> {
  console.log('ESCORT STORAGE: Getting all escort requests');

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Prepare query filter
    let query: any = {};
    
    if (filters) {
      if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
      }
      
      if (filters.priority && filters.priority !== 'all') {
        query.priority = filters.priority;
      }
      
      if (filters.assignedTo) {
        query.securityOfficerUserId = filters.assignedTo;
      }
      
      if (filters.requestedBy) {
        query.requestedByUserId = filters.requestedBy;
      }
    }
    
    // Get requests from MongoDB
    const requests = await db.collection('escort_requests').find(query).toArray();
    
    // Transform to EscortRequestResponse objects
    const transformedRequests: EscortRequestResponse[] = requests.map(request => ({
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
      updatedAt: request.updatedAt
    }));
    
    // Sort by createdAt in descending order (newest first)
    transformedRequests.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    
    console.log(`ESCORT STORAGE: Found ${transformedRequests.length} escort requests after applying filters`);
    return transformedRequests;
  } catch (error) {
    console.error('ESCORT STORAGE: MongoDB getAllEscortRequests failed:', error);
    throw new Error('Database connection failed: Cannot retrieve escort request data');
  }
}

export async function createEscortRequest(requestData: Omit<EscortRequestResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<EscortRequestResponse> {
  console.log(`ESCORT STORAGE: Creating escort request for: ${requestData.requestedBy}`);

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Create a complete request object with timestamps
    const request = {
      ...requestData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Insert request into database
    const result = await db.collection('escort_requests').insertOne(request);
    
    if (!result.insertedId) {
      throw new Error('Failed to insert escort request: No insertedId returned');
    }
    
    // Create the final request response with the MongoDB _id
    const createdRequest: EscortRequestResponse = {
      ...request,
      id: result.insertedId.toString()
    } as EscortRequestResponse;
    
    console.log(`ESCORT STORAGE: Escort request created in MongoDB: ${createdRequest.id}`);
    return createdRequest;
  } catch (error) {
    console.error('ESCORT STORAGE: MongoDB createEscortRequest failed:', error);
    throw new Error('Database connection failed: Cannot create escort request');
  }
}

export async function updateEscortRequest(id: string, requestData: Partial<EscortRequestResponse>): Promise<EscortRequestResponse | null> {
  console.log(`ESCORT STORAGE: Updating escort request: ${id}`);

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    console.log(`ESCORT STORAGE: Using filter for update:`, filter);
    
    // Create a MongoDB update document without 'id' field
    const updateData = { ...requestData };
    delete (updateData as any).id; // Remove 'id' as it shouldn't be in the $set
    
    // If _id exists in the data, also delete it to prevent update errors
    if ((updateData as any)._id) {
      delete (updateData as any)._id;
    }
    
    // Update request in database
    const result = await db.collection('escort_requests').updateOne(
      filter,
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date().toISOString()
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      console.log(`ESCORT STORAGE: Escort request not found in MongoDB: ${id}`);
      return null;
    }
    
    // Get updated request
    const updatedRequest = await getEscortRequestById(id);
    console.log(`ESCORT STORAGE: Escort request updated in MongoDB: ${updatedRequest?.id}`);
    return updatedRequest;
  } catch (error) {
    console.error('ESCORT STORAGE: MongoDB updateEscortRequest failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Database connection failed: Cannot update escort request - ${errorMessage}`);
  }
}

export async function deleteEscortRequest(id: string): Promise<boolean> {
  console.log(`ESCORT STORAGE: Deleting escort request: ${id}`);

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    
    // Delete request from database
    const result = await db.collection('escort_requests').deleteOne(filter);
    
    if (result.deletedCount === 0) {
      console.log(`ESCORT STORAGE: Escort request not found in MongoDB: ${id}`);
      return false;
    }
    
    console.log(`ESCORT STORAGE: Escort request deleted from MongoDB: ${id}`);
    return true;
  } catch (error) {
    console.error('ESCORT STORAGE: MongoDB deleteEscortRequest failed:', error);
    throw new Error('Database connection failed: Cannot delete escort request');
  }
} 