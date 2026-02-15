import { MissionResponse, MissionStatus, MissionType } from '@/types/Mission';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { shouldUseMongoDb } from './storage-utils';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

// File storage paths
const dataDir = path.join(process.cwd(), 'data');
const missionsFilePath = path.join(dataDir, 'missions.json');

// Tracking if we had to fall back to local storage
let usingFallbackStorage = false;

// Helper functions for local file storage
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    console.log(`STORAGE: Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(missionsFilePath)) {
    console.log(`STORAGE: Creating empty missions file: ${missionsFilePath}`);
    fs.writeFileSync(missionsFilePath, JSON.stringify([]), 'utf8');
  }
}

function getLocalMissions(): MissionResponse[] {
  console.log('STORAGE: Reading missions from local storage');
  ensureDataDir();

  try {
    const data = fs.readFileSync(missionsFilePath, 'utf8');
    const missions = JSON.parse(data) as MissionResponse[];
    console.log(`STORAGE: Found ${missions.length} missions in local storage`);
    return missions;
  } catch (error) {
    console.error('STORAGE: Error reading missions file:', error);
    return [];
  }
}

function saveLocalMission(mission: MissionResponse): void {
  console.log(`STORAGE: Saving mission to local storage: ${mission.name}`);
  ensureDataDir();

  const missions = getLocalMissions();

  // Check if mission already exists
  const existingMissionIndex = missions.findIndex(m => m.id === mission.id);
  if (existingMissionIndex >= 0) {
    // Update existing mission
    console.log(`STORAGE: Updating existing mission: ${mission.name}`);
    missions[existingMissionIndex] = mission;
  } else {
    // Add new mission
    console.log(`STORAGE: Adding new mission: ${mission.name}`);
    missions.push(mission);
  }

  fs.writeFileSync(missionsFilePath, JSON.stringify(missions, null, 2), 'utf8');
  console.log(`STORAGE: Successfully saved missions to file, total count: ${missions.length}`);
}

function deleteLocalMission(id: string): void {
  console.log(`STORAGE: Deleting mission from local storage: ${id}`);
  ensureDataDir();

  const missions = getLocalMissions();
  const filteredMissions = missions.filter(m => m.id !== id);

  fs.writeFileSync(missionsFilePath, JSON.stringify(filteredMissions, null, 2), 'utf8');
  console.log(`STORAGE: Mission deleted from local storage, remaining missions: ${filteredMissions.length}`);
}

// MongoDB helper functions
function tryConvertToObjectId(id: string): ObjectId | string {
  try {
    return new ObjectId(id);
  } catch (error) {
    return id;
  }
}

function createIdFilter(id: string): any {
  try {
    // Try to convert to MongoDB ObjectId
    return { _id: new ObjectId(id) };
  } catch (error) {
    // If conversion fails, it's not a valid ObjectId format
    console.log(`ID ${id} is not a valid MongoDB ObjectId, using string ID filter`);
    return { id: id };
  }
}

// Mission storage API
export async function getMissionById(id: string): Promise<MissionResponse | null> {
  console.log(`STORAGE: Getting mission by ID: ${id}`);

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    const mission = await db.collection('missions').findOne(filter);

    if (!mission) {
      console.log(`STORAGE: Mission not found in MongoDB: ${id}`);
      return null;
    }

    // Transform MongoDB document to MissionResponse
    const transformedMission: MissionResponse = {
      id: mission._id.toString(),
      name: mission.name,
      type: mission.type,
      scheduledDateTime: mission.scheduledDateTime,
      status: mission.status,
      briefSummary: mission.briefSummary || '',
      details: mission.details || '',
      location: mission.location || '',
      leaderId: mission.leaderId,
      leaderName: mission.leaderName || '',
      images: mission.images || [],
      participants: mission.participants || [],
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt
    };

    console.log(`STORAGE: Found mission in MongoDB: ${transformedMission.name}`);
    return transformedMission;
  } catch (error) {
    console.error('STORAGE: MongoDB getMissionById failed:', error);
    throw new Error('Database connection failed: Cannot retrieve mission data');
  }
}

export async function getAllMissions(filters?: { status?: string; leaderId?: string; userId?: string }): Promise<MissionResponse[]> {
  console.log('STORAGE: Getting all missions');

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Prepare query filter
    let query: any = {};
    
    if (filters) {
      if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
      }
      
      if (filters.leaderId) {
        query.leaderId = filters.leaderId;
      }
      
      if (filters.userId) {
        query = {
          $or: [
            { leaderId: filters.userId },
            { 'participants.userId': filters.userId }
          ]
        };
      }
    }
    
    // Get missions from MongoDB
    const missions = await db.collection('missions').find(query).toArray();
    
    // Transform to MissionResponse objects
    const transformedMissions: MissionResponse[] = missions.map(mission => ({
      id: mission._id.toString(),
      name: mission.name,
      type: mission.type,
      scheduledDateTime: mission.scheduledDateTime,
      status: mission.status,
      briefSummary: mission.briefSummary || '',
      details: mission.details || '',
      location: mission.location || '',
      leaderId: mission.leaderId,
      leaderName: mission.leaderName || '',
      images: mission.images || [],
      participants: mission.participants || [],
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt
    }));
    
    // Sort by scheduledDateTime in descending order
    transformedMissions.sort((a, b) => {
      const dateA = new Date(a.scheduledDateTime).getTime();
      const dateB = new Date(b.scheduledDateTime).getTime();
      return dateB - dateA;
    });
    
    console.log(`STORAGE: Found ${transformedMissions.length} missions after applying filters`);
    return transformedMissions;
  } catch (error) {
    console.error('STORAGE: MongoDB getAllMissions failed:', error);
    throw new Error('Database connection failed: Cannot retrieve mission data');
  }
}

export async function createMission(missionData: Omit<MissionResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<MissionResponse> {
  console.log(`STORAGE: Creating mission: ${missionData.name}`);

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Create a complete mission object with timestamps
    const mission = {
      ...missionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Insert mission into database
    const result = await db.collection('missions').insertOne(mission);
    
    if (!result.insertedId) {
      throw new Error('Failed to insert mission: No insertedId returned');
    }
    
    // Create the final mission response with the MongoDB _id
    const createdMission: MissionResponse = {
      ...mission,
      id: result.insertedId.toString()
    } as MissionResponse;
    
    console.log(`STORAGE: Mission created in MongoDB: ${createdMission.name} with ID: ${createdMission.id}`);
    return createdMission;
  } catch (error) {
    console.error('STORAGE: MongoDB createMission failed:', error);
    throw new Error('Database connection failed: Cannot create mission');
  }
}

export async function updateMission(id: string, missionData: Partial<MissionResponse>): Promise<MissionResponse | null> {
  console.log(`STORAGE: Updating mission: ${id}`);

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    console.log(`STORAGE: Using filter for update:`, filter);
    
    // Create a MongoDB update document without 'id' field
    const updateData = { ...missionData };
    delete (updateData as any).id; // Remove 'id' as it shouldn't be in the $set
    
    // If _id exists in the data, also delete it to prevent update errors
    if ((updateData as any)._id) {
      delete (updateData as any)._id;
    }
    
    // Log the update data for debugging
    console.log(`STORAGE: Update data prepared:`, JSON.stringify(updateData, null, 2).substring(0, 200) + '...');
    
    try {
      // Update mission in database
      const result = await db.collection('missions').updateOne(
        filter,
        { 
          $set: { 
            ...updateData,
            updatedAt: new Date().toISOString()
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        console.log(`STORAGE: Mission not found in MongoDB: ${id}`);
        return null;
      }
      
      // Get updated mission
      const updatedMission = await getMissionById(id);
      console.log(`STORAGE: Mission updated in MongoDB: ${updatedMission?.name}`);
      return updatedMission;
    } catch (updateError: unknown) {
      console.error('STORAGE: MongoDB update operation failed:', updateError);
      const errorMsg = updateError instanceof Error ? updateError.message : 'Unknown update error';
      throw new Error(`Database update operation failed: ${errorMsg}`);
    }
  } catch (error: unknown) {
    console.error('STORAGE: MongoDB updateMission failed:', error);
    
    // Try to provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`STORAGE: Falling back to local storage due to error: ${errorMessage}`);
    
    // Optional: Implement fallback to local storage here if needed
    
    throw new Error(`Database connection failed: Cannot update mission - ${errorMessage}`);
  }
}

export async function deleteMission(id: string): Promise<boolean> {
  console.log(`STORAGE: Deleting mission: ${id}`);

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    
    // Delete mission from database
    const result = await db.collection('missions').deleteOne(filter);
    
    if (result.deletedCount === 0) {
      console.log(`STORAGE: Mission not found in MongoDB: ${id}`);
      return false;
    }
    
    console.log(`STORAGE: Mission deleted from MongoDB: ${id}`);
    return true;
  } catch (error) {
    console.error('STORAGE: MongoDB deleteMission failed:', error);
    throw new Error('Database connection failed: Cannot delete mission');
  }
}

export function isUsingFallbackStorage(): boolean {
  return usingFallbackStorage;
}
