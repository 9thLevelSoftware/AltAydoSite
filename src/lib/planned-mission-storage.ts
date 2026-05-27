import { PlannedMissionResponse, PlannedMissionStatus, ExpectedParticipant, ConfirmedParticipant } from '@/types/PlannedMission';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import { StaleDocumentError } from './storage-errors';
import { logger } from '@/lib/logger';

// File storage paths
const dataDir = path.join(process.cwd(), 'data');
const plannedMissionsFilePath = path.join(dataDir, 'planned-missions.json');

// Tracking if we had to fall back to local storage
let usingFallbackStorage = false;

type PlannedMissionClearableField =
  | 'secondaryActivity'
  | 'tertiaryActivity'
  | 'duration'
  | 'location'
  | 'equipmentNotes'
  | 'discordEvent'
  | 'creatorName';

type PlannedMissionUpdate = Partial<Omit<PlannedMissionResponse, PlannedMissionClearableField>> & {
  [Field in PlannedMissionClearableField]?: PlannedMissionResponse[Field] | null;
};

const CLEARABLE_UPDATE_FIELDS: ReadonlySet<string> = new Set<PlannedMissionClearableField>([
  'secondaryActivity',
  'tertiaryActivity',
  'duration',
  'location',
  'equipmentNotes',
  'discordEvent',
  'creatorName',
]);

function stripManagedUpdateFields(missionData: PlannedMissionUpdate): Record<string, unknown> {
  const updateFields = { ...(missionData as Record<string, unknown>) };
  delete updateFields.id;
  delete updateFields._id;
  delete updateFields.__v;
  return updateFields;
}

function splitUpdateFields(updateFields: Record<string, unknown>): {
  fieldsToSet: Record<string, unknown>;
  fieldsToUnset: Record<string, ''>;
} {
  const fieldsToSet: Record<string, unknown> = {};
  const fieldsToUnset: Record<string, ''> = {};

  for (const [key, value] of Object.entries(updateFields)) {
    if ((value === null || value === undefined) && CLEARABLE_UPDATE_FIELDS.has(key)) {
      fieldsToUnset[key] = '';
      continue;
    }

    if (value !== undefined) {
      fieldsToSet[key] = value;
    }
  }

  return { fieldsToSet, fieldsToUnset };
}

// Helper functions for local file storage
export function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    logger.info('Creating data directory', { storage: 'Fallback', collection: 'planned-missions', path: dataDir });
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(plannedMissionsFilePath)) {
    logger.info('Creating empty planned missions file', { storage: 'Fallback', collection: 'planned-missions', path: plannedMissionsFilePath });
    fs.writeFileSync(plannedMissionsFilePath, JSON.stringify([]), 'utf8');
  }
}

export function getLocalPlannedMissions(): PlannedMissionResponse[] {
  logger.info('Reading planned missions from local storage', { storage: 'Fallback', collection: 'planned-missions', operation: 'read' });
  ensureDataDir();

  try {
    const data = fs.readFileSync(plannedMissionsFilePath, 'utf8');
    const missions = JSON.parse(data) as PlannedMissionResponse[];
    logger.info('Found planned missions in local storage', { storage: 'Fallback', collection: 'planned-missions', count: missions.length });
    return missions;
  } catch (error) {
    logger.error('Error reading planned missions file', error instanceof Error ? error : new Error(String(error)), { storage: 'Fallback', collection: 'planned-missions' });
    return [];
  }
}

export function saveLocalPlannedMission(mission: PlannedMissionResponse): void {
  logger.info('Saving planned mission to local storage', { storage: 'Fallback', collection: 'planned-missions', operation: 'save', missionName: mission.name });
  ensureDataDir();

  const missions = getLocalPlannedMissions();

  // Check if mission already exists
  const existingIndex = missions.findIndex(m => m.id === mission.id);
  if (existingIndex >= 0) {
    logger.info('Updating existing planned mission', { storage: 'Fallback', collection: 'planned-missions', operation: 'update', missionName: mission.name });
    missions[existingIndex] = mission;
  } else {
    logger.info('Adding new planned mission', { storage: 'Fallback', collection: 'planned-missions', operation: 'insert', missionName: mission.name });
    missions.push(mission);
  }

  fs.writeFileSync(plannedMissionsFilePath, JSON.stringify(missions, null, 2), 'utf8');
  logger.info('Successfully saved planned missions to file', { storage: 'Fallback', collection: 'planned-missions', totalCount: missions.length });
}

export function deleteLocalPlannedMission(id: string): void {
  logger.info('Deleting planned mission from local storage', { storage: 'Fallback', collection: 'planned-missions', operation: 'delete', missionId: id });
  ensureDataDir();

  const missions = getLocalPlannedMissions();
  const filteredMissions = missions.filter(m => m.id !== id);

  fs.writeFileSync(plannedMissionsFilePath, JSON.stringify(filteredMissions, null, 2), 'utf8');
  logger.info('Planned mission deleted from local storage', { storage: 'Fallback', collection: 'planned-missions', remainingCount: filteredMissions.length });
}

// MongoDB helper functions
function createIdFilter(id: string): any {
  try {
    return { _id: new ObjectId(id) };
  } catch (error) {
    logger.info('ID is not a valid MongoDB ObjectId, using string ID filter', { collection: 'planned-missions', id });
    return { id: id };
  }
}

// Transform MongoDB document to PlannedMissionResponse
function transformDbToResponse(dbMission: any): PlannedMissionResponse {
  return {
    id: (dbMission as any)._id.toString(),
    name: dbMission.name,
    scheduledDateTime: dbMission.scheduledDateTime,
    duration: dbMission.duration,
    location: dbMission.location,
    operationType: dbMission.operationType,
    primaryActivity: dbMission.primaryActivity,
    secondaryActivity: dbMission.secondaryActivity,
    tertiaryActivity: dbMission.tertiaryActivity,
    leaders: dbMission.leaders || [],
    shipRequirements: dbMission.shipRequirements || [],
    personnelRequirements: dbMission.personnelRequirements || [],
    ships: dbMission.ships || [],
    objectives: dbMission.objectives || '',
    briefing: dbMission.briefing || '',
    equipmentNotes: dbMission.equipmentNotes,
    images: dbMission.images || [],
    discordEvent: dbMission.discordEvent,
    expectedParticipants: dbMission.expectedParticipants || [],
    confirmedParticipants: dbMission.confirmedParticipants || [],
    status: dbMission.status,
    createdBy: dbMission.createdBy,
    createdAt: dbMission.createdAt,
    updatedAt: dbMission.updatedAt,
    creatorName: dbMission.creatorName
  };
}

// Planned Mission storage API
export async function getPlannedMissionById(id: string): Promise<PlannedMissionResponse | null> {
  logger.info('Getting planned mission by ID', { collection: 'planned-missions', operation: 'getById', missionId: id });

  try {
    const { db } = await connectToDatabase();
    const filter = createIdFilter(id);
    const mission = await db.collection('planned-missions').findOne(filter);

    if (!mission) {
      logger.info('Planned mission not found in MongoDB', { storage: 'MongoDB', collection: 'planned-missions', missionId: id });
      return null;
    }

    const transformedMission = transformDbToResponse(mission);
    logger.info('Found planned mission in MongoDB', { storage: 'MongoDB', collection: 'planned-missions', missionName: transformedMission.name });
    return transformedMission;
  } catch (error) {
    logger.error('MongoDB getPlannedMissionById failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'planned-missions', missionId: id });
    usingFallbackStorage = true;
    return getLocalPlannedMissions().find(m => m.id === id) || null;
  }
}

export async function getAllPlannedMissions(filters?: {
  createdBy?: string;
  status?: PlannedMissionStatus;
  operationType?: string;
  primaryActivity?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<PlannedMissionResponse[]> {
  logger.info('Getting all planned missions', { collection: 'planned-missions', operation: 'getAll' });

  try {
    const { db } = await connectToDatabase();

    let query: any = {};

    if (filters) {
      if (filters.createdBy) {
        query.createdBy = filters.createdBy;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.operationType && filters.operationType !== 'all') {
        query.operationType = filters.operationType;
      }

      if (filters.primaryActivity && filters.primaryActivity !== 'all') {
        query.primaryActivity = filters.primaryActivity;
      }

      // Date range filters
      if (filters.fromDate || filters.toDate) {
        query.scheduledDateTime = {};
        if (filters.fromDate) {
          query.scheduledDateTime.$gte = filters.fromDate;
        }
        if (filters.toDate) {
          query.scheduledDateTime.$lte = filters.toDate;
        }
      }
    }

    const missions = await db.collection('planned-missions').find(query).toArray();

    const transformedMissions: PlannedMissionResponse[] = missions.map(mission =>
      transformDbToResponse(mission)
    );

    // Sort by scheduled date (upcoming first)
    transformedMissions.sort((a, b) => {
      const dateA = new Date(a.scheduledDateTime).getTime();
      const dateB = new Date(b.scheduledDateTime).getTime();
      return dateA - dateB;
    });

    logger.info('Found planned missions after applying filters', { storage: 'MongoDB', collection: 'planned-missions', count: transformedMissions.length });
    return transformedMissions;
  } catch (error) {
    logger.error('MongoDB getAllPlannedMissions failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'planned-missions' });
    usingFallbackStorage = true;

    let locals = getLocalPlannedMissions();
    if (filters) {
      if (filters.createdBy) locals = locals.filter(m => m.createdBy === filters.createdBy);
      if (filters.status) locals = locals.filter(m => m.status === filters.status);
      if (filters.operationType && filters.operationType !== 'all') locals = locals.filter(m => m.operationType === filters.operationType);
      if (filters.primaryActivity && filters.primaryActivity !== 'all') locals = locals.filter(m => m.primaryActivity === filters.primaryActivity);
      if (filters.fromDate) locals = locals.filter(m => m.scheduledDateTime >= filters.fromDate!);
      if (filters.toDate) locals = locals.filter(m => m.scheduledDateTime <= filters.toDate!);
    }
    locals.sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());
    return locals;
  }
}

export interface PaginatedMissionsResult {
  missions: PlannedMissionResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getAllPlannedMissionsPaginated(
  page: number = 1,
  pageSize: number = 25,
  filters?: {
    createdBy?: string;
    status?: PlannedMissionStatus;
    operationType?: string;
    primaryActivity?: string;
    fromDate?: string;
    toDate?: string;
  }
): Promise<PaginatedMissionsResult> {
  logger.info('Getting paginated planned missions', { collection: 'planned-missions', operation: 'getPaginated', page, pageSize });

  try {
    const { db } = await connectToDatabase();

    const query: any = {};

    if (filters) {
      if (filters.createdBy) query.createdBy = filters.createdBy;
      if (filters.status) query.status = filters.status;
      if (filters.operationType && filters.operationType !== 'all') query.operationType = filters.operationType;
      if (filters.primaryActivity && filters.primaryActivity !== 'all') query.primaryActivity = filters.primaryActivity;
      if (filters.fromDate || filters.toDate) {
        query.scheduledDateTime = {};
        if (filters.fromDate) query.scheduledDateTime.$gte = filters.fromDate;
        if (filters.toDate) query.scheduledDateTime.$lte = filters.toDate;
      }
    }

    const total = await db.collection('planned-missions').countDocuments(query);
    const docs = await db.collection('planned-missions')
      .find(query)
      .sort({ scheduledDateTime: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    const missions = docs.map(doc => transformDbToResponse(doc));

    logger.info('Found paginated planned missions', { storage: 'MongoDB', collection: 'planned-missions', count: missions.length, total, page });
    return { missions, total, page, pageSize };
  } catch (error) {
    logger.error('MongoDB getAllPlannedMissionsPaginated failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'planned-missions' });
    usingFallbackStorage = true;

    let locals = getLocalPlannedMissions();
    if (filters) {
      if (filters.createdBy) locals = locals.filter(m => m.createdBy === filters.createdBy);
      if (filters.status) locals = locals.filter(m => m.status === filters.status);
      if (filters.operationType && filters.operationType !== 'all') locals = locals.filter(m => m.operationType === filters.operationType);
      if (filters.primaryActivity && filters.primaryActivity !== 'all') locals = locals.filter(m => m.primaryActivity === filters.primaryActivity);
      if (filters.fromDate) locals = locals.filter(m => m.scheduledDateTime >= filters.fromDate!);
      if (filters.toDate) locals = locals.filter(m => m.scheduledDateTime <= filters.toDate!);
    }
    locals.sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());
    const total = locals.length;
    const start = (page - 1) * pageSize;
    const missions = locals.slice(start, start + pageSize);
    return { missions, total, page, pageSize };
  }
}

export async function getUpcomingPlannedMissions(limit: number = 10): Promise<PlannedMissionResponse[]> {
  logger.info('Getting upcoming planned missions', { collection: 'planned-missions', operation: 'getUpcoming', limit });

  try {
    const { db } = await connectToDatabase();

    const now = new Date().toISOString();
    const missions = await db.collection('planned-missions')
      .find({
        scheduledDateTime: { $gte: now },
        status: { $in: ['SCHEDULED', 'ACTIVE'] }
      })
      .sort({ scheduledDateTime: 1 })
      .limit(limit)
      .toArray();

    const transformedMissions: PlannedMissionResponse[] = missions.map(mission =>
      transformDbToResponse(mission)
    );

    logger.info('Found upcoming planned missions', { storage: 'MongoDB', collection: 'planned-missions', count: transformedMissions.length });
    return transformedMissions;
  } catch (error) {
    logger.error('MongoDB getUpcomingPlannedMissions failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'planned-missions' });
    usingFallbackStorage = true;

    const now = new Date().toISOString();
    return getLocalPlannedMissions()
      .filter(m => m.scheduledDateTime >= now && ['SCHEDULED', 'ACTIVE'].includes(m.status))
      .sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())
      .slice(0, limit);
  }
}

export async function createPlannedMission(missionData: Omit<PlannedMissionResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlannedMissionResponse> {
  logger.info('Creating planned mission', { collection: 'planned-missions', operation: 'create', missionName: missionData.name });

  try {
    const { db } = await connectToDatabase();

    const nowIso = new Date().toISOString();
    const mission = {
      ...missionData,
      createdAt: nowIso,
      updatedAt: nowIso,
      __v: 0
    };

    const result = await db.collection('planned-missions').insertOne(mission);

    const insertedId = (result as any)?.insertedId?.toString?.();
    if (!insertedId) {
      logger.warn('No insertedId returned by MongoDB insert, falling back to local', { storage: 'MongoDB', collection: 'planned-missions' });
      usingFallbackStorage = true;
      const localMission: PlannedMissionResponse = {
        ...mission,
        id: new ObjectId().toString()
      } as PlannedMissionResponse;
      saveLocalPlannedMission(localMission);
      return localMission;
    }

    const createdMission: PlannedMissionResponse = {
      ...mission,
      id: insertedId
    } as PlannedMissionResponse;

    logger.info('Planned mission created in MongoDB', { storage: 'MongoDB', collection: 'planned-missions', missionName: createdMission.name, missionId: createdMission.id });
    return createdMission;
  } catch (error) {
    logger.error('MongoDB createPlannedMission failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'planned-missions', missionName: missionData.name });
    usingFallbackStorage = true;
    const localMission: PlannedMissionResponse = {
      ...missionData,
      id: new ObjectId().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as PlannedMissionResponse;
    saveLocalPlannedMission(localMission);
    return localMission;
  }
}

export async function updatePlannedMission(id: string, missionData: PlannedMissionUpdate, expectedVersion?: number): Promise<PlannedMissionResponse | null> {
  logger.info('Updating planned mission', { collection: 'planned-missions', operation: 'update', missionId: id });

  try {
    const { db } = await connectToDatabase();

    const filter = createIdFilter(id);

    // Build version filter for optimistic locking
    const versionFilter: Record<string, unknown> = {};
    if (expectedVersion !== undefined) {
      if (expectedVersion === 0) {
        versionFilter.$or = [{ __v: 0 }, { __v: { $exists: false } }];
      } else {
        versionFilter.__v = expectedVersion;
      }
    }

    const updateFields = stripManagedUpdateFields(missionData);
    const { fieldsToSet, fieldsToUnset } = splitUpdateFields(updateFields);
    const nowIso = new Date().toISOString();

    const updateOperation: {
      $set: Record<string, unknown>;
      $inc: { __v: number };
      $unset?: Record<string, ''>;
    } = {
      $set: {
        ...fieldsToSet,
        updatedAt: nowIso
      },
      $inc: { __v: 1 }
    };

    if (Object.keys(fieldsToUnset).length > 0) {
      updateOperation.$unset = fieldsToUnset;
    }

    const result = await db.collection('planned-missions').findOneAndUpdate(
      { ...filter, ...versionFilter },
      updateOperation,
      { returnDocument: 'after' }
    );

    if (!result) {
      // Distinguish "not found" from "version mismatch"
      if (expectedVersion !== undefined) {
        const exists = await db.collection('planned-missions').findOne(filter, { projection: { __v: 1 } });
        if (exists) {
          throw new StaleDocumentError('planned-missions', id);
        }
      }
      logger.info('Planned mission not found in MongoDB', { storage: 'MongoDB', collection: 'planned-missions', missionId: id });
      return null;
    }

    const updatedMission = transformDbToResponse(result);
    logger.info('Planned mission updated in MongoDB', { storage: 'MongoDB', collection: 'planned-missions', missionName: updatedMission?.name });
    return updatedMission;
  } catch (error: unknown) {
    if (error instanceof StaleDocumentError) {
      throw error; // Re-throw StaleDocumentError -- do NOT fall back to local storage for version conflicts
    }
    logger.error('MongoDB updatePlannedMission failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'planned-missions', missionId: id });
    usingFallbackStorage = true;
    const missions = getLocalPlannedMissions();
    const existing = missions.find(m => m.id === id);
    if (!existing) return null;
    const updateFields = stripManagedUpdateFields(missionData);
    const { fieldsToSet, fieldsToUnset } = splitUpdateFields(updateFields);
    const updated: PlannedMissionResponse = {
      ...existing,
      ...fieldsToSet,
      id: existing.id,
      updatedAt: new Date().toISOString()
    } as PlannedMissionResponse;
    for (const field of Object.keys(fieldsToUnset)) {
      Reflect.deleteProperty(updated, field);
    }
    saveLocalPlannedMission(updated);
    return updated;
  }
}

export async function deletePlannedMission(id: string): Promise<boolean> {
  logger.info('Deleting planned mission', { collection: 'planned-missions', operation: 'delete', missionId: id });

  try {
    const { db } = await connectToDatabase();
    const filter = createIdFilter(id);
    const result = await db.collection('planned-missions').deleteOne(filter);

    if (result.deletedCount === 0) {
      logger.info('Planned mission not found in MongoDB', { storage: 'MongoDB', collection: 'planned-missions', missionId: id });
      return false;
    }

    logger.info('Planned mission deleted from MongoDB', { storage: 'MongoDB', collection: 'planned-missions', missionId: id });
    return true;
  } catch (error) {
    logger.error('MongoDB deletePlannedMission failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'planned-missions', missionId: id });
    usingFallbackStorage = true;
    const before = getLocalPlannedMissions();
    const existed = before.some(m => m.id === id);
    deleteLocalPlannedMission(id);
    return existed;
  }
}

// Update mission status
export async function updatePlannedMissionStatus(id: string, status: PlannedMissionStatus): Promise<PlannedMissionResponse | null> {
  return updatePlannedMission(id, { status });
}

// Link Discord event to mission
export async function linkDiscordEvent(id: string, discordEvent: PlannedMissionResponse['discordEvent']): Promise<PlannedMissionResponse | null> {
  return updatePlannedMission(id, { discordEvent });
}

// Authorization helper functions
export async function canUserAccessMission(userId: string, missionId: string): Promise<boolean> {
  try {
    const mission = await getPlannedMissionById(missionId);
    if (!mission) {
      return false;
    }
    // All users can view planned missions
    return true;
  } catch (error) {
    logger.error('Error checking mission access', error instanceof Error ? error : new Error(String(error)), { collection: 'planned-missions', userId, missionId });
    return false;
  }
}

export async function canUserModifyMission(userId: string, missionId: string): Promise<boolean> {
  try {
    const mission = await getPlannedMissionById(missionId);
    if (!mission) {
      return false;
    }

    // Creator can modify
    if (mission.createdBy === userId) {
      return true;
    }

    // Leaders can modify
    const isLeader = mission.leaders.some(leader => leader.userId === userId);
    return isLeader;
  } catch (error) {
    logger.error('Error checking mission modification access', error instanceof Error ? error : new Error(String(error)), { collection: 'planned-missions', userId, missionId });
    return false;
  }
}

export async function canUserDeleteMission(userId: string, missionId: string): Promise<boolean> {
  try {
    const mission = await getPlannedMissionById(missionId);
    if (!mission) {
      return false;
    }

    // Only creator can delete
    return mission.createdBy === userId;
  } catch (error) {
    logger.error('Error checking mission deletion access', error instanceof Error ? error : new Error(String(error)), { collection: 'planned-missions', userId, missionId });
    return false;
  }
}

export function isUsingFallbackStorage(): boolean {
  return usingFallbackStorage;
}

// Attendance tracking functions

// Update expected participants (from Discord RSVPs)
export async function updateExpectedParticipants(id: string, participants: ExpectedParticipant[]): Promise<PlannedMissionResponse | null> {
  logger.info('Updating expected participants for mission', { collection: 'planned-missions', operation: 'updateExpectedParticipants', missionId: id });
  return updatePlannedMission(id, { expectedParticipants: participants });
}

// Add a confirmed participant (leader confirms attendance)
export async function addConfirmedParticipant(id: string, participant: ConfirmedParticipant): Promise<PlannedMissionResponse | null> {
  logger.info('Adding confirmed participant to mission', { collection: 'planned-missions', operation: 'addConfirmedParticipant', missionId: id });

  const mission = await getPlannedMissionById(id);
  if (!mission) {
    return null;
  }

  // Check if already confirmed
  const existingIndex = mission.confirmedParticipants.findIndex(
    p => p.odId === participant.odId
  );

  let updatedParticipants: ConfirmedParticipant[];
  if (existingIndex >= 0) {
    // Update existing
    updatedParticipants = [...mission.confirmedParticipants];
    updatedParticipants[existingIndex] = participant;
  } else {
    // Add new
    updatedParticipants = [...mission.confirmedParticipants, participant];
  }

  return updatePlannedMission(id, { confirmedParticipants: updatedParticipants });
}

// Remove a confirmed participant
export async function removeConfirmedParticipant(id: string, odId: string): Promise<PlannedMissionResponse | null> {
  logger.info('Removing confirmed participant from mission', { collection: 'planned-missions', operation: 'removeConfirmedParticipant', missionId: id });

  const mission = await getPlannedMissionById(id);
  if (!mission) {
    return null;
  }

  const updatedParticipants = mission.confirmedParticipants.filter(
    p => p.odId !== odId
  );

  return updatePlannedMission(id, { confirmedParticipants: updatedParticipants });
}

// Bulk update confirmed participants (for debriefing)
export async function updateConfirmedParticipants(id: string, participants: ConfirmedParticipant[]): Promise<PlannedMissionResponse | null> {
  logger.info('Updating confirmed participants for mission', { collection: 'planned-missions', operation: 'updateConfirmedParticipants', missionId: id });
  return updatePlannedMission(id, { confirmedParticipants: participants });
}

// Get missions in debriefing status (for leaders to mark attendance)
export async function getMissionsAwaitingDebrief(leaderId?: string): Promise<PlannedMissionResponse[]> {
  logger.info('Getting missions awaiting debrief', { collection: 'planned-missions', operation: 'getAwaitingDebrief', leaderId });

  try {
    const { db } = await connectToDatabase();

    let query: any = { status: 'DEBRIEFING' };

    // If leaderId provided, only get missions where they are a leader
    if (leaderId) {
      query['leaders.userId'] = leaderId;
    }

    const missions = await db.collection('planned-missions')
      .find(query)
      .sort({ scheduledDateTime: -1 })
      .toArray();

    return missions.map(mission => transformDbToResponse(mission));
  } catch (error) {
    logger.error('MongoDB getMissionsAwaitingDebrief failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'planned-missions' });
    usingFallbackStorage = true;

    let locals = getLocalPlannedMissions().filter(m => m.status === 'DEBRIEFING');
    if (leaderId) {
      locals = locals.filter(m => m.leaders.some(l => l.userId === leaderId));
    }
    return locals.sort((a, b) =>
      new Date(b.scheduledDateTime).getTime() - new Date(a.scheduledDateTime).getTime()
    );
  }
}
