import { logger } from '@/lib/logger';
import { connectToDatabase } from './mongodb';
import { setFallbackStorageMode as setUserFallbackStorageMode } from './user-storage';
import { setFallbackStorageMode as setOperationFallbackStorageMode } from './operation-storage';

/**
 * Checks if MongoDB connection is working.
 *
 * This function attempts to connect to MongoDB. If the connection fails,
 * it throws an error as we no longer support fallback to local storage.
 */
export async function ensureDatabaseConnection(): Promise<boolean> {
  logger.info('Testing MongoDB connection', { module: 'storage-utils' });

  try {
    await connectToDatabase();
    logger.info('MongoDB connection test successful', { module: 'storage-utils' });
    return true;
  } catch (error) {
    logger.error('Error testing MongoDB connection', error instanceof Error ? error : undefined, {
      module: 'storage-utils',
    });
    throw new Error('Database connection failed: Cannot connect to MongoDB');
  }
}

// For backwards compatibility, but will now throw error if connection fails
export async function shouldUseMongoDb(): Promise<boolean> {
  return await ensureDatabaseConnection();
}

/**
 * Force using local storage for all per-module storage state.
 *
 * Broadcasts the toggle to the storage modules that expose a fallback setter
 * (user-storage and operation-storage). Other storage modules (mission,
 * planned-mission, resource) currently only flip into fallback mode on a real
 * connection failure and do not expose a manual setter, so they are not yet
 * affected by this toggle.
 */
export function forceUseLocalStorage() {
  logger.info('Forced to use local storage for all operations', { module: 'storage-utils' });
  setUserFallbackStorageMode(true);
  setOperationFallbackStorageMode(true);
}

/**
 * Reset connection status so the next operation re-attempts MongoDB.
 *
 * Clears the manual fallback flag on the storage modules that expose a setter.
 */
export function resetConnectionStatus() {
  logger.info('Connection status reset, will try MongoDB on next operation', {
    module: 'storage-utils',
  });
  setUserFallbackStorageMode(false);
  setOperationFallbackStorageMode(false);
}
