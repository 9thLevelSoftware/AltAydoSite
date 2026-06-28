import { MissionResponse } from '@/types/Mission';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import { StaleDocumentError } from './storage-errors';
import { logger } from '@/lib/logger';

// Missions are stored exclusively in MongoDB (Cosmos DB). There is no local
// JSON fallback for this collection -- DB failures surface as thrown errors so
// callers can respond with an appropriate 5xx rather than silently diverging.

// Fields that callers are allowed to mutate via updateMission. Anything else
// (id, _id, __v, createdAt, etc.) is ignored to prevent mass-assignment.
const MUTABLE_MISSION_FIELDS = [
  'name',
  'type',
  'scheduledDateTime',
  'status',
  'briefSummary',
  'details',
  'location',
  'leaderId',
  'leaderName',
  'images',
  'participants',
] as const;

// MongoDB helper functions
function createIdFilter(id: string): any {
  try {
    // Try to convert to MongoDB ObjectId
    return { _id: new ObjectId(id) };
  } catch (error) {
    // If conversion fails, it's not a valid ObjectId format
    logger.info('ID is not a valid MongoDB ObjectId, using string ID filter', {
      collection: 'missions',
      id,
    });
    return { id: id };
  }
}

// Mission storage API
export async function getMissionById(id: string): Promise<MissionResponse | null> {
  logger.info('Getting mission by ID', {
    collection: 'missions',
    operation: 'getById',
    missionId: id,
  });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    const mission = await db.collection('missions').findOne(filter);

    if (!mission) {
      logger.info('Mission not found in MongoDB', {
        storage: 'MongoDB',
        collection: 'missions',
        missionId: id,
      });
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
      updatedAt: mission.updatedAt,
      version: typeof mission.__v === 'number' ? mission.__v : undefined,
    };

    logger.info('Found mission in MongoDB', {
      storage: 'MongoDB',
      collection: 'missions',
      missionName: transformedMission.name,
    });
    return transformedMission;
  } catch (error) {
    logger.error(
      'MongoDB getMissionById failed',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'missions', missionId: id }
    );
    throw new Error('Database connection failed: Cannot retrieve mission data');
  }
}

export async function getAllMissions(filters?: {
  status?: string;
  leaderId?: string;
  userId?: string;
}): Promise<MissionResponse[]> {
  logger.info('Getting all missions', { collection: 'missions', operation: 'getAll' });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Prepare query filter -- compose conditions additively so the user scope
    // does not clobber status/leaderId constraints.
    const conditions: any[] = [];

    if (filters) {
      if (filters.status && filters.status !== 'all') {
        conditions.push({ status: filters.status });
      }

      if (filters.leaderId) {
        conditions.push({ leaderId: filters.leaderId });
      }

      if (filters.userId) {
        conditions.push({
          $or: [{ leaderId: filters.userId }, { 'participants.userId': filters.userId }],
        });
      }
    }

    const query: any = conditions.length ? { $and: conditions } : {};

    // Get missions from MongoDB
    const missions = await db.collection('missions').find(query).toArray();

    // Transform to MissionResponse objects
    const transformedMissions: MissionResponse[] = missions.map((mission) => ({
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
      updatedAt: mission.updatedAt,
      version: typeof mission.__v === 'number' ? mission.__v : undefined,
    }));

    // Sort by scheduledDateTime in descending order
    transformedMissions.sort((a, b) => {
      const dateA = new Date(a.scheduledDateTime).getTime();
      const dateB = new Date(b.scheduledDateTime).getTime();
      return dateB - dateA;
    });

    logger.info('Found missions after applying filters', {
      storage: 'MongoDB',
      collection: 'missions',
      count: transformedMissions.length,
    });
    return transformedMissions;
  } catch (error) {
    logger.error(
      'MongoDB getAllMissions failed',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'missions' }
    );
    throw new Error('Database connection failed: Cannot retrieve mission data');
  }
}

export async function createMission(
  missionData: Omit<MissionResponse, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MissionResponse> {
  logger.info('Creating mission', {
    collection: 'missions',
    operation: 'create',
    missionName: missionData.name,
  });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a complete mission object with timestamps and version
    const mission = {
      ...missionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
    };

    // Insert mission into database
    const result = await db.collection('missions').insertOne(mission);

    if (!result.insertedId) {
      throw new Error('Failed to insert mission: No insertedId returned');
    }

    // Create the final mission response with the MongoDB _id
    const createdMission: MissionResponse = {
      ...mission,
      id: result.insertedId.toString(),
      version: mission.__v,
    } as MissionResponse;

    logger.info('Mission created in MongoDB', {
      storage: 'MongoDB',
      collection: 'missions',
      missionName: createdMission.name,
      missionId: createdMission.id,
    });
    return createdMission;
  } catch (error) {
    logger.error(
      'MongoDB createMission failed',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'missions', missionName: missionData.name }
    );
    throw new Error('Database connection failed: Cannot create mission');
  }
}

export async function updateMission(
  id: string,
  missionData: Partial<MissionResponse>,
  expectedVersion?: number
): Promise<MissionResponse | null> {
  logger.info('Updating mission', { collection: 'missions', operation: 'update', missionId: id });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    logger.info('Using filter for update', {
      storage: 'MongoDB',
      collection: 'missions',
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

    // Build the $set payload from an explicit allowlist of mutable fields.
    // Unknown keys (and id/_id/__v/createdAt) are ignored to prevent
    // mass-assignment of arbitrary client-supplied fields.
    const source = missionData as Record<string, unknown>;
    const updateFields: Record<string, unknown> = {};
    for (const key of MUTABLE_MISSION_FIELDS) {
      if (source[key] !== undefined) {
        updateFields[key] = source[key];
      }
    }

    // Log the update data for debugging
    logger.info('Update data prepared', {
      storage: 'MongoDB',
      collection: 'missions',
      updateDataPreview: JSON.stringify(updateFields).substring(0, 200) + '...',
    });

    try {
      // Update mission in database with optimistic locking
      const result = await db.collection('missions').findOneAndUpdate(
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
            .collection('missions')
            .findOne(filter, { projection: { __v: 1 } });
          if (exists) {
            throw new StaleDocumentError('missions', id);
          }
        }
        logger.info('Mission not found in MongoDB', {
          storage: 'MongoDB',
          collection: 'missions',
          missionId: id,
        });
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
        updatedAt: result.updatedAt,
        version: typeof result.__v === 'number' ? result.__v : undefined,
      };

      logger.info('Mission updated in MongoDB', {
        storage: 'MongoDB',
        collection: 'missions',
        missionName: updatedMission?.name,
      });
      return updatedMission;
    } catch (updateError: unknown) {
      if (updateError instanceof StaleDocumentError) {
        throw updateError;
      }
      logger.error(
        'MongoDB update operation failed',
        updateError instanceof Error ? updateError : new Error(String(updateError)),
        { storage: 'MongoDB', collection: 'missions', missionId: id }
      );
      const errorMsg = updateError instanceof Error ? updateError.message : 'Unknown update error';
      throw new Error(`Database update operation failed: ${errorMsg}`);
    }
  } catch (error: unknown) {
    if (error instanceof StaleDocumentError) {
      throw error; // Re-throw StaleDocumentError -- do NOT fall back to local storage for version conflicts
    }
    logger.error(
      'MongoDB updateMission failed',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'missions', missionId: id }
    );

    // Missions have no local-storage fallback; surface the failure to the caller.
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
      logger.info('Mission not found in MongoDB', {
        storage: 'MongoDB',
        collection: 'missions',
        missionId: id,
      });
      return false;
    }

    logger.info('Mission deleted from MongoDB', {
      storage: 'MongoDB',
      collection: 'missions',
      missionId: id,
    });
    return true;
  } catch (error) {
    logger.error(
      'MongoDB deleteMission failed',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'missions', missionId: id }
    );
    throw new Error('Database connection failed: Cannot delete mission');
  }
}
