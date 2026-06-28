import { User } from '@/types/user';
import crypto from 'crypto';
import type { Db } from 'mongodb';
import { getDb } from './mongodb';
import * as localStorage from './local-storage';
import { StaleDocumentError } from './storage-errors';
import { logger } from '@/lib/logger';

// Re-export for backward compatibility (existing consumers import from user-storage)
export { StaleDocumentError } from './storage-errors';

/**
 * Thrown when a create/update would violate a unique identity constraint
 * (email, aydoHandle, or discordId). API routes should catch this and return
 * 409 Conflict. This is surfaced both from the interim storage-level guard and
 * from MongoDB duplicate-key (E11000) errors so signup races fail cleanly.
 */
export type DuplicateUserField = 'email' | 'aydoHandle' | 'discordId' | 'unknown';

export class DuplicateUserError extends Error {
  field: DuplicateUserField;
  constructor(field: DuplicateUserField) {
    super(`A user with this ${field === 'aydoHandle' ? 'handle' : field} already exists`);
    this.name = 'DuplicateUserError';
    this.field = field;
  }
}

// Time-boxed fallback: instead of a permanent latch, store a timestamp until
// which we route to local storage. After the cooldown, shouldUseFallback
// re-probes the primary so a transient MongoDB blip does not strand the whole
// process on local fallback for auth-critical writes.
const FALLBACK_COOLDOWN_MS = parseInt(process.env.USER_STORAGE_FALLBACK_COOLDOWN_MS || '30000', 10);
let fallbackUntil = 0; // epoch ms; if > Date.now() we are currently in fallback
let manualFallback = false; // set explicitly via setFallbackStorageMode (tests/manual)

function enterFallback(): void {
  fallbackUntil = Date.now() + FALLBACK_COOLDOWN_MS;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

/** Best-effort mapping of a MongoDB E11000 error to the violated identity field. */
function duplicateUserErrorFromMongo(
  error: unknown,
  candidate?: Partial<User>
): DuplicateUserError {
  const message = (error as { message?: string })?.message || '';
  if (candidate?.discordId && /discordId/i.test(message))
    return new DuplicateUserError('discordId');
  if (/aydoHandleLower|aydoHandle/i.test(message)) return new DuplicateUserError('aydoHandle');
  if (/emailLower|\bemail\b/i.test(message)) return new DuplicateUserError('email');
  return new DuplicateUserError('unknown');
}

const caseInsensitiveCollation = { locale: 'en', strength: 2 } as const;

async function findUserByLegacyField(db: Db, field: 'email' | 'aydoHandle', value: string) {
  return await db.collection('users').findOne(
    { [field]: value },
    {
      projection: { _id: 0 },
      collation: caseInsensitiveCollation,
    }
  );
}

async function shouldUseFallback(): Promise<boolean> {
  if (manualFallback) return true;
  if (fallbackUntil > Date.now()) return true;

  // Cooldown elapsed (or never tripped) -- re-probe the primary. getDb() returns
  // a cached connection when healthy, so this is cheap; a successful probe clears
  // fallback automatically.
  try {
    await getDb(); // If this succeeds, MongoDB is reachable
    return false;
  } catch (error) {
    logger.warn('MongoDB connection failed, switching to local fallback storage', {
      collection: 'users',
    });
    enterFallback();
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
    logger.error(
      'MongoDB getUserById failed, trying fallback',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'users', userId: id }
    );
    enterFallback();
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
    let doc = await db.collection('users').findOne({ emailLower }, { projection: { _id: 0 } });

    if (!doc) {
      // Legacy production records may predate normalized fields. Collation keeps
      // the lookup case-insensitive without reintroducing regex-based matching.
      doc = await findUserByLegacyField(db, 'email', email);
    }

    if (!doc) return null;
    if ((doc as any).__v === undefined) (doc as any).__v = 0;
    return doc as unknown as User;
  } catch (error) {
    logger.error(
      'MongoDB getUserByEmail failed, trying fallback',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'users', email }
    );
    enterFallback();
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
    let doc = await db.collection('users').findOne({ aydoHandleLower }, { projection: { _id: 0 } });

    if (!doc) {
      // Legacy production records may predate normalized fields. Collation keeps
      // the lookup case-insensitive without reintroducing regex-based matching.
      doc = await findUserByLegacyField(db, 'aydoHandle', aydoHandle);
    }

    if (!doc) return null;
    if ((doc as any).__v === undefined) (doc as any).__v = 0;
    return doc as unknown as User;
  } catch (error) {
    logger.error(
      'MongoDB getUserByHandle failed, trying fallback',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'users', aydoHandle }
    );
    enterFallback();
    return await localStorage.getUserByHandle(aydoHandle);
  }
}

export async function getUserByDiscordId(discordId: string): Promise<User | null> {
  if (await shouldUseFallback()) {
    logger.info('Getting user by Discord ID', {
      storage: 'Fallback',
      collection: 'users',
      discordId,
    });
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
    logger.error(
      'MongoDB getUserByDiscordId failed, trying fallback',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'users', discordId }
    );
    enterFallback();
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
    logger.info('Creating user', {
      storage: 'Fallback',
      collection: 'users',
      aydoHandle: user.aydoHandle,
    });
    // Mirror the duplicate guard on the local path so fallback writes stay consistent.
    if (await localStorage.getUserByEmail(user.email)) throw new DuplicateUserError('email');
    if (await localStorage.getUserByHandle(user.aydoHandle))
      throw new DuplicateUserError('aydoHandle');
    if (user.discordId && (await localStorage.getUserByDiscordId(user.discordId)))
      throw new DuplicateUserError('discordId');
    return await localStorage.createUser(user);
  }

  logger.info('Creating user', {
    storage: 'MongoDB',
    collection: 'users',
    aydoHandle: user.aydoHandle,
  });

  let db: Db;
  try {
    db = await getDb();
  } catch (error) {
    // Could not reach the authoritative store. Do NOT silently write an
    // auth-critical user to local fallback in production -- fail closed so the
    // caller can return 503 instead of reporting success on a non-canonical write.
    enterFallback();
    if (process.env.NODE_ENV === 'production') {
      logger.error(
        'MongoDB unavailable for createUser; refusing local fallback in production',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'users', aydoHandle: user.aydoHandle }
      );
      throw error;
    }
    logger.error(
      'MongoDB createUser connection failed, trying fallback',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'users', aydoHandle: user.aydoHandle }
    );
    return await localStorage.createUser(user);
  }

  // Interim storage-level duplicate guard. The unique indexes (see
  // mongo-indexes.ts) are the authoritative defense against signup races; this
  // narrows the window and yields a clean typed error in the common case.
  if (await getUserByEmail(user.email)) throw new DuplicateUserError('email');
  if (await getUserByHandle(user.aydoHandle)) throw new DuplicateUserError('aydoHandle');
  if (user.discordId && (await getUserByDiscordId(user.discordId)))
    throw new DuplicateUserError('discordId');

  // Ensure normalized fields
  const userDoc = {
    ...user,
    email: user.email.toLowerCase(),
    emailLower: user.email.toLowerCase(),
    aydoHandleLower: user.aydoHandle.toLowerCase(),
    __v: 0,
  };

  try {
    await db.collection('users').insertOne(userDoc);
  } catch (error) {
    // Lost a race to a unique index -> surface as a conflict, never fall back.
    if (isDuplicateKeyError(error)) {
      throw duplicateUserErrorFromMongo(error, user);
    }
    // Transient primary write failure. Fail closed in production (see above).
    enterFallback();
    if (process.env.NODE_ENV === 'production') {
      logger.error(
        'MongoDB createUser failed; refusing local fallback in production',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'users', aydoHandle: user.aydoHandle }
      );
      throw error;
    }
    logger.error(
      'MongoDB createUser failed, trying fallback',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'users', aydoHandle: user.aydoHandle }
    );
    return await localStorage.createUser(user);
  }

  logger.info('User created successfully', {
    storage: 'MongoDB',
    collection: 'users',
    aydoHandle: user.aydoHandle,
  });
  return { ...userDoc } as User;
}

export async function updateUser(
  id: string,
  userData: Partial<User>,
  expectedVersion?: number
): Promise<User | null> {
  // Normalize identity fields so the lowercase lookup indexes stay in sync with
  // the canonical values whenever email/handle change. Applied up front so both
  // the MongoDB and local-fallback paths persist consistent data.
  const normalizedData: Partial<User> & Record<string, unknown> = { ...userData };
  if (normalizedData.email !== undefined) {
    normalizedData.email = normalizedData.email.toLowerCase();
    normalizedData.emailLower = normalizedData.email.toLowerCase();
  }
  if (normalizedData.aydoHandle !== undefined) {
    normalizedData.aydoHandleLower = normalizedData.aydoHandle.toLowerCase();
  }

  if (await shouldUseFallback()) {
    logger.info('Updating user', { storage: 'Fallback', collection: 'users', userId: id });
    return await localStorage.updateUser(id, normalizedData);
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
    const { id: _ignoreId, __v: _ignoreV, ...updateFields } = normalizedData as any;

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
    // A unique-index violation (e.g. changing email/handle to one already taken)
    // is a user-facing conflict, not a reason to fall back to local storage.
    if (isDuplicateKeyError(error)) {
      throw duplicateUserErrorFromMongo(error, normalizedData);
    }
    logger.error(
      'MongoDB updateUser failed, trying fallback',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'users', userId: id }
    );
    enterFallback();
    return await localStorage.updateUser(id, normalizedData);
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
    logger.error(
      'MongoDB deleteUser failed, trying fallback',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'users', userId: id }
    );
    enterFallback();
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
    const docs = await db
      .collection('users')
      .find({}, { projection: { _id: 0 } })
      .toArray();
    return docs.map((doc) => {
      if ((doc as any).__v === undefined) (doc as any).__v = 0;
      return doc as unknown as User;
    });
  } catch (error) {
    logger.error(
      'MongoDB getAllUsers failed, trying fallback',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'users' }
    );
    enterFallback();
    return await localStorage.getAllUsers();
  }
}

export interface PaginatedUsersResult {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getUsersPaginated(
  page: number = 1,
  pageSize: number = 25
): Promise<PaginatedUsersResult> {
  if (await shouldUseFallback()) {
    logger.info('Getting paginated users', { storage: 'Fallback', collection: 'users' });
    const allUsers = await localStorage.getAllUsers();
    allUsers.sort((a, b) => (a.aydoHandle || '').localeCompare(b.aydoHandle || ''));
    const total = allUsers.length;
    const start = (page - 1) * pageSize;
    const users = allUsers.slice(start, start + pageSize);
    return { users, total, page, pageSize };
  }

  logger.info('Getting paginated users', {
    storage: 'MongoDB',
    collection: 'users',
    page,
    pageSize,
  });
  try {
    const db = await getDb();
    const query = {};
    const total = await db.collection('users').countDocuments(query);
    const docs = await db
      .collection('users')
      .find(query, { projection: { _id: 0, passwordHash: 0 } })
      .sort({ aydoHandle: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    const users = docs.map((doc) => {
      if ((doc as any).__v === undefined) (doc as any).__v = 0;
      return doc as unknown as User;
    });

    return { users, total, page, pageSize };
  } catch (error) {
    logger.error(
      'MongoDB getUsersPaginated failed, trying fallback',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'MongoDB', collection: 'users' }
    );
    enterFallback();
    const allUsers = await localStorage.getAllUsers();
    allUsers.sort((a, b) => (a.aydoHandle || '').localeCompare(b.aydoHandle || ''));
    const total = allUsers.length;
    const start = (page - 1) * pageSize;
    const users = allUsers.slice(start, start + pageSize);
    return { users, total, page, pageSize };
  }
}

export function isUsingFallbackStorage(): boolean {
  return manualFallback || fallbackUntil > Date.now();
}

export function setFallbackStorageMode(useLocalStorage: boolean) {
  logger.info('Setting fallback storage mode', { collection: 'users', useLocalStorage });
  manualFallback = useLocalStorage;
  // Clear any time-boxed fallback so an explicit "off" re-enables the primary.
  if (!useLocalStorage) fallbackUntil = 0;
}
