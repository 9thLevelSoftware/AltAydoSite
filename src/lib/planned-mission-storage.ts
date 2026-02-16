import { PlannedMissionResponse, PlannedMissionStatus, ExpectedParticipant, ConfirmedParticipant } from '@/types/PlannedMission';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

// File storage paths
const dataDir = path.join(process.cwd(), 'data');
const plannedMissionsFilePath = path.join(dataDir, 'planned-missions.json');

// Tracking if we had to fall back to local storage
let usingFallbackStorage = false;

// Helper functions for local file storage
export function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    console.log(`STORAGE: Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(plannedMissionsFilePath)) {
    console.log(`STORAGE: Creating empty planned missions file: ${plannedMissionsFilePath}`);
    fs.writeFileSync(plannedMissionsFilePath, JSON.stringify([]), 'utf8');
  }
}

export function getLocalPlannedMissions(): PlannedMissionResponse[] {
  console.log('STORAGE: Reading planned missions from local storage');
  ensureDataDir();

  try {
    const data = fs.readFileSync(plannedMissionsFilePath, 'utf8');
    const missions = JSON.parse(data) as PlannedMissionResponse[];
    console.log(`STORAGE: Found ${missions.length} planned missions in local storage`);
    return missions;
  } catch (error) {
    console.error('STORAGE: Error reading planned missions file:', error);
    return [];
  }
}

export function saveLocalPlannedMission(mission: PlannedMissionResponse): void {
  console.log(`STORAGE: Saving planned mission to local storage: ${mission.name}`);
  ensureDataDir();

  const missions = getLocalPlannedMissions();

  // Check if mission already exists
  const existingIndex = missions.findIndex(m => m.id === mission.id);
  if (existingIndex >= 0) {
    console.log(`STORAGE: Updating existing planned mission: ${mission.name}`);
    missions[existingIndex] = mission;
  } else {
    console.log(`STORAGE: Adding new planned mission: ${mission.name}`);
    missions.push(mission);
  }

  fs.writeFileSync(plannedMissionsFilePath, JSON.stringify(missions, null, 2), 'utf8');
  console.log(`STORAGE: Successfully saved planned missions to file, total count: ${missions.length}`);
}

export function deleteLocalPlannedMission(id: string): void {
  console.log(`STORAGE: Deleting planned mission from local storage: ${id}`);
  ensureDataDir();

  const missions = getLocalPlannedMissions();
  const filteredMissions = missions.filter(m => m.id !== id);

  fs.writeFileSync(plannedMissionsFilePath, JSON.stringify(filteredMissions, null, 2), 'utf8');
  console.log(`STORAGE: Planned mission deleted from local storage, remaining missions: ${filteredMissions.length}`);
}

// MongoDB helper functions
function createIdFilter(id: string): any {
  try {
    return { _id: new ObjectId(id) };
  } catch (error) {
    console.log(`ID ${id} is not a valid MongoDB ObjectId, using string ID filter`);
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
    templateId: dbMission.templateId,
    templateName: dbMission.templateName,
    operationType: dbMission.operationType,
    primaryActivity: dbMission.primaryActivity,
    secondaryActivity: dbMission.secondaryActivity,
    tertiaryActivity: dbMission.tertiaryActivity,
    leaders: dbMission.leaders || [],
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
  console.log(`STORAGE: Getting planned mission by ID: ${id}`);

  try {
    const { db } = await connectToDatabase();
    const filter = createIdFilter(id);
    const mission = await db.collection('planned-missions').findOne(filter);

    if (!mission) {
      console.log(`STORAGE: Planned mission not found in MongoDB: ${id}`);
      return null;
    }

    const transformedMission = transformDbToResponse(mission);
    console.log(`STORAGE: Found planned mission in MongoDB: ${transformedMission.name}`);
    return transformedMission;
  } catch (error) {
    console.error('STORAGE: MongoDB getPlannedMissionById failed, falling back to local:', error);
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
  console.log('STORAGE: Getting all planned missions');

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

    console.log(`STORAGE: Found ${transformedMissions.length} planned missions after applying filters`);
    return transformedMissions;
  } catch (error) {
    console.error('STORAGE: MongoDB getAllPlannedMissions failed, falling back to local:', error);
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
  console.log(`STORAGE: Getting paginated planned missions (page=${page}, pageSize=${pageSize})`);

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

    console.log(`STORAGE: Found ${missions.length} of ${total} planned missions (page ${page})`);
    return { missions, total, page, pageSize };
  } catch (error) {
    console.error('STORAGE: MongoDB getAllPlannedMissionsPaginated failed, falling back to local:', error);
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
  console.log(`STORAGE: Getting upcoming planned missions (limit: ${limit})`);

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

    console.log(`STORAGE: Found ${transformedMissions.length} upcoming planned missions`);
    return transformedMissions;
  } catch (error) {
    console.error('STORAGE: MongoDB getUpcomingPlannedMissions failed, falling back to local:', error);
    usingFallbackStorage = true;

    const now = new Date().toISOString();
    return getLocalPlannedMissions()
      .filter(m => m.scheduledDateTime >= now && ['SCHEDULED', 'ACTIVE'].includes(m.status))
      .sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime())
      .slice(0, limit);
  }
}

export async function createPlannedMission(missionData: Omit<PlannedMissionResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlannedMissionResponse> {
  console.log(`STORAGE: Creating planned mission: ${missionData.name}`);

  try {
    const { db } = await connectToDatabase();

    const nowIso = new Date().toISOString();
    const mission = {
      ...missionData,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const result = await db.collection('planned-missions').insertOne(mission);

    const insertedId = (result as any)?.insertedId?.toString?.();
    if (!insertedId) {
      console.warn('STORAGE: No insertedId returned by MongoDB insert, falling back to local');
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

    console.log(`STORAGE: Planned mission created in MongoDB: ${createdMission.name} with ID: ${createdMission.id}`);
    return createdMission;
  } catch (error) {
    console.error('STORAGE: MongoDB createPlannedMission failed, falling back to local:', error);
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

export async function updatePlannedMission(id: string, missionData: Partial<PlannedMissionResponse>): Promise<PlannedMissionResponse | null> {
  console.log(`STORAGE: Updating planned mission: ${id}`);

  try {
    const { db } = await connectToDatabase();

    const filter = createIdFilter(id);

    const updateData = { ...missionData };
    delete (updateData as any).id;
    if ((updateData as any)._id) {
      delete (updateData as any)._id;
    }

    const result = await db.collection('planned-missions').updateOne(
      filter,
      {
        $set: {
          ...updateData,
          updatedAt: new Date().toISOString()
        }
      }
    );

    if (result.matchedCount === 0) {
      console.log(`STORAGE: Planned mission not found in MongoDB: ${id}`);
      return null;
    }

    const updatedMission = await getPlannedMissionById(id);
    console.log(`STORAGE: Planned mission updated in MongoDB: ${updatedMission?.name}`);
    return updatedMission;
  } catch (error: unknown) {
    console.error('STORAGE: MongoDB updatePlannedMission failed, falling back to local:', error);
    usingFallbackStorage = true;
    const missions = getLocalPlannedMissions();
    const existing = missions.find(m => m.id === id);
    if (!existing) return null;
    const updated: PlannedMissionResponse = {
      ...existing,
      ...missionData,
      id: existing.id,
      updatedAt: new Date().toISOString()
    } as PlannedMissionResponse;
    saveLocalPlannedMission(updated);
    return updated;
  }
}

export async function deletePlannedMission(id: string): Promise<boolean> {
  console.log(`STORAGE: Deleting planned mission: ${id}`);

  try {
    const { db } = await connectToDatabase();
    const filter = createIdFilter(id);
    const result = await db.collection('planned-missions').deleteOne(filter);

    if (result.deletedCount === 0) {
      console.log(`STORAGE: Planned mission not found in MongoDB: ${id}`);
      return false;
    }

    console.log(`STORAGE: Planned mission deleted from MongoDB: ${id}`);
    return true;
  } catch (error) {
    console.error('STORAGE: MongoDB deletePlannedMission failed, falling back to local:', error);
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
    console.error('STORAGE: Error checking mission access:', error);
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
    console.error('STORAGE: Error checking mission modification access:', error);
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
    console.error('STORAGE: Error checking mission deletion access:', error);
    return false;
  }
}

export function isUsingFallbackStorage(): boolean {
  return usingFallbackStorage;
}

// Attendance tracking functions

// Update expected participants (from Discord RSVPs)
export async function updateExpectedParticipants(id: string, participants: ExpectedParticipant[]): Promise<PlannedMissionResponse | null> {
  console.log(`STORAGE: Updating expected participants for mission: ${id}`);
  return updatePlannedMission(id, { expectedParticipants: participants });
}

// Add a confirmed participant (leader confirms attendance)
export async function addConfirmedParticipant(id: string, participant: ConfirmedParticipant): Promise<PlannedMissionResponse | null> {
  console.log(`STORAGE: Adding confirmed participant to mission: ${id}`);

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
  console.log(`STORAGE: Removing confirmed participant from mission: ${id}`);

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
  console.log(`STORAGE: Updating confirmed participants for mission: ${id}`);
  return updatePlannedMission(id, { confirmedParticipants: participants });
}

// Get missions in debriefing status (for leaders to mark attendance)
export async function getMissionsAwaitingDebrief(leaderId?: string): Promise<PlannedMissionResponse[]> {
  console.log('STORAGE: Getting missions awaiting debrief');

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
    console.error('STORAGE: MongoDB getMissionsAwaitingDebrief failed, falling back to local:', error);
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
