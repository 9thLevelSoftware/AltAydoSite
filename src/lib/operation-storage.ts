import { Operation, OperationStatus } from '@/types/Operation';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { connectToDatabase } from './mongodb';
import { StaleDocumentError } from './storage-errors';

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
    console.log(`STORAGE: Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(operationsFilePath)) {
    console.log(`STORAGE: Creating empty operations file: ${operationsFilePath}`);
    fs.writeFileSync(operationsFilePath, JSON.stringify([]), 'utf8');
  }
}

function getLocalOperations(): Operation[] {
  console.log('STORAGE: Reading operations from local storage');
  ensureDataDir();
  
  try {
    const data = fs.readFileSync(operationsFilePath, 'utf8');
    const operations = JSON.parse(data) as Operation[];
    console.log(`STORAGE: Found ${operations.length} operations in local storage`);
    return operations;
  } catch (error) {
    console.error('STORAGE: Error reading operations file:', error);
    return [];
  }
}

function saveLocalOperation(operation: Operation): void {
  console.log(`STORAGE: Saving operation to local storage: ${operation.name}`);
  ensureDataDir();
  
  const operations = getLocalOperations();
  
  // Check if operation already exists
  const existingOperationIndex = operations.findIndex(o => o.id === operation.id);
  if (existingOperationIndex >= 0) {
    // Update existing operation
    console.log(`STORAGE: Updating existing operation: ${operation.name}`);
    operations[existingOperationIndex] = operation;
  } else {
    // Add new operation
    console.log(`STORAGE: Adding new operation: ${operation.name}`);
    operations.push(operation);
  }
  
  fs.writeFileSync(operationsFilePath, JSON.stringify(operations, null, 2), 'utf8');
  console.log(`STORAGE: Successfully saved operations to file, total count: ${operations.length}`);
}

function deleteLocalOperation(id: string): void {
  console.log(`STORAGE: Deleting operation from local storage: ${id}`);
  ensureDataDir();
  
  const operations = getLocalOperations();
  const filteredOperations = operations.filter(o => o.id !== id);
  
  fs.writeFileSync(operationsFilePath, JSON.stringify(filteredOperations, null, 2), 'utf8');
  console.log(`STORAGE: Operation deleted from local storage, remaining operations: ${filteredOperations.length}`);
}

// Function to check if we should use MongoDB or local storage
async function shouldUseMongoDb(): Promise<boolean> {
  if (mongoDbConnectionFailed) return false;
  if (mongoDbConnectionAttempted) return true;

  try {
    console.log('STORAGE: Testing MongoDB connection...');
    await connectToDatabase();
    mongoDbConnectionAttempted = true;
    console.log('STORAGE: Successfully connected to MongoDB');
    return true;
  } catch (error) {
    console.error('STORAGE: Failed to connect to MongoDB, falling back to local storage:', error);
    mongoDbConnectionFailed = true;
    mongoDbConnectionAttempted = true;
    usingFallbackStorage = true;
    return false;
  }
}

// Operation storage API
export async function getOperationById(id: string): Promise<Operation | null> {
  console.log(`STORAGE: Getting operation by ID: ${id}`);
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      // For now, fall back to local storage as MongoDB client needs to be extended
      usingFallbackStorage = true;
    } catch (error) {
      console.error('STORAGE: MongoDB getOperationById failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log(`STORAGE: Getting operation by ID from local storage: ${id}`);
  const operations = getLocalOperations();
  const operation = operations.find(o => o.id === id) || null;
  console.log(`STORAGE: ${operation ? 'Found' : 'Did not find'} operation with ID: ${id}`);
  return operation;
}

export async function getAllOperations(filters?: { status?: string; leaderId?: string; userId?: string }): Promise<Operation[]> {
  console.log(`STORAGE: Getting all operations with filters:`, filters);
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      // For now, fall back to local storage as MongoDB client needs to be extended
      usingFallbackStorage = true;
    } catch (error) {
      console.error('STORAGE: MongoDB getAllOperations failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log(`STORAGE: Getting operations from local storage`);
  let operations = getLocalOperations();
  
  // Apply filters if provided
  if (filters) {
    if (filters.status) {
      operations = operations.filter(op => op.status === filters.status);
    }
    if (filters.leaderId) {
      operations = operations.filter(op => op.leaderId === filters.leaderId);
    }
    if (filters.userId) {
      operations = operations.filter(op => 
        op.leaderId === filters.userId || 
        op.participants.some(p => p.userId === filters.userId)
      );
    }
  }
  
  console.log(`STORAGE: Found ${operations.length} operations after applying filters`);
  return operations;
}

export async function createOperation(operationData: Omit<Operation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Operation> {
  console.log(`STORAGE: Creating operation: ${operationData.name}`);

  // Create a complete operation object with ID and timestamps
  const operation: Operation & { __v?: number } = {
    ...operationData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 0
  };

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      await db.collection('operations').insertOne(operation);
      console.log(`STORAGE: Operation created in MongoDB: ${operation.name}`);
      return operation;
    } catch (error) {
      console.error('STORAGE: MongoDB createOperation failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  console.log(`STORAGE: Creating operation in local storage: ${operation.name}`);
  saveLocalOperation(operation);
  return operation;
}

export async function updateOperation(id: string, updates: Partial<Operation>, expectedVersion?: number): Promise<Operation | null> {
  console.log(`STORAGE: Updating operation: ${id}`);

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
            updatedAt: new Date().toISOString()
          },
          $inc: { __v: 1 }
        },
        { returnDocument: 'after', projection: { _id: 0 } }
      );

      if (!result) {
        // Distinguish "not found" from "version mismatch"
        if (expectedVersion !== undefined) {
          const exists = await db.collection('operations').findOne({ id }, { projection: { __v: 1 } });
          if (exists) {
            throw new StaleDocumentError('operations', id);
          }
        }
        console.log(`STORAGE: Operation not found: ${id}`);
        return null;
      }

      console.log(`STORAGE: Successfully updated operation in MongoDB: ${id}`);
      return result as unknown as Operation;
    } catch (error) {
      if (error instanceof StaleDocumentError) {
        throw error; // Re-throw StaleDocumentError -- do NOT fall back to local storage for version conflicts
      }
      console.error('STORAGE: MongoDB updateOperation failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  console.log(`STORAGE: Updating operation in local storage: ${id}`);
  const operations = getLocalOperations();
  const operationIndex = operations.findIndex(o => o.id === id);

  if (operationIndex === -1) {
    console.log(`STORAGE: Operation not found: ${id}`);
    return null;
  }

  // Update the operation
  const updatedOperation: Operation = {
    ...operations[operationIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  operations[operationIndex] = updatedOperation;
  fs.writeFileSync(operationsFilePath, JSON.stringify(operations, null, 2), 'utf8');
  console.log(`STORAGE: Successfully updated operation: ${id}`);

  return updatedOperation;
}

export async function deleteOperation(id: string): Promise<boolean> {
  console.log(`STORAGE: Deleting operation: ${id}`);
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      // For now, fall back to local storage as MongoDB client needs to be extended
      usingFallbackStorage = true;
    } catch (error) {
      console.error('STORAGE: MongoDB deleteOperation failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log(`STORAGE: Deleting operation from local storage: ${id}`);
  const operations = getLocalOperations();
  const operationExists = operations.some(o => o.id === id);
  
  if (!operationExists) {
    console.log(`STORAGE: Operation not found: ${id}`);
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