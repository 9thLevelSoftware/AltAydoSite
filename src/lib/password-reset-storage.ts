import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PasswordResetToken } from '@/types/password-reset';
import { getDb } from './mongodb';
import { logger } from '@/lib/logger';

// File storage paths
const dataDir = path.join(process.cwd(), 'data');
const tokensFilePath = path.join(dataDir, 'reset-tokens.json');

// Helper functions for local file storage
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    logger.info('Creating data directory', {
      storage: 'Fallback',
      collection: 'resetTokens',
      path: dataDir,
    });
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(tokensFilePath)) {
    logger.info('Creating empty tokens file', {
      storage: 'Fallback',
      collection: 'resetTokens',
      path: tokensFilePath,
    });
    fs.writeFileSync(tokensFilePath, JSON.stringify([]), 'utf8');
  }
}

function getLocalTokens(): PasswordResetToken[] {
  logger.info('Reading tokens from local storage', {
    storage: 'Fallback',
    collection: 'resetTokens',
    operation: 'read',
  });
  ensureDataDir();

  try {
    const data = fs.readFileSync(tokensFilePath, 'utf8');
    const tokens = JSON.parse(data) as PasswordResetToken[];
    logger.info('Found tokens in local storage', {
      storage: 'Fallback',
      collection: 'resetTokens',
      count: tokens.length,
    });
    return tokens;
  } catch (error) {
    logger.error(
      'Error reading tokens file',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'Fallback', collection: 'resetTokens' }
    );
    return [];
  }
}

function saveLocalToken(token: PasswordResetToken): void {
  logger.info('Saving token to local storage', {
    storage: 'Fallback',
    collection: 'resetTokens',
    operation: 'save',
    tokenId: token.id,
  });
  ensureDataDir();

  const tokens = getLocalTokens();

  // Check if token already exists
  const existingTokenIndex = tokens.findIndex((t) => t.id === token.id);
  if (existingTokenIndex >= 0) {
    // Update existing token
    logger.info('Updating existing token', {
      storage: 'Fallback',
      collection: 'resetTokens',
      operation: 'update',
      tokenId: token.id,
    });
    tokens[existingTokenIndex] = token;
  } else {
    // Add new token
    logger.info('Adding new token', {
      storage: 'Fallback',
      collection: 'resetTokens',
      operation: 'insert',
      tokenId: token.id,
    });
    tokens.push(token);
  }

  fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), 'utf8');
  logger.info('Successfully saved tokens to file', {
    storage: 'Fallback',
    collection: 'resetTokens',
    totalCount: tokens.length,
  });
}

// Check if we should use MongoDB
async function shouldUseMongoDb(): Promise<boolean> {
  try {
    await getDb();
    return true;
  } catch (error) {
    logger.error(
      'MongoDB connection failed',
      error instanceof Error ? error : new Error(String(error)),
      { collection: 'resetTokens' }
    );
    return false;
  }
}

// Generate a secure random token
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash a raw token for storage/lookup. We never persist the raw token.
function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// Constant-time comparison of two hex-encoded hashes (used in the local path).
function hashesEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

// Result of creating a reset token: the persisted record (hash only) plus the
// raw token, which is returned exactly once so the caller can email it.
export interface CreatedResetToken {
  tokenRecord: PasswordResetToken;
  rawToken: string;
}

// Create a new password reset token
export async function createResetToken(userId: string, email: string): Promise<CreatedResetToken> {
  logger.info('Creating reset token for user', {
    collection: 'resetTokens',
    operation: 'create',
    userId,
    hasEmail: !!email,
  });

  const rawToken = generateResetToken();
  const expiresAtDate = new Date(Date.now() + 3600000); // 1 hour expiry
  const token: PasswordResetToken = {
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashResetToken(rawToken),
    email,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAtDate.toISOString(),
    used: false,
  };
  // Add TTL-compatible Date field alongside the string for compatibility
  (token as any).expiresAtDate = expiresAtDate;

  if (await shouldUseMongoDb()) {
    try {
      // Store in MongoDB
      const db = await getDb();
      await db.collection('resetTokens').insertOne(token);
      logger.info('Reset token created successfully', {
        storage: 'MongoDB',
        collection: 'resetTokens',
        tokenId: token.id,
      });
      return { tokenRecord: token, rawToken };
    } catch (error) {
      logger.error(
        'MongoDB createResetToken failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resetTokens' }
      );
    }
  }

  // Fallback to local storage
  saveLocalToken(token);
  return { tokenRecord: token, rawToken };
}

// Get a token by its raw token string (looked up by hash)
export async function getResetTokenByToken(
  tokenString: string
): Promise<PasswordResetToken | null> {
  const tokenHash = hashResetToken(tokenString);
  // Log only the first 8 chars of the hash for a non-sensitive existence check
  logger.info('Getting reset token', {
    collection: 'resetTokens',
    operation: 'getByToken',
    tokenHashPrefix: tokenHash.substring(0, 8),
  });

  if (await shouldUseMongoDb()) {
    try {
      const db = await getDb();
      const doc = await db
        .collection('resetTokens')
        .findOne({ tokenHash }, { projection: { _id: 0 } });
      if (!doc) return null;
      const { _id, ...tokenData } = doc;
      return tokenData as PasswordResetToken;
    } catch (error) {
      logger.error(
        'MongoDB getResetTokenByToken failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resetTokens' }
      );
    }
  }

  // Fallback to local storage (constant-time hash comparison)
  const tokens = getLocalTokens();
  return tokens.find((t) => hashesEqual(t.tokenHash, tokenHash)) || null;
}

// Atomically consume a reset token by its raw token string.
//
// Returns the token record ONLY if this call was the one that flipped `used`
// from false to true while the token was still unexpired. Concurrent callers
// (or replays of an already-used/expired token) receive null. This is the
// single source of truth for redeeming a token -- callers must not separately
// re-check `used`/expiry, and must consume BEFORE mutating the password so a
// failed consume never leaves a reusable token behind.
export async function consumeResetToken(tokenString: string): Promise<PasswordResetToken | null> {
  const tokenHash = hashResetToken(tokenString);
  const now = new Date();
  logger.info('Consuming reset token', {
    collection: 'resetTokens',
    operation: 'consume',
    tokenHashPrefix: tokenHash.substring(0, 8),
  });

  if (await shouldUseMongoDb()) {
    try {
      const db = await getDb();
      // Atomic guarded write: only matches an unused, unexpired token.
      // returnDocument: 'before' yields the pre-update doc, confirming we are
      // the caller that flipped `used`.
      const result = await db
        .collection('resetTokens')
        .findOneAndUpdate(
          { tokenHash, used: false, expiresAtDate: { $gt: now } },
          { $set: { used: true } },
          { returnDocument: 'before', projection: { _id: 0 } }
        );
      if (!result) return null;
      const { _id, ...tokenData } = result as any;
      return tokenData as PasswordResetToken;
    } catch (error) {
      logger.error(
        'MongoDB consumeResetToken failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resetTokens' }
      );
    }
  }

  // Fallback to local storage: read-modify-write guarded by used===false and
  // unexpired in the same operation (best-effort atomicity for single-process
  // fallback mode).
  const tokens = getLocalTokens();
  const idx = tokens.findIndex(
    (t) => hashesEqual(t.tokenHash, tokenHash) && !t.used && new Date(t.expiresAt) > now
  );
  if (idx === -1) return null;

  tokens[idx].used = true;
  fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), 'utf8');
  return tokens[idx];
}

// Delete a token by id (used to invalidate a freshly-created token when the
// reset email fails to send, so the unusable token does not linger).
export async function deleteResetToken(tokenId: string): Promise<boolean> {
  logger.info('Deleting reset token', { collection: 'resetTokens', operation: 'delete', tokenId });

  if (await shouldUseMongoDb()) {
    try {
      const db = await getDb();
      const result = await db.collection('resetTokens').deleteOne({ id: tokenId });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error(
        'MongoDB deleteResetToken failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resetTokens' }
      );
    }
  }

  // Fallback to local storage
  const tokens = getLocalTokens();
  const remaining = tokens.filter((t) => t.id !== tokenId);
  if (remaining.length === tokens.length) {
    return false;
  }
  fs.writeFileSync(tokensFilePath, JSON.stringify(remaining, null, 2), 'utf8');
  return true;
}

// Mark a token as used
export async function markTokenAsUsed(tokenId: string): Promise<boolean> {
  logger.info('Marking token as used', {
    collection: 'resetTokens',
    operation: 'markUsed',
    tokenId,
  });

  if (await shouldUseMongoDb()) {
    try {
      const db = await getDb();
      const result = await db
        .collection('resetTokens')
        .updateOne({ id: tokenId }, { $set: { used: true } });
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(
        'MongoDB markResetTokenAsUsed failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resetTokens' }
      );
    }
  }

  // Fallback to local storage
  const tokens = getLocalTokens();
  const tokenIndex = tokens.findIndex((t) => t.id === tokenId);

  if (tokenIndex === -1) {
    logger.info('Token not found', { storage: 'Fallback', collection: 'resetTokens', tokenId });
    return false;
  }

  tokens[tokenIndex].used = true;
  fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), 'utf8');
  return true;
}

// Clean up expired tokens
export async function cleanupExpiredTokens(): Promise<void> {
  logger.info('Cleaning up expired tokens', { collection: 'resetTokens', operation: 'cleanup' });

  if (await shouldUseMongoDb()) {
    try {
      const db = await getDb();
      const now = new Date().toISOString();
      const result = await db.collection('resetTokens').deleteMany({
        $or: [{ expiresAt: { $lt: now } }, { used: true }],
      });
      logger.info('Cleaned up expired or used tokens', {
        storage: 'MongoDB',
        collection: 'resetTokens',
        deletedCount: result.deletedCount,
      });
      return;
    } catch (error) {
      logger.error(
        'MongoDB cleanupExpiredTokens failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resetTokens' }
      );
    }
  }

  // Fallback to local storage
  const tokens = getLocalTokens();
  const now = new Date().toISOString();
  // Mirror the Mongo predicate: drop tokens that are expired OR already used.
  const validTokens = tokens.filter((t) => t.expiresAt > now && !t.used);

  if (validTokens.length !== tokens.length) {
    logger.info('Removed expired tokens', {
      storage: 'Fallback',
      collection: 'resetTokens',
      removedCount: tokens.length - validTokens.length,
    });
    fs.writeFileSync(tokensFilePath, JSON.stringify(validTokens, null, 2), 'utf8');
  } else {
    logger.info('No expired tokens found', { storage: 'Fallback', collection: 'resetTokens' });
  }
}
