import { MissionResponse, MissionStatus, MissionType } from '@/types/Mission';
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
const missionsFilePath = path.join(dataDir, 'missions.json');

// Tracking if we had to fall back to local storage
let usingFallbackStorage = false;

// Helper functions for local file storage
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    logger.info('Creating data directory', { storage: 'Fallback', collection: 'missions', path: dataDir });
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(missionsFilePath)) {
    logger.info('Creating empty missions file', { storage: 'Fallback', collection: 'missions', path: missionsFilePath });
    fs.writeFileSync(missionsFilePath, JSON.stringify([]), 'utf8');
  }
}

function getLocalMissions(): MissionResponse[] {
  logger.info('Reading missions from local storage', { storage: 'Fallback', collection: 'missions', operation: 'read' });
  ensureDataDir();

  try {
    const data = fs.readFileSync(missionsFilePath, 'utf8');
    const missions = JSON.parse(data) as MissionResponse[];
    logger.info('Found missions in local storage', { storage: 'Fallback', collection: 'missions', count: missions.length });
    return missions;
  } catch (error) {
    logger.error('Error reading missions file', error instanceof Error ? error : new Error(String(error)), { storage: 'Fallback', collection: 'missions' });
    return [];
  }
}

function saveLocalMission(mission: MissionResponse): void {
  logger.info('Saving mission to local storage', { storage: 'Fallback', collection: 'missions', operation: 'save', missionName: mission.name });
  ensureDataDir();

  const missions = getLocalMissions();

  // Check if mission already exists
  const existingMissionIndex = missions.findIndex(m => m.id === mission.id);
  if (existingMissionIndex >= 0) {
    // Update existing mission
    logger.info('Updating existing mission', { storage: 'Fallback', collection: 'missions', operation: 'update', missionName: mission.name });
    missions[existingMissionIndex] = mission;
  } else {
    // Add new mission
    logger.info('Adding new mission', { storage: 'Fallback', collection: 'missions', operation: 'insert', missionName: mission.name });
    missions.push(mission);
  }

  fs.writeFileSync(missionsFilePath, JSON.stringify(missions, null, 2), 'utf8');
  logger.info('Successfully saved missions to file', { storage: 'Fallback', collection: 'missions', totalCount: missions.length });
}

function deleteLocalMission(id: string): void {
  logger.info('Deleting mission from local storage', { storage: 'Fallback', collection: 'missions', operation: 'delete', missionId: id });
  ensureDataDir();

  const missions = getLocalMissions();
  const filteredMissions = missions.filter(m => m.id !== id);

  fs.writeFileSync(missionsFilePath, JSON.stringify(filteredMissions, null, 2), 'utf8');
  logger.info('Mission deleted from local storage', { storage: 'Fallback', collection: 'missions', remainingCount: filteredMissions.length });
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
    logger.info('ID is not a valid MongoDB ObjectId, using string ID filter', { collection: 'missions', id });
    return { id: id };
  }
}

// Mission storage API
export async function getMissionById(id: string): Promise<MissionResponse | null> {
  logger.info('Getting mission by ID', { collection: 'missions', operation: 'getById', missionId: id });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    const mission = await db.collection('missions').findOne(filter);

    if (!mission) {
      logger.info('Mission not found in MongoDB', { storage: 'MongoDB', collection: 'missions', missionId: id });
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

    logger.info('Found mission in MongoDB', { storage: 'MongoDB', collection: 'missions', missionName: transformedMission.name });
    return transformedMission;
  } catch (error) {
    logger.error('MongoDB getMissionById failed', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'missions', missionId: id });
    throw new Error('Database connection failed: Cannot retrieve mission data');
  }
}

export async function getAllMissions(filters?: { status?: string; leaderId?: string; userId?: string }): Promise<MissionResponse[]> {
  logger.info('Getting all missions', { collection: 'missions', operation: 'getAll' });

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

    logger.info('Found missions after applying filters', { storage: 'MongoDB', collection: 'missions', count: transformedMissions.length });
    return transformedMissions;
  } catch (error) {
    logger.error('MongoDB getAllMissions failed', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'missions' });
    throw new Error('Database connection failed: Cannot retrieve mission data');
  }
}

export async function createMission(missionData: Omit<MissionResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<MissionResponse> {
  logger.info('Creating mission', { collection: 'missions', operation: 'create', missionName: missionData.name });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a complete mission object with timestamps and version
    const mission = {
      ...missionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0
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

    logger.info('Mission created in MongoDB', { storage: 'MongoDB', collection: 'missions', missionName: createdMission.name, missionId: createdMission.id });
    return createdMission;
  } catch (error) {
    logger.error('MongoDB createMission failed', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'missions', missionName: missionData.name });
    throw new Error('Database connection failed: Cannot create mission');
  }
}

export async function updateMission(id: string, missionData: Partial<MissionResponse>, expectedVersion?: number): Promise<MissionResponse | null> {
  logger.info('Updating mission', { collection: 'missions', operation: 'update', missionId: id });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    logger.info('Using filter for update', { storage: 'MongoDB', collection: 'missions', filter: JSON.stringify(filter) });

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
    const { id: _id, _id: _mongoId, __v: _v, ...updateFields } = missionData as any;

    // Log the update data for debugging
    logger.info('Update data prepared', { storage: 'MongoDB', collection: 'missions', updateDataPreview: JSON.stringify(updateFields).substring(0, 200) + '...' });

    try {
      // Update mission in database with optimistic locking
      const result = await db.collection('missions').findOneAndUpdate(
        { ...filter, ...versionFilter },
        {
          $set: {
            ...updateFields,
            updatedAt: new Date().toISOString()
          },
          $inc: { __v: 1 }
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        // Distinguish "not found" from "version mismatch"
        if (expectedVersion !== undefined) {
          const exists = await db.collection('missions').findOne(filter, { projection: { __v: 1 } });
          if (exists) {
            throw new StaleDocumentError('missions', id);
          }
        }
        logger.info('Mission not found in MongoDB', { storage: 'MongoDB', collection: 'missions', missionId: id });
        return null;
      }

      // Transform to MissionResponse
      const updatedMission: MissionResponse = {
        id: result._id.toString(),
        name: result.name,
        type: result.type,
        scheduledDateTime: result.scheduledDateTime,
        status: result.status,
        briefSummary: result.briefSummary || '',
        details: result.details || '',
        location: result.location || '',
        leaderId: result.leaderId,
        leaderName: result.leaderName || '',
        images: result.images || [],
        participants: result.participants || [],
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      };

      logger.info('Mission updated in MongoDB', { storage: 'MongoDB', collection: 'missions', missionName: updatedMission?.name });
      return updatedMission;
    } catch (updateError: unknown) {
      if (updateError instanceof StaleDocumentError) {
        throw updateError;
      }
      logger.error('MongoDB update operation failed', updateError instanceof Error ? updateError : new Error(String(updateError)), { storage: 'MongoDB', collection: 'missions', missionId: id });
      const errorMsg = updateError instanceof Error ? updateError.message : 'Unknown update error';
      throw new Error(`Database update operation failed: ${errorMsg}`);
    }
  } catch (error: unknown) {
    if (error instanceof StaleDocumentError) {
      throw error; // Re-throw StaleDocumentError -- do NOT fall back to local storage for version conflicts
    }
    logger.error('MongoDB updateMission failed', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'missions', missionId: id });

    // Try to provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.info('Falling back to local storage due to error', { storage: 'MongoDB', collection: 'missions', errorMessage });

    // Optional: Implement fallback to local storage here if needed

    throw new Error(`Database connection failed: Cannot update mission - ${errorMessage}`);
  }
}

export async function deleteMission(id: string): Promise<boolean> {
  logger.info('Deleting mission', { collection: 'missions', operation: 'delete', missionId: id });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a filter that works with the ID format
    const filter = createIdFilter(id);

    // Delete mission from database
    const result = await db.collection('missions').deleteOne(filter);

    if (result.deletedCount === 0) {
      logger.info('Mission not found in MongoDB', { storage: 'MongoDB', collection: 'missions', missionId: id });
      return false;
    }

    logger.info('Mission deleted from MongoDB', { storage: 'MongoDB', collection: 'missions', missionId: id });
    return true;
  } catch (error) {
    logger.error('MongoDB deleteMission failed', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'missions', missionId: id });
    throw new Error('Database connection failed: Cannot delete mission');
  }
}

export function isUsingFallbackStorage(): boolean {
  return usingFallbackStorage;
}
