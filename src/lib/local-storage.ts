import fs from 'fs';
import path from 'path';
import { User } from '@/types/user';
import { logger } from '@/lib/logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readUsers(): User[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error(
      'Error reading users file',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'LocalStorage', collection: 'users' }
    );
    return [];
  }
}

function writeUsers(users: User[]): void {
  const tempFile = `${USERS_FILE}.tmp`;
  try {
    ensureDataDir();
    // Write to a temp file first, then atomically rename to avoid leaving
    // partial/corrupt JSON if the process is interrupted mid-write.
    fs.writeFileSync(tempFile, JSON.stringify(users, null, 2));
    fs.renameSync(tempFile, USERS_FILE);
  } catch (error) {
    // Clean up the temp file if it was left behind, ignoring any error.
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch {
      // ignore cleanup failures
    }
    logger.error(
      'Error writing users file',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'LocalStorage', collection: 'users' }
    );
    // Rethrow so callers (createUser/updateUser/deleteUser) surface the failure
    // instead of falsely reporting success.
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const users = readUsers();
  return users.find((u) => u.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = readUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function getUserByHandle(handle: string): Promise<User | null> {
  const users = readUsers();
  return users.find((u) => u.aydoHandle.toLowerCase() === handle.toLowerCase()) || null;
}

export async function getUserByDiscordId(discordId: string): Promise<User | null> {
  const users = readUsers();
  return users.find((u) => u.discordId === discordId) || null;
}

export async function createUser(user: User): Promise<User> {
  const users = readUsers();
  users.push(user);
  writeUsers(users);
  return user;
}

export async function updateUser(id: string, userData: Partial<User>): Promise<User | null> {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return null;

  const updatedUser = { ...users[index], ...userData, updatedAt: new Date().toISOString() };
  users[index] = updatedUser;
  writeUsers(users);
  return updatedUser;
}

export async function deleteUser(id: string): Promise<void> {
  const users = readUsers();
  const filteredUsers = users.filter((u) => u.id !== id);
  writeUsers(filteredUsers);
}

export async function getAllUsers(): Promise<User[]> {
  return readUsers();
}
