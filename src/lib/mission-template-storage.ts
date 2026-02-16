import { MissionTemplateResponse } from '@/types/MissionTemplate';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import * as userStorage from '@/lib/user-storage';
import { StaleDocumentError } from './storage-errors';
import { logger } from '@/lib/logger';

// File storage paths
const dataDir = path.join(process.cwd(), 'data');
const missionTemplatesFilePath = path.join(dataDir, 'mission-templates.json');

// Tracking if we had to fall back to local storage
let usingFallbackStorage = false;

// Helper functions for local file storage
export function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    logger.info('Creating data directory', { storage: 'Fallback', collection: 'mission-templates', path: dataDir });
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(missionTemplatesFilePath)) {
    logger.info('Creating empty mission templates file', { storage: 'Fallback', collection: 'mission-templates', path: missionTemplatesFilePath });
    fs.writeFileSync(missionTemplatesFilePath, JSON.stringify([]), 'utf8');
  }
}

export function getLocalMissionTemplates(): MissionTemplateResponse[] {
  logger.info('Reading mission templates from local storage', { storage: 'Fallback', collection: 'mission-templates', operation: 'read' });
  ensureDataDir();

  try {
    const data = fs.readFileSync(missionTemplatesFilePath, 'utf8');
    const templates = JSON.parse(data) as MissionTemplateResponse[];
    logger.info('Found mission templates in local storage', { storage: 'Fallback', collection: 'mission-templates', count: templates.length });
    return templates;
  } catch (error) {
    logger.error('Error reading mission templates file', error instanceof Error ? error : new Error(String(error)), { storage: 'Fallback', collection: 'mission-templates' });
    return [];
  }
}

export function saveLocalMissionTemplate(template: MissionTemplateResponse): void {
  logger.info('Saving mission template to local storage', { storage: 'Fallback', collection: 'mission-templates', operation: 'save', templateName: template.name });
  ensureDataDir();

  const templates = getLocalMissionTemplates();

  // Check if template already exists
  const existingTemplateIndex = templates.findIndex(t => t.id === template.id);
  if (existingTemplateIndex >= 0) {
    // Update existing template
    logger.info('Updating existing mission template', { storage: 'Fallback', collection: 'mission-templates', operation: 'update', templateName: template.name });
    templates[existingTemplateIndex] = template;
  } else {
    // Add new template
    logger.info('Adding new mission template', { storage: 'Fallback', collection: 'mission-templates', operation: 'insert', templateName: template.name });
    templates.push(template);
  }

  fs.writeFileSync(missionTemplatesFilePath, JSON.stringify(templates, null, 2), 'utf8');
  logger.info('Successfully saved mission templates to file', { storage: 'Fallback', collection: 'mission-templates', totalCount: templates.length });
}

export function deleteLocalMissionTemplate(id: string): void {
  logger.info('Deleting mission template from local storage', { storage: 'Fallback', collection: 'mission-templates', operation: 'delete', templateId: id });
  ensureDataDir();

  const templates = getLocalMissionTemplates();
  const filteredTemplates = templates.filter(t => t.id !== id);

  fs.writeFileSync(missionTemplatesFilePath, JSON.stringify(filteredTemplates, null, 2), 'utf8');
  logger.info('Mission template deleted from local storage', { storage: 'Fallback', collection: 'mission-templates', remainingCount: filteredTemplates.length });
}

// MongoDB helper functions
function createIdFilter(id: string): any {
  try {
    // Try to convert to MongoDB ObjectId
    return { _id: new ObjectId(id) };
  } catch (error) {
    // If conversion fails, it's not a valid ObjectId format
    logger.info('ID is not a valid MongoDB ObjectId, using string ID filter', { collection: 'mission-templates', id });
    return { id: id };
  }
}

// Transform MongoDB document to MissionTemplateResponse
function transformDbToResponse(dbTemplate: any): MissionTemplateResponse {
  return {
    id: (dbTemplate as any)._id.toString(),
    name: dbTemplate.name,
    operationType: dbTemplate.operationType,
    primaryActivity: dbTemplate.primaryActivity,
    secondaryActivity: dbTemplate.secondaryActivity,
    tertiaryActivity: dbTemplate.tertiaryActivity,
    shipRoster: dbTemplate.shipRoster || [],
    personnelRoster: dbTemplate.personnelRoster || [],
    requiredEquipment: dbTemplate.requiredEquipment || '',
    createdBy: dbTemplate.createdBy,
    createdAt: dbTemplate.createdAt,
    updatedAt: dbTemplate.updatedAt,
    creatorName: dbTemplate.creatorName
  };
}

// Mission Template storage API
export async function getMissionTemplateById(id: string): Promise<MissionTemplateResponse | null> {
  logger.info('Getting mission template by ID', { collection: 'mission-templates', operation: 'getById', templateId: id });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    const template = await db.collection('mission-templates').findOne(filter);

    if (!template) {
      logger.info('Mission template not found in MongoDB', { storage: 'MongoDB', collection: 'mission-templates', templateId: id });
      return null;
    }

    // Transform MongoDB document to MissionTemplateResponse
    const transformedTemplate = transformDbToResponse(template);

    logger.info('Found mission template in MongoDB', { storage: 'MongoDB', collection: 'mission-templates', templateName: transformedTemplate.name });
    return transformedTemplate;
  } catch (error) {
    logger.error('MongoDB getMissionTemplateById failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'mission-templates', templateId: id });
    usingFallbackStorage = true;
    return getLocalMissionTemplates().find(t => t.id === id) || null;
  }
}

export async function getAllMissionTemplates(filters?: {
  createdBy?: string;
  operationType?: string;
  primaryActivity?: string;
  userId?: string;
}): Promise<MissionTemplateResponse[]> {
  logger.info('Getting all mission templates', { collection: 'mission-templates', operation: 'getAll' });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Prepare query filter
    let query: any = {};

    if (filters) {
      if (filters.createdBy) {
        query.createdBy = filters.createdBy;
      }

      if (filters.operationType && filters.operationType !== 'all') {
        query.operationType = filters.operationType;
      }

      if (filters.primaryActivity && filters.primaryActivity !== 'all') {
        query.primaryActivity = filters.primaryActivity;
      }

      // For userId filter, we'll show templates created by the user or public templates
      if (filters.userId) {
        query = {
          $or: [
            { createdBy: filters.userId },
            { isPublic: true } // Assuming we might add public templates in the future
          ]
        };
      }
    }

    // Get mission templates from MongoDB
    const templates = await db.collection('mission-templates').find(query).toArray();

    // Transform to MissionTemplateResponse objects
    const transformedTemplates: MissionTemplateResponse[] = templates.map(template =>
      transformDbToResponse(template)
    );

    // Sort by createdAt in descending order (newest first)
    transformedTemplates.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    logger.info('Found mission templates after applying filters', { storage: 'MongoDB', collection: 'mission-templates', count: transformedTemplates.length });
    return transformedTemplates;
  } catch (error) {
    logger.error('MongoDB getAllMissionTemplates failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'mission-templates' });
    usingFallbackStorage = true;
    // Fallback: filter local templates
    let locals = getLocalMissionTemplates();
    if (filters) {
      if (filters.createdBy) locals = locals.filter(t => t.createdBy === filters.createdBy);
      if (filters.operationType && filters.operationType !== 'all') locals = locals.filter(t => t.operationType === filters.operationType);
      if (filters.primaryActivity && filters.primaryActivity !== 'all') locals = locals.filter(t => t.primaryActivity === filters.primaryActivity);
      if (filters.userId) locals = locals.filter(t => t.createdBy === filters.userId);
    }
    // Sort newest first
    locals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return locals;
  }
}

export async function createMissionTemplate(templateData: Omit<MissionTemplateResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<MissionTemplateResponse> {
  logger.info('Creating mission template', { collection: 'mission-templates', operation: 'create', templateName: templateData.name });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a complete template object with timestamps and version
    const nowIso = new Date().toISOString();
    const template = {
      ...templateData,
      createdAt: nowIso,
      updatedAt: nowIso,
      __v: 0
    };

    // Insert template into database
    const result = await db.collection('mission-templates').insertOne(template);

    const insertedId = (result as any)?.insertedId?.toString?.();
    if (!insertedId) {
      logger.warn('No insertedId returned by MongoDB insert, falling back to local', { storage: 'MongoDB', collection: 'mission-templates' });
      usingFallbackStorage = true;
      const localTemplate: MissionTemplateResponse = {
        ...template,
        id: new ObjectId().toString()
      } as MissionTemplateResponse;
      saveLocalMissionTemplate(localTemplate);
      return localTemplate;
    }

    // Create the final template response with the MongoDB _id
    const createdTemplate: MissionTemplateResponse = {
      ...template,
      id: insertedId
    } as MissionTemplateResponse;

    logger.info('Mission template created in MongoDB', { storage: 'MongoDB', collection: 'mission-templates', templateName: createdTemplate.name, templateId: createdTemplate.id });
    return createdTemplate;
  } catch (error) {
    logger.error('MongoDB createMissionTemplate failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'mission-templates', templateName: templateData.name });
    usingFallbackStorage = true;
    const localTemplate: MissionTemplateResponse = {
      ...templateData,
      id: new ObjectId().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as MissionTemplateResponse;
    saveLocalMissionTemplate(localTemplate);
    return localTemplate;
  }
}

export async function updateMissionTemplate(id: string, templateData: Partial<MissionTemplateResponse>, expectedVersion?: number): Promise<MissionTemplateResponse | null> {
  logger.info('Updating mission template', { collection: 'mission-templates', operation: 'update', templateId: id });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a filter that works with the ID format
    const filter = createIdFilter(id);
    logger.info('Using filter for update', { storage: 'MongoDB', collection: 'mission-templates', filter: JSON.stringify(filter) });

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
    const { id: _id, _id: _mongoId, __v: _v, ...updateFields } = templateData as any;

    // Log the update data for debugging
    logger.info('Update data prepared', { storage: 'MongoDB', collection: 'mission-templates', updateDataPreview: JSON.stringify(updateFields).substring(0, 200) + '...' });

    // Update template in database with optimistic locking
    const result = await db.collection('mission-templates').findOneAndUpdate(
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
        const exists = await db.collection('mission-templates').findOne(filter, { projection: { __v: 1 } });
        if (exists) {
          throw new StaleDocumentError('mission-templates', id);
        }
      }
      logger.info('Mission template not found in MongoDB', { storage: 'MongoDB', collection: 'mission-templates', templateId: id });
      return null;
    }

    // Transform to MissionTemplateResponse
    const updatedTemplate = transformDbToResponse(result);
    logger.info('Mission template updated in MongoDB', { storage: 'MongoDB', collection: 'mission-templates', templateName: updatedTemplate?.name });
    return updatedTemplate;
  } catch (error: unknown) {
    if (error instanceof StaleDocumentError) {
      throw error; // Re-throw StaleDocumentError -- do NOT fall back to local storage for version conflicts
    }
    logger.error('MongoDB updateMissionTemplate failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'mission-templates', templateId: id });
    usingFallbackStorage = true;
    const templates = getLocalMissionTemplates();
    const existing = templates.find(t => t.id === id);
    if (!existing) return null;
    const updated: MissionTemplateResponse = {
      ...existing,
      ...templateData,
      id: existing.id,
      updatedAt: new Date().toISOString()
    } as MissionTemplateResponse;
    saveLocalMissionTemplate(updated);
    return updated;
  }
}

export async function deleteMissionTemplate(id: string): Promise<boolean> {
  logger.info('Deleting mission template', { collection: 'mission-templates', operation: 'delete', templateId: id });

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Create a filter that works with the ID format
    const filter = createIdFilter(id);

    // Delete template from database
    const result = await db.collection('mission-templates').deleteOne(filter);

    if (result.deletedCount === 0) {
      logger.info('Mission template not found in MongoDB', { storage: 'MongoDB', collection: 'mission-templates', templateId: id });
      return false;
    }

    logger.info('Mission template deleted from MongoDB', { storage: 'MongoDB', collection: 'mission-templates', templateId: id });
    return true;
  } catch (error) {
    logger.error('MongoDB deleteMissionTemplate failed, falling back to local', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'mission-templates', templateId: id });
    usingFallbackStorage = true;
    const before = getLocalMissionTemplates();
    const existed = before.some(t => t.id === id);
    deleteLocalMissionTemplate(id);
    return existed;
  }
}

// Authorization helper functions
export async function canUserAccessTemplate(userId: string, templateId: string): Promise<boolean> {
  try {
    const template = await getMissionTemplateById(templateId);
    if (!template) {
      return false;
    }

    // Users can access their own templates
    if (template.createdBy === userId) {
      return true;
    }

    // Users with clearance >= 2 can access all templates; others can only access their own
    const user = await userStorage.getUserById(userId);
    if (!user) return false;
    return user.clearanceLevel >= 2;
  } catch (error) {
    logger.error('Error checking template access', error instanceof Error ? error : new Error(String(error)), { collection: 'mission-templates', userId, templateId });
    return false;
  }
}

export async function canUserModifyTemplate(userId: string, templateId: string): Promise<boolean> {
  try {
    const template = await getMissionTemplateById(templateId);
    if (!template) {
      return false;
    }

    // Users can only modify their own templates
    return template.createdBy === userId;
  } catch (error) {
    logger.error('Error checking template modification access', error instanceof Error ? error : new Error(String(error)), { collection: 'mission-templates', userId, templateId });
    return false;
  }
}

export async function canUserDeleteTemplate(userId: string, templateId: string): Promise<boolean> {
  try {
    const template = await getMissionTemplateById(templateId);
    if (!template) {
      return false;
    }

    // Users can only delete their own templates
    return template.createdBy === userId;
  } catch (error) {
    logger.error('Error checking template deletion access', error instanceof Error ? error : new Error(String(error)), { collection: 'mission-templates', userId, templateId });
    return false;
  }
}

export function isUsingFallbackStorage(): boolean {
  return usingFallbackStorage;
}
