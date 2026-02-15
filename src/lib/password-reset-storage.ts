import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PasswordResetToken } from '@/types/password-reset';
import { getDb } from './mongodb';

// File storage paths
const dataDir = path.join(process.cwd(), 'data');
const tokensFilePath = path.join(dataDir, 'reset-tokens.json');

// Helper functions for local file storage
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    console.log(`STORAGE: Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(tokensFilePath)) {
    console.log(`STORAGE: Creating empty tokens file: ${tokensFilePath}`);
    fs.writeFileSync(tokensFilePath, JSON.stringify([]), 'utf8');
  }
}

function getLocalTokens(): PasswordResetToken[] {
  console.log('STORAGE: Reading tokens from local storage');
  ensureDataDir();
  
  try {
    const data = fs.readFileSync(tokensFilePath, 'utf8');
    const tokens = JSON.parse(data) as PasswordResetToken[];
    console.log(`STORAGE: Found ${tokens.length} tokens in local storage`);
    return tokens;
  } catch (error) {
    console.error('STORAGE: Error reading tokens file:', error);
    return [];
  }
}

function saveLocalToken(token: PasswordResetToken): void {
  console.log(`STORAGE: Saving token to local storage: ${token.id}`);
  ensureDataDir();
  
  const tokens = getLocalTokens();
  
  // Check if token already exists
  const existingTokenIndex = tokens.findIndex(t => t.id === token.id);
  if (existingTokenIndex >= 0) {
    // Update existing token
    console.log(`STORAGE: Updating existing token: ${token.id}`);
    tokens[existingTokenIndex] = token;
  } else {
    // Add new token
    console.log(`STORAGE: Adding new token: ${token.id}`);
    tokens.push(token);
  }
  
  fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), 'utf8');
  console.log(`STORAGE: Successfully saved tokens to file, total count: ${tokens.length}`);
}

// Check if we should use MongoDB
async function shouldUseMongoDb(): Promise<boolean> {
  try {
    await getDb();
    return true;
  } catch (error) {
    console.error('STORAGE: MongoDB connection failed:', error);
    return false;
  }
}

// Generate a secure random token
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create a new password reset token
export async function createResetToken(userId: string, email: string): Promise<PasswordResetToken> {
  console.log(`STORAGE: Creating reset token for user: ${userId}`);
  
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
      console.log('Reset token created successfully:', token.id);
      return token;
    } catch (error) {
      console.error('STORAGE: MongoDB createResetToken failed, falling back to local storage:', error);
    }
  }
  
  // Fallback to local storage
  saveLocalToken(token);
  return token;
}

// Get a token by its token string
export async function getResetTokenByToken(tokenString: string): Promise<PasswordResetToken | null> {
  console.log(`STORAGE: Getting reset token: ${tokenString.substring(0, 8)}...`);
  
  if (await shouldUseMongoDb()) {
    try {
      const db = await getDb();
      const doc = await db.collection('resetTokens').findOne({ token: tokenString }, { projection: { _id: 0 } });
      if (!doc) return null;
      const { _id, ...tokenData } = doc;
      return tokenData as PasswordResetToken;
    } catch (error) {
      console.error('STORAGE: MongoDB getResetTokenByToken failed, falling back to local storage:', error);
    }
  }
  
  // Fallback to local storage
  const tokens = getLocalTokens();
  return tokens.find(t => t.token === tokenString) || null;
}

// Mark a token as used
export async function markTokenAsUsed(tokenId: string): Promise<boolean> {
  console.log(`STORAGE: Marking token as used: ${tokenId}`);
  
  if (await shouldUseMongoDb()) {
    try {
      const db = await getDb();
      const result = await db.collection('resetTokens').updateOne(
        { id: tokenId },
        { $set: { used: true } }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('STORAGE: MongoDB markResetTokenAsUsed failed, falling back to local storage:', error);
    }
  }
  
  // Fallback to local storage
  const tokens = getLocalTokens();
  const tokenIndex = tokens.findIndex(t => t.id === tokenId);
  
  if (tokenIndex === -1) {
    console.log(`STORAGE: Token not found: ${tokenId}`);
    return false;
  }
  
  tokens[tokenIndex].used = true;
  fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), 'utf8');
  return true;
}

// Clean up expired tokens
export async function cleanupExpiredTokens(): Promise<void> {
  console.log('STORAGE: Cleaning up expired tokens');
  
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
      console.log(`Cleaned up ${result.deletedCount} expired or used tokens`);
      return;
    } catch (error) {
      console.error('STORAGE: MongoDB cleanupExpiredTokens failed, falling back to local storage:', error);
    }
  }
  
  // Fallback to local storage
  const tokens = getLocalTokens();
  const now = new Date().toISOString();
  const validTokens = tokens.filter(t => t.expiresAt > now);
  
  if (validTokens.length !== tokens.length) {
    console.log(`STORAGE: Removed ${tokens.length - validTokens.length} expired tokens`);
    fs.writeFileSync(tokensFilePath, JSON.stringify(validTokens, null, 2), 'utf8');
  } else {
    console.log('STORAGE: No expired tokens found');
  }
} 