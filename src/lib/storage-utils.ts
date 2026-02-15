import { connectToDatabase } from './mongodb';

/**
 * Checks if MongoDB connection is working.
 *
 * This function attempts to connect to MongoDB. If the connection fails,
 * it throws an error as we no longer support fallback to local storage.
 */
export async function ensureDatabaseConnection(): Promise<boolean> {
  console.log('STORAGE: Testing MongoDB connection');

  try {
    await connectToDatabase();
    console.log('STORAGE: MongoDB connection test successful');
    return true;
  } catch (error) {
    console.error('STORAGE: Error testing MongoDB connection:', error);
    throw new Error('Database connection failed: Cannot connect to MongoDB');
  }
}

// For backwards compatibility, but will now throw error if connection fails
export async function shouldUseMongoDb(): Promise<boolean> {
  return await ensureDatabaseConnection();
}

// Force using local storage for testing purposes
export function forceUseLocalStorage() {
  console.log('STORAGE: Forced to use local storage for all operations');
}

// Reset connection status to try MongoDB again
export function resetConnectionStatus() {
  console.log('STORAGE: Connection status reset, will try MongoDB on next operation');
} 
