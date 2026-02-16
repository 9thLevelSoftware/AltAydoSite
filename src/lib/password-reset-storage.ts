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
    logger.info('Creating data directory', { storage: 'Fallback', collection: 'resetTokens', path: dataDir });
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(tokensFilePath)) {
    logger.info('Creating empty tokens file', { storage: 'Fallback', collection: 'resetTokens', path: tokensFilePath });
    fs.writeFileSync(tokensFilePath, JSON.stringify([]), 'utf8');
  }
}

function getLocalTokens(): PasswordResetToken[] {
  logger.info('Reading tokens from local storage', { storage: 'Fallback', collection: 'resetTokens', operation: 'read' });
  ensureDataDir();

  try {
    const data = fs.readFileSync(tokensFilePath, 'utf8');
    const tokens = JSON.parse(data) as PasswordResetToken[];
    logger.info('Found tokens in local storage', { storage: 'Fallback', collection: 'resetTokens', count: tokens.length });
    return tokens;
  } catch (error) {
    logger.error('Error reading tokens file', error instanceof Error ? error : new Error(String(error)), { storage: 'Fallback', collection: 'resetTokens' });
    return [];
  }
}

function saveLocalToken(token: PasswordResetToken): void {
  logger.info('Saving token to local storage', { storage: 'Fallback', collection: 'resetTokens', operation: 'save', tokenId: token.id });
  ensureDataDir();

  const tokens = getLocalTokens();

  // Check if token already exists
  const existingTokenIndex = tokens.findIndex(t => t.id === token.id);
  if (existingTokenIndex >= 0) {
    // Update existing token
    logger.info('Updating existing token', { storage: 'Fallback', collection: 'resetTokens', operation: 'update', tokenId: token.id });
    tokens[existingTokenIndex] = token;
  } else {
    // Add new token
    logger.info('Adding new token', { storage: 'Fallback', collection: 'resetTokens', operation: 'insert', tokenId: token.id });
    tokens.push(token);
  }

  fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), 'utf8');
  logger.info('Successfully saved tokens to file', { storage: 'Fallback', collection: 'resetTokens', totalCount: tokens.length });
}

// Check if we should use MongoDB
async function shouldUseMongoDb(): Promise<boolean> {
  try {
    await getDb();
    return true;
  } catch (error) {
    logger.error('MongoDB connection failed', error instanceof Error ? error : new Error(String(error)), { collection: 'resetTokens' });
    return false;
  }
}

// Generate a secure random token
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create a new password reset token
export async function createResetToken(userId: string, email: string): Promise<PasswordResetToken> {
  logger.info('Creating reset token for user', { collection: 'resetTokens', operation: 'create', userId, hasEmail: !!email });

  const token: PasswordResetToken = {
    id: crypto.randomUUID(),
    userId,
    token: generateResetToken(),
    email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour expiry
    used: false
  };
  // Add TTL-compatible Date field alongside the string for compatibility
  (token as any).expiresAtDate = new Date(Date.now() + 3600000);

  if (await shouldUseMongoDb()) {
    try {
      // Store in MongoDB
      const db = await getDb();
      await db.collection('resetTokens').insertOne(token);
      logger.info('Reset token created successfully', { storage: 'MongoDB', collection: 'resetTokens', tokenId: token.id });
      return token;
    } catch (error) {
      logger.error('MongoDB createResetToken failed, falling back to local storage', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'resetTokens' });
    }
  }

  // Fallback to local storage
  saveLocalToken(token);
  return token;
}

// Get a token by its token string
export async function getResetTokenByToken(tokenString: string): Promise<PasswordResetToken | null> {
  // Log only first 8 chars of token for security (existence check, not full token)
  logger.info('Getting reset token', { collection: 'resetTokens', operation: 'getByToken', tokenPrefix: tokenString.substring(0, 8) });

  if (await shouldUseMongoDb()) {
    try {
      const db = await getDb();
      const doc = await db.collection('resetTokens').findOne({ token: tokenString }, { projection: { _id: 0 } });
      if (!doc) return null;
      const { _id, ...tokenData } = doc;
      return tokenData as PasswordResetToken;
    } catch (error) {
      logger.error('MongoDB getResetTokenByToken failed, falling back to local storage', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'resetTokens' });
    }
  }

  // Fallback to local storage
  const tokens = getLocalTokens();
  return tokens.find(t => t.token === tokenString) || null;
}

// Mark a token as used
export async function markTokenAsUsed(tokenId: string): Promise<boolean> {
  logger.info('Marking token as used', { collection: 'resetTokens', operation: 'markUsed', tokenId });

  if (await shouldUseMongoDb()) {
    try {
      const db = await getDb();
      const result = await db.collection('resetTokens').updateOne(
        { id: tokenId },
        { $set: { used: true } }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('MongoDB markResetTokenAsUsed failed, falling back to local storage', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'resetTokens' });
    }
  }

  // Fallback to local storage
  const tokens = getLocalTokens();
  const tokenIndex = tokens.findIndex(t => t.id === tokenId);

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
        $or: [
          { expiresAt: { $lt: now } },
          { used: true }
        ]
      });
      logger.info('Cleaned up expired or used tokens', { storage: 'MongoDB', collection: 'resetTokens', deletedCount: result.deletedCount });
      return;
    } catch (error) {
      logger.error('MongoDB cleanupExpiredTokens failed, falling back to local storage', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB', collection: 'resetTokens' });
    }
  }

  // Fallback to local storage
  const tokens = getLocalTokens();
  const now = new Date().toISOString();
  const validTokens = tokens.filter(t => t.expiresAt > now);

  if (validTokens.length !== tokens.length) {
    logger.info('Removed expired tokens', { storage: 'Fallback', collection: 'resetTokens', removedCount: tokens.length - validTokens.length });
    fs.writeFileSync(tokensFilePath, JSON.stringify(validTokens, null, 2), 'utf8');
  } else {
    logger.info('No expired tokens found', { storage: 'Fallback', collection: 'resetTokens' });
  }
}
