import { logger } from '@/lib/logger';
import { connectToDatabase } from './mongodb';

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
    logger.error('Error testing MongoDB connection', error instanceof Error ? error : undefined, { module: 'storage-utils' });
    throw new Error('Database connection failed: Cannot connect to MongoDB');
  }
}

// For backwards compatibility, but will now throw error if connection fails
export async function shouldUseMongoDb(): Promise<boolean> {
  return await ensureDatabaseConnection();
}

// Force using local storage for testing purposes
export function forceUseLocalStorage() {
  logger.info('Forced to use local storage for all operations', { module: 'storage-utils' });
}

// Reset connection status to try MongoDB again
export function resetConnectionStatus() {
  logger.info('Connection status reset, will try MongoDB on next operation', { module: 'storage-utils' });
} 
