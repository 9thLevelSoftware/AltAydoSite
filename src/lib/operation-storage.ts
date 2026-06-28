import { Operation, OperationStatus } from '@/types/Operation';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { connectToDatabase } from './mongodb';
import { StaleDocumentError } from './storage-errors';
import { logger } from '@/lib/logger';

// File storage paths
const dataDir = path.join(process.cwd(), 'data');
const operationsFilePath = path.join(dataDir, 'operations.json');

// Tracking if we had to fall back to local storage
let usingFallbackStorage = false;
let mongoDbConnectionAttempted = false;
let mongoDbConnectionFailed = false;

// Helper functions for local file storage
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    logger.info('Creating data directory', {
      storage: 'Fallback',
      collection: 'operations',
      path: dataDir,
    });
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(operationsFilePath)) {
    logger.info('Creating empty operations file', {
      storage: 'Fallback',
      collection: 'operations',
      path: operationsFilePath,
    });
    fs.writeFileSync(operationsFilePath, JSON.stringify([]), 'utf8');
  }
}

function getLocalOperations(): Operation[] {
  logger.info('Reading operations from local storage', {
    storage: 'Fallback',
    collection: 'operations',
    operation: 'read',
  });
  ensureDataDir();

  try {
    const data = fs.readFileSync(operationsFilePath, 'utf8');
    const operations = JSON.parse(data) as Operation[];
    logger.info('Found operations in local storage', {
      storage: 'Fallback',
      collection: 'operations',
      count: operations.length,
    });
    return operations;
  } catch (error) {
    logger.error(
      'Error reading operations file',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'Fallback', collection: 'operations' }
    );
    return [];
  }
}

function saveLocalOperation(operation: Operation): void {
  logger.info('Saving operation to local storage', {
    storage: 'Fallback',
    collection: 'operations',
    operation: 'save',
    operationName: operation.name,
  });
  ensureDataDir();

  const operations = getLocalOperations();

  // Check if operation already exists
  const existingOperationIndex = operations.findIndex((o) => o.id === operation.id);
  if (existingOperationIndex >= 0) {
    // Update existing operation
    logger.info('Updating existing operation', {
      storage: 'Fallback',
      collection: 'operations',
      operation: 'update',
      operationName: operation.name,
    });
    operations[existingOperationIndex] = operation;
  } else {
    // Add new operation
    logger.info('Adding new operation', {
      storage: 'Fallback',
      collection: 'operations',
      operation: 'insert',
      operationName: operation.name,
    });
    operations.push(operation);
  }

  fs.writeFileSync(operationsFilePath, JSON.stringify(operations, null, 2), 'utf8');
  logger.info('Successfully saved operations to file', {
    storage: 'Fallback',
    collection: 'operations',
    totalCount: operations.length,
  });
}

function deleteLocalOperation(id: string): void {
  logger.info('Deleting operation from local storage', {
    storage: 'Fallback',
    collection: 'operations',
    operation: 'delete',
    operationId: id,
  });
  ensureDataDir();

  const operations = getLocalOperations();
  const filteredOperations = operations.filter((o) => o.id !== id);

  fs.writeFileSync(operationsFilePath, JSON.stringify(filteredOperations, null, 2), 'utf8');
  logger.info('Operation deleted from local storage', {
    storage: 'Fallback',
    collection: 'operations',
    remainingCount: filteredOperations.length,
  });
}

// Function to check if we should use MongoDB or local storage
async function shouldUseMongoDb(): Promise<boolean> {
  if (mongoDbConnectionFailed) return false;
  if (mongoDbConnectionAttempted) return true;

  try {
    logger.info('Testing MongoDB connection', { collection: 'operations' });
    await connectToDatabase();
    mongoDbConnectionAttempted = true;
    logger.info('Successfully connected to MongoDB', {
      storage: 'MongoDB',
      collection: 'operations',
    });
    return true;
  } catch (error) {
    logger.error(
      'Failed to connect to MongoDB, falling back to local storage',
      error instanceof Error ? error : new Error(String(error)),
      { collection: 'operations' }
    );
    mongoDbConnectionFailed = true;
    mongoDbConnectionAttempted = true;
    usingFallbackStorage = true;
    return false;
  }
}

// Operation storage API
export async function getOperationById(id: string): Promise<Operation | null> {
  logger.info('Getting operation by ID', {
    collection: 'operations',
    operation: 'getById',
    operationId: id,
  });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      const operation = await db
        .collection('operations')
        .findOne({ id }, { projection: { _id: 0 } });
      logger.info(operation ? 'Found operation' : 'Did not find operation', {
        storage: 'MongoDB',
        collection: 'operations',
        operationId: id,
        found: !!operation,
      });
      return (operation as unknown as Operation) || null;
    } catch (error) {
      logger.error(
        'MongoDB getOperationById failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'operations', operationId: id }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Getting operation by ID from local storage', {
    storage: 'Fallback',
    collection: 'operations',
    operationId: id,
  });
  const operations = getLocalOperations();
  const operation = operations.find((o) => o.id === id) || null;
  logger.info(operation ? 'Found operation' : 'Did not find operation', {
    storage: 'Fallback',
    collection: 'operations',
    operationId: id,
    found: !!operation,
  });
  return operation;
}

export async function getAllOperations(filters?: {
  status?: string;
  leaderId?: string;
  userId?: string;
}): Promise<Operation[]> {
  logger.info('Getting all operations', {
    collection: 'operations',
    operation: 'getAll',
    filters: JSON.stringify(filters),
  });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();

      // Build query mirroring the local filter logic
      const query: Record<string, unknown> = {};
      if (filters) {
        if (filters.status) {
          query.status = filters.status;
        }
        if (filters.leaderId) {
          query.leaderId = filters.leaderId;
        }
        if (filters.userId) {
          query.$or = [{ leaderId: filters.userId }, { 'participants.userId': filters.userId }];
        }
      }

      const operations = await db
        .collection('operations')
        .find(query, { projection: { _id: 0 } })
        .toArray();
      logger.info('Found operations after applying filters', {
        storage: 'MongoDB',
        collection: 'operations',
        count: operations.length,
      });
      return operations as unknown as Operation[];
    } catch (error) {
      logger.error(
        'MongoDB getAllOperations failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'operations' }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Getting operations from local storage', {
    storage: 'Fallback',
    collection: 'operations',
  });
  let operations = getLocalOperations();

  // Apply filters if provided
  if (filters) {
    if (filters.status) {
      operations = operations.filter((op) => op.status === filters.status);
    }
    if (filters.leaderId) {
      operations = operations.filter((op) => op.leaderId === filters.leaderId);
    }
    if (filters.userId) {
      operations = operations.filter(
        (op) =>
          op.leaderId === filters.userId || op.participants.some((p) => p.userId === filters.userId)
      );
    }
  }

  logger.info('Found operations after applying filters', {
    storage: 'Fallback',
    collection: 'operations',
    count: operations.length,
  });
  return operations;
}

export async function createOperation(
  operationData: Omit<Operation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Operation> {
  logger.info('Creating operation', {
    collection: 'operations',
    operation: 'create',
    operationName: operationData.name,
  });

  // Create a complete operation object with ID and timestamps
  const operation: Operation & { __v?: number } = {
    ...operationData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 0,
  };

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      await db.collection('operations').insertOne(operation);
      logger.info('Operation created in MongoDB', {
        storage: 'MongoDB',
        collection: 'operations',
        operationName: operation.name,
        operationId: operation.id,
      });
      return operation;
    } catch (error) {
      logger.error(
        'MongoDB createOperation failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'operations', operationName: operationData.name }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Creating operation in local storage', {
    storage: 'Fallback',
    collection: 'operations',
    operationName: operation.name,
  });
  saveLocalOperation(operation);
  return operation;
}

export async function updateOperation(
  id: string,
  updates: Partial<Operation>,
  expectedVersion?: number
): Promise<Operation | null> {
  logger.info('Updating operation', {
    collection: 'operations',
    operation: 'update',
    operationId: id,
  });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();

      // Build version filter for optimistic locking
      const versionFilter: Record<string, unknown> = {};
      if (expectedVersion !== undefined) {
        if (expectedVersion === 0) {
          versionFilter.$or = [{ __v: 0 }, { __v: { $exists: false } }];
        } else {
          versionFilter.__v = expectedVersion;
        }
      }

      // Strip id and __v from update data to prevent conflicts
      const { id: _id, __v: _v, ...updateFields } = updates as any;

      const result = await db.collection('operations').findOneAndUpdate(
        { id, ...versionFilter },
        {
          $set: {
            ...updateFields,
            updatedAt: new Date().toISOString(),
          },
          $inc: { __v: 1 },
        },
        { returnDocument: 'after', projection: { _id: 0 } }
      );

      if (!result) {
        // Distinguish "not found" from "version mismatch"
        if (expectedVersion !== undefined) {
          const exists = await db
            .collection('operations')
            .findOne({ id }, { projection: { __v: 1 } });
          if (exists) {
            throw new StaleDocumentError('operations', id);
          }
        }
        logger.info('Operation not found', {
          storage: 'MongoDB',
          collection: 'operations',
          operationId: id,
        });
        return null;
      }

      logger.info('Successfully updated operation in MongoDB', {
        storage: 'MongoDB',
        collection: 'operations',
        operationId: id,
      });
      return result as unknown as Operation;
    } catch (error) {
      if (error instanceof StaleDocumentError) {
        throw error; // Re-throw StaleDocumentError -- do NOT fall back to local storage for version conflicts
      }
      logger.error(
        'MongoDB updateOperation failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'operations', operationId: id }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Updating operation in local storage', {
    storage: 'Fallback',
    collection: 'operations',
    operationId: id,
  });
  const operations = getLocalOperations();
  const operationIndex = operations.findIndex((o) => o.id === id);

  if (operationIndex === -1) {
    logger.info('Operation not found', {
      storage: 'Fallback',
      collection: 'operations',
      operationId: id,
    });
    return null;
  }

  // Update the operation
  const updatedOperation: Operation = {
    ...operations[operationIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  operations[operationIndex] = updatedOperation;
  fs.writeFileSync(operationsFilePath, JSON.stringify(operations, null, 2), 'utf8');
  logger.info('Successfully updated operation', {
    storage: 'Fallback',
    collection: 'operations',
    operationId: id,
  });

  return updatedOperation;
}

export async function deleteOperation(id: string): Promise<boolean> {
  logger.info('Deleting operation', {
    collection: 'operations',
    operation: 'delete',
    operationId: id,
  });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      const result = await db.collection('operations').deleteOne({ id });
      const deleted = result.deletedCount > 0;
      logger.info(deleted ? 'Operation deleted from MongoDB' : 'Operation not found', {
        storage: 'MongoDB',
        collection: 'operations',
        operationId: id,
        deleted,
      });
      return deleted;
    } catch (error) {
      logger.error(
        'MongoDB deleteOperation failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'operations', operationId: id }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Deleting operation from local storage', {
    storage: 'Fallback',
    collection: 'operations',
    operationId: id,
  });
  const operations = getLocalOperations();
  const operationExists = operations.some((o) => o.id === id);

  if (!operationExists) {
    logger.info('Operation not found', {
      storage: 'Fallback',
      collection: 'operations',
      operationId: id,
    });
    return false;
  }

  deleteLocalOperation(id);
  return true;
}

export function isUsingFallbackStorage(): boolean {
  return usingFallbackStorage;
}

export function setFallbackStorageMode(useLocalStorage: boolean) {
  usingFallbackStorage = useLocalStorage;
  mongoDbConnectionAttempted = useLocalStorage;
  mongoDbConnectionFailed = useLocalStorage;
}
