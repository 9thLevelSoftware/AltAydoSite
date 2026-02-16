import { User } from '@/types/user';
import crypto from 'crypto';
import { getDb } from './mongodb';
import * as localStorage from './local-storage';
import { StaleDocumentError } from './storage-errors';
import { logger } from '@/lib/logger';

// Re-export for backward compatibility (existing consumers import from user-storage)
export { StaleDocumentError } from './storage-errors';

// State to track if we should use local storage fallback
let usingFallback = false;
// Flag to prevent repeated connection attempts if we know it's down
let connectionChecked = false;

async function shouldUseFallback(): Promise<boolean> {
  if (usingFallback) return true;
  if (connectionChecked) return false;

  try {
    await getDb(); // If this succeeds, MongoDB is reachable
    connectionChecked = true;
    return false;
  } catch (error) {
    logger.warn('MongoDB connection failed, switching to local fallback storage', { collection: 'users' });
    usingFallback = true;
    connectionChecked = true;
    return true;
  }
}

// User storage API (MongoDB with Local Fallback)
export async function getUserById(id: string): Promise<User | null> {
  if (await shouldUseFallback()) {
    logger.info('Getting user by ID', { storage: 'Fallback', collection: 'users', userId: id });
    return await localStorage.getUserById(id);
  }

  logger.info('Getting user by ID', { storage: 'MongoDB', collection: 'users', userId: id });
  try {
    const db = await getDb();
    const doc = await db.collection('users').findOne({ id }, { projection: { _id: 0 } });
    if (!doc) return null;
    // Normalize: treat missing __v as version 0
    if ((doc as any).__v === undefined) (doc as any).__v = 0;
    return doc as unknown as User;
  } catch (error) {
    logger.error('MongoDB getUserById failed, trying fallback', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'users', userId: id });
    usingFallback = true;
    return await localStorage.getUserById(id);
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (await shouldUseFallback()) {
    logger.info('Getting user by email', { storage: 'Fallback', collection: 'users', email });
    return await localStorage.getUserByEmail(email);
  }

  logger.info('Getting user by email', { storage: 'MongoDB', collection: 'users', email });
  try {
    const db = await getDb();
    const emailLower = email.toLowerCase();
    // SEC-03: Use normalized field only (no $regex) to prevent ReDoS.
    // All records have emailLower since Phase 8 migration.
    const doc = await db.collection('users').findOne(
      { emailLower },
      { projection: { _id: 0 } }
    );
    if (!doc) return null;
    if ((doc as any).__v === undefined) (doc as any).__v = 0;
    return doc as unknown as User;
  } catch (error) {
    logger.error('MongoDB getUserByEmail failed, trying fallback', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'users', email });
    usingFallback = true;
    return await localStorage.getUserByEmail(email);
  }
}

export async function getUserByHandle(aydoHandle: string): Promise<User | null> {
  if (await shouldUseFallback()) {
    logger.info('Getting user by handle', { storage: 'Fallback', collection: 'users', aydoHandle });
    return await localStorage.getUserByHandle(aydoHandle);
  }

  logger.info('Getting user by handle', { storage: 'MongoDB', collection: 'users', aydoHandle });
  try {
    const db = await getDb();
    const aydoHandleLower = aydoHandle.toLowerCase();
    // SEC-03: Use normalized field only (no $regex) to prevent ReDoS.
    // All records have aydoHandleLower since Phase 8 migration.
    const doc = await db.collection('users').findOne(
      { aydoHandleLower },
      { projection: { _id: 0 } }
    );
    if (!doc) return null;
    if ((doc as any).__v === undefined) (doc as any).__v = 0;
    return doc as unknown as User;
  } catch (error) {
    logger.error('MongoDB getUserByHandle failed, trying fallback', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'users', aydoHandle });
    usingFallback = true;
    return await localStorage.getUserByHandle(aydoHandle);
  }
}

export async function getUserByDiscordId(discordId: string): Promise<User | null> {
  if (await shouldUseFallback()) {
    logger.info('Getting user by Discord ID', { storage: 'Fallback', collection: 'users', discordId });
    return await localStorage.getUserByDiscordId(discordId);
  }

  logger.info('Getting user by Discord ID', { storage: 'MongoDB', collection: 'users', discordId });
  try {
    const db = await getDb();
    const doc = await db.collection('users').findOne({ discordId }, { projection: { _id: 0 } });
    if (!doc) return null;
    if ((doc as any).__v === undefined) (doc as any).__v = 0;
    return doc as unknown as User;
  } catch (error) {
    logger.error('MongoDB getUserByDiscordId failed, trying fallback', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'users', discordId });
    usingFallback = true;
    return await localStorage.getUserByDiscordId(discordId);
  }
}

export async function createUser(user: User): Promise<User> {
  if (!user.id) {
    user.id = crypto.randomUUID();
  }
  if (!user.createdAt) {
    user.createdAt = new Date().toISOString();
  }
  if (!user.updatedAt) {
    user.updatedAt = new Date().toISOString();
  }

  if (await shouldUseFallback()) {
    logger.info('Creating user', { storage: 'Fallback', collection: 'users', aydoHandle: user.aydoHandle });
    return await localStorage.createUser(user);
  }

  logger.info('Creating user', { storage: 'MongoDB', collection: 'users', aydoHandle: user.aydoHandle });
  try {
    const db = await getDb();
    // Ensure normalized fields
    const userDoc = {
      ...user,
      email: user.email.toLowerCase(),
      emailLower: user.email.toLowerCase(),
      aydoHandleLower: user.aydoHandle.toLowerCase(),
      __v: 0,
    };
    await db.collection('users').insertOne(userDoc);
    logger.info('User created successfully', { storage: 'MongoDB', collection: 'users', aydoHandle: user.aydoHandle });
    return { ...userDoc } as User;
  } catch (error) {
    logger.error('MongoDB createUser failed, trying fallback', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'users', aydoHandle: user.aydoHandle });
    usingFallback = true;
    return await localStorage.createUser(user);
  }
}

export async function updateUser(id: string, userData: Partial<User>, expectedVersion?: number): Promise<User | null> {
  if (await shouldUseFallback()) {
    logger.info('Updating user', { storage: 'Fallback', collection: 'users', userId: id });
    return await localStorage.updateUser(id, userData);
  }

  logger.info('Updating user', { storage: 'MongoDB', collection: 'users', userId: id });
  try {
    const db = await getDb();

    // Build the version filter
    // If expectedVersion is provided, enforce optimistic locking
    // If expectedVersion is undefined, skip version checking (backward compat for callers not yet updated)
    const versionFilter: Record<string, unknown> = {};
    if (expectedVersion !== undefined) {
      // Handle documents that may not have __v yet (treat missing as 0)
      if (expectedVersion === 0) {
        versionFilter.$or = [{ __v: 0 }, { __v: { $exists: false } }];
      } else {
        versionFilter.__v = expectedVersion;
      }
    }

    // Remove fields that should not be $set directly
    const { id: _ignoreId, __v: _ignoreV, ...updateFields } = userData as any;

    const result = await db.collection('users').findOneAndUpdate(
      { id, ...versionFilter },
      {
        $set: { ...updateFields, updatedAt: new Date().toISOString() },
        $inc: { __v: 1 },
      },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    if (!result) {
      // Distinguish "not found" from "version mismatch"
      if (expectedVersion !== undefined) {
        const exists = await db.collection('users').findOne({ id }, { projection: { __v: 1 } });
        if (exists) {
          throw new StaleDocumentError('users', id);
        }
      }
      return null;
    }

    return result as unknown as User;
  } catch (error) {
    if (error instanceof StaleDocumentError) {
      throw error; // Re-throw StaleDocumentError -- do NOT fall back to local storage for version conflicts
    }
    logger.error('MongoDB updateUser failed, trying fallback', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'users', userId: id });
    usingFallback = true;
    return await localStorage.updateUser(id, userData);
  }
}

export async function deleteUser(id: string): Promise<void> {
  if (await shouldUseFallback()) {
    logger.info('Deleting user', { storage: 'Fallback', collection: 'users', userId: id });
    await localStorage.deleteUser(id);
    return;
  }

  logger.info('Deleting user', { storage: 'MongoDB', collection: 'users', userId: id });
  try {
    const db = await getDb();
    await db.collection('users').deleteOne({ id });
  } catch (error) {
    logger.error('MongoDB deleteUser failed, trying fallback', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'users', userId: id });
    usingFallback = true;
    await localStorage.deleteUser(id);
  }
}

export async function getAllUsers(): Promise<User[]> {
  if (await shouldUseFallback()) {
    logger.info('Getting all users', { storage: 'Fallback', collection: 'users' });
    return await localStorage.getAllUsers();
  }

  logger.info('Getting all users', { storage: 'MongoDB', collection: 'users' });
  try {
    const db = await getDb();
    const docs = await db.collection('users').find({}, { projection: { _id: 0 } }).toArray();
    return docs.map(doc => {
      if ((doc as any).__v === undefined) (doc as any).__v = 0;
      return doc as unknown as User;
    });
  } catch (error) {
    logger.error('MongoDB getAllUsers failed, trying fallback', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'users' });
    usingFallback = true;
    return await localStorage.getAllUsers();
  }
}

export interface PaginatedUsersResult {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getUsersPaginated(page: number = 1, pageSize: number = 25): Promise<PaginatedUsersResult> {
  if (await shouldUseFallback()) {
    logger.info('Getting paginated users', { storage: 'Fallback', collection: 'users' });
    const allUsers = await localStorage.getAllUsers();
    allUsers.sort((a, b) => (a.aydoHandle || '').localeCompare(b.aydoHandle || ''));
    const total = allUsers.length;
    const start = (page - 1) * pageSize;
    const users = allUsers.slice(start, start + pageSize);
    return { users, total, page, pageSize };
  }

  logger.info('Getting paginated users', { storage: 'MongoDB', collection: 'users', page, pageSize });
  try {
    const db = await getDb();
    const query = {};
    const total = await db.collection('users').countDocuments(query);
    const docs = await db.collection('users')
      .find(query, { projection: { _id: 0, passwordHash: 0 } })
      .sort({ aydoHandle: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    const users = docs.map(doc => {
      if ((doc as any).__v === undefined) (doc as any).__v = 0;
      return doc as unknown as User;
    });

    return { users, total, page, pageSize };
  } catch (error) {
    logger.error('MongoDB getUsersPaginated failed, trying fallback', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'users' });
    usingFallback = true;
    const allUsers = await localStorage.getAllUsers();
    allUsers.sort((a, b) => (a.aydoHandle || '').localeCompare(b.aydoHandle || ''));
    const total = allUsers.length;
    const start = (page - 1) * pageSize;
    const users = allUsers.slice(start, start + pageSize);
    return { users, total, page, pageSize };
  }
}

export function isUsingFallbackStorage(): boolean {
  return usingFallback;
}

export function setFallbackStorageMode(useLocalStorage: boolean) {
  logger.info('Setting fallback storage mode', { collection: 'users', useLocalStorage });
  usingFallback = useLocalStorage;
  connectionChecked = true; // Prevent auto-recheck if manually set
}
