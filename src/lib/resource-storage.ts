import { Resource, ResourceAllocation } from '@/types/Resource';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { connectToDatabase } from './mongodb';
import { StaleDocumentError } from './storage-errors';
import { logger } from '@/lib/logger';

// MongoDB collection names
const RESOURCES_COLLECTION = 'resources';
const ALLOCATIONS_COLLECTION = 'resourceAllocations';

// File storage paths
const dataDir = path.join(process.cwd(), 'data');
const resourcesFilePath = path.join(dataDir, 'resources.json');
const allocationsFilePath = path.join(dataDir, 'resource-allocations.json');

// Tracking if we had to fall back to local storage
let usingFallbackStorage = false;
let mongoDbConnectionAttempted = false;
let mongoDbConnectionFailed = false;

/**
 * Thrown when a resource cannot be allocated because it is already reserved,
 * the requested time window overlaps an existing allocation, or the requested
 * quantity exceeds availability. API routes should catch this and return 409.
 */
export class ResourceAllocationConflictError extends Error {
  constructor(resourceId: string, reason: string) {
    super(`Resource ${resourceId} cannot be allocated: ${reason}`);
    this.name = 'ResourceAllocationConflictError';
  }
}

/**
 * Determines whether MongoDB is available. Mirrors the operation-storage pattern:
 * returns false (rather than throwing) when the database is unreachable so the
 * local JSON fallback path can take over and keep the hybrid storage intact.
 */
async function shouldUseMongoDb(): Promise<boolean> {
  if (mongoDbConnectionFailed) return false;
  if (mongoDbConnectionAttempted) return true;

  try {
    logger.info('Testing MongoDB connection', { collection: 'resources' });
    await connectToDatabase();
    mongoDbConnectionAttempted = true;
    logger.info('Successfully connected to MongoDB', {
      storage: 'MongoDB',
      collection: 'resources',
    });
    return true;
  } catch (error) {
    logger.error(
      'Failed to connect to MongoDB, falling back to local storage',
      error instanceof Error ? error : new Error(String(error)),
      { collection: 'resources' }
    );
    mongoDbConnectionFailed = true;
    mongoDbConnectionAttempted = true;
    usingFallbackStorage = true;
    return false;
  }
}

// Helper functions for local file storage
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    logger.info('Creating data directory', {
      storage: 'Fallback',
      collection: 'resources',
      path: dataDir,
    });
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(resourcesFilePath)) {
    logger.info('Creating empty resources file', {
      storage: 'Fallback',
      collection: 'resources',
      path: resourcesFilePath,
    });
    fs.writeFileSync(resourcesFilePath, JSON.stringify([]), 'utf8');
  }

  if (!fs.existsSync(allocationsFilePath)) {
    logger.info('Creating empty resource allocations file', {
      storage: 'Fallback',
      collection: 'resource-allocations',
      path: allocationsFilePath,
    });
    fs.writeFileSync(allocationsFilePath, JSON.stringify([]), 'utf8');
  }
}

function getLocalResources(): Resource[] {
  logger.info('Reading resources from local storage', {
    storage: 'Fallback',
    collection: 'resources',
    operation: 'read',
  });
  ensureDataDir();

  try {
    const data = fs.readFileSync(resourcesFilePath, 'utf8');
    const resources = JSON.parse(data) as Resource[];
    logger.info('Found resources in local storage', {
      storage: 'Fallback',
      collection: 'resources',
      count: resources.length,
    });
    return resources;
  } catch (error) {
    logger.error(
      'Error reading resources file',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'Fallback', collection: 'resources' }
    );
    return [];
  }
}

function getLocalAllocations(): ResourceAllocation[] {
  logger.info('Reading resource allocations from local storage', {
    storage: 'Fallback',
    collection: 'resource-allocations',
    operation: 'read',
  });
  ensureDataDir();

  try {
    const data = fs.readFileSync(allocationsFilePath, 'utf8');
    const allocations = JSON.parse(data) as ResourceAllocation[];
    logger.info('Found resource allocations in local storage', {
      storage: 'Fallback',
      collection: 'resource-allocations',
      count: allocations.length,
    });
    return allocations;
  } catch (error) {
    logger.error(
      'Error reading resource allocations file',
      error instanceof Error ? error : new Error(String(error)),
      { storage: 'Fallback', collection: 'resource-allocations' }
    );
    return [];
  }
}

function saveLocalResource(resource: Resource): void {
  logger.info('Saving resource to local storage', {
    storage: 'Fallback',
    collection: 'resources',
    operation: 'save',
    resourceName: resource.name,
  });
  ensureDataDir();

  const resources = getLocalResources();

  // Check if resource already exists
  const existingResourceIndex = resources.findIndex((r) => r.id === resource.id);
  if (existingResourceIndex >= 0) {
    // Update existing resource
    logger.info('Updating existing resource', {
      storage: 'Fallback',
      collection: 'resources',
      operation: 'update',
      resourceName: resource.name,
    });
    resources[existingResourceIndex] = resource;
  } else {
    // Add new resource
    logger.info('Adding new resource', {
      storage: 'Fallback',
      collection: 'resources',
      operation: 'insert',
      resourceName: resource.name,
    });
    resources.push(resource);
  }

  fs.writeFileSync(resourcesFilePath, JSON.stringify(resources, null, 2), 'utf8');
  logger.info('Successfully saved resources to file', {
    storage: 'Fallback',
    collection: 'resources',
    totalCount: resources.length,
  });
}

function saveLocalAllocation(allocation: ResourceAllocation): void {
  logger.info('Saving resource allocation to local storage', {
    storage: 'Fallback',
    collection: 'resource-allocations',
    operation: 'save',
    resourceId: allocation.resourceId,
    operationId: allocation.operationId,
  });
  ensureDataDir();

  const allocations = getLocalAllocations();

  // Check if allocation already exists (by resource and operation)
  const existingAllocationIndex = allocations.findIndex(
    (a) => a.resourceId === allocation.resourceId && a.operationId === allocation.operationId
  );

  if (existingAllocationIndex >= 0) {
    // Update existing allocation
    logger.info('Updating existing resource allocation', {
      storage: 'Fallback',
      collection: 'resource-allocations',
      operation: 'update',
    });
    allocations[existingAllocationIndex] = allocation;
  } else {
    // Add new allocation
    logger.info('Adding new resource allocation', {
      storage: 'Fallback',
      collection: 'resource-allocations',
      operation: 'insert',
    });
    allocations.push(allocation);
  }

  fs.writeFileSync(allocationsFilePath, JSON.stringify(allocations, null, 2), 'utf8');
  logger.info('Successfully saved resource allocations to file', {
    storage: 'Fallback',
    collection: 'resource-allocations',
    totalCount: allocations.length,
  });
}

function deleteLocalResource(id: string): void {
  logger.info('Deleting resource from local storage', {
    storage: 'Fallback',
    collection: 'resources',
    operation: 'delete',
    resourceId: id,
  });
  ensureDataDir();

  const resources = getLocalResources();
  const filteredResources = resources.filter((r) => r.id !== id);

  fs.writeFileSync(resourcesFilePath, JSON.stringify(filteredResources, null, 2), 'utf8');
  logger.info('Resource deleted from local storage', {
    storage: 'Fallback',
    collection: 'resources',
    remainingCount: filteredResources.length,
  });
}

function deleteLocalAllocation(resourceId: string, operationId: string): void {
  logger.info('Deleting resource allocation from local storage', {
    storage: 'Fallback',
    collection: 'resource-allocations',
    operation: 'delete',
    resourceId,
    operationId,
  });
  ensureDataDir();

  const allocations = getLocalAllocations();
  const filteredAllocations = allocations.filter(
    (a) => !(a.resourceId === resourceId && a.operationId === operationId)
  );

  fs.writeFileSync(allocationsFilePath, JSON.stringify(filteredAllocations, null, 2), 'utf8');
  logger.info('Resource allocation deleted from local storage', {
    storage: 'Fallback',
    collection: 'resource-allocations',
    remainingCount: filteredAllocations.length,
  });
}

// Resource storage API
export async function getResourceById(id: string): Promise<Resource | null> {
  logger.info('Getting resource by ID', {
    collection: 'resources',
    operation: 'getById',
    resourceId: id,
  });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      const resource = await db
        .collection(RESOURCES_COLLECTION)
        .findOne({ id }, { projection: { _id: 0 } });
      logger.info(resource ? 'Found resource' : 'Did not find resource', {
        storage: 'MongoDB',
        collection: 'resources',
        resourceId: id,
        found: !!resource,
      });
      return (resource as unknown as Resource) || null;
    } catch (error) {
      logger.error(
        'MongoDB getResourceById failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resources', resourceId: id }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Getting resource by ID from local storage', {
    storage: 'Fallback',
    collection: 'resources',
    resourceId: id,
  });
  const resources = getLocalResources();
  const resource = resources.find((r) => r.id === id) || null;
  logger.info(resource ? 'Found resource' : 'Did not find resource', {
    storage: 'Fallback',
    collection: 'resources',
    resourceId: id,
    found: !!resource,
  });
  return resource;
}

export async function createResource(
  resourceData: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Resource> {
  logger.info('Creating resource', {
    collection: 'resources',
    operation: 'create',
    resourceName: resourceData.name,
  });

  // Create a complete resource object with ID and timestamps
  const resource: Resource & { __v?: number } = {
    ...resourceData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 0,
  };

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      await db.collection('resources').insertOne(resource);
      logger.info('Resource created in MongoDB', {
        storage: 'MongoDB',
        collection: 'resources',
        resourceName: resource.name,
        resourceId: resource.id,
      });
      return resource;
    } catch (error) {
      logger.error(
        'MongoDB createResource failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resources', resourceName: resourceData.name }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Creating resource in local storage', {
    storage: 'Fallback',
    collection: 'resources',
    resourceName: resource.name,
  });
  saveLocalResource(resource);
  return resource;
}

export async function updateResource(
  id: string,
  resourceData: Partial<Resource>,
  expectedVersion?: number
): Promise<Resource | null> {
  logger.info('Updating resource', {
    collection: 'resources',
    operation: 'update',
    resourceId: id,
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
      const { id: _id, __v: _v, ...updateFields } = resourceData as any;

      const result = await db.collection('resources').findOneAndUpdate(
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
            .collection('resources')
            .findOne({ id }, { projection: { __v: 1 } });
          if (exists) {
            throw new StaleDocumentError('resources', id);
          }
        }
        logger.info('Resource not found for update', {
          storage: 'MongoDB',
          collection: 'resources',
          resourceId: id,
        });
        return null;
      }

      logger.info('Successfully updated resource in MongoDB', {
        storage: 'MongoDB',
        collection: 'resources',
        resourceId: id,
      });
      return result as unknown as Resource;
    } catch (error) {
      if (error instanceof StaleDocumentError) {
        throw error; // Re-throw StaleDocumentError -- do NOT fall back to local storage for version conflicts
      }
      logger.error(
        'MongoDB updateResource failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resources', resourceId: id }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Updating resource in local storage', {
    storage: 'Fallback',
    collection: 'resources',
    resourceId: id,
  });
  const resources = getLocalResources();
  const resourceIndex = resources.findIndex((r) => r.id === id);

  if (resourceIndex === -1) {
    logger.info('Resource not found for update', {
      storage: 'Fallback',
      collection: 'resources',
      resourceId: id,
    });
    return null;
  }

  const updatedResource = {
    ...resources[resourceIndex],
    ...resourceData,
    updatedAt: new Date().toISOString(),
  };

  saveLocalResource(updatedResource);
  return updatedResource;
}

export async function deleteResource(id: string): Promise<void> {
  logger.info('Deleting resource', {
    collection: 'resources',
    operation: 'delete',
    resourceId: id,
  });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      await db.collection(RESOURCES_COLLECTION).deleteOne({ id });
      logger.info('Resource deleted from MongoDB', {
        storage: 'MongoDB',
        collection: 'resources',
        resourceId: id,
      });
      return;
    } catch (error) {
      logger.error(
        'MongoDB deleteResource failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resources', resourceId: id }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Deleting resource from local storage', {
    storage: 'Fallback',
    collection: 'resources',
    resourceId: id,
  });
  deleteLocalResource(id);
}

export async function getAllResources(): Promise<Resource[]> {
  logger.info('Getting all resources', { collection: 'resources', operation: 'getAll' });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      const resources = await db
        .collection(RESOURCES_COLLECTION)
        .find({}, { projection: { _id: 0 } })
        .toArray();
      logger.info('Found resources in MongoDB', {
        storage: 'MongoDB',
        collection: 'resources',
        count: resources.length,
      });
      return resources as unknown as Resource[];
    } catch (error) {
      logger.error(
        'MongoDB getAllResources failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resources' }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Getting all resources from local storage', {
    storage: 'Fallback',
    collection: 'resources',
  });
  return getLocalResources();
}

export async function getResourcesByOwner(ownerId: string): Promise<Resource[]> {
  logger.info('Getting resources by owner ID', {
    collection: 'resources',
    operation: 'getByOwner',
    ownerId,
  });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      const resources = await db
        .collection(RESOURCES_COLLECTION)
        .find({ owner: ownerId }, { projection: { _id: 0 } })
        .toArray();
      logger.info('Found resources by owner in MongoDB', {
        storage: 'MongoDB',
        collection: 'resources',
        ownerId,
        count: resources.length,
      });
      return resources as unknown as Resource[];
    } catch (error) {
      logger.error(
        'MongoDB getResourcesByOwner failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resources', ownerId }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Getting resources by owner ID from local storage', {
    storage: 'Fallback',
    collection: 'resources',
    ownerId,
  });
  const resources = getLocalResources();
  return resources.filter((r) => r.owner === ownerId);
}

export async function getResourcesByOperation(operationId: string): Promise<Resource[]> {
  logger.info('Getting resources by operation ID', {
    collection: 'resources',
    operation: 'getByOperation',
    operationId,
  });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      const resources = await db
        .collection(RESOURCES_COLLECTION)
        .find({ assignedTo: operationId }, { projection: { _id: 0 } })
        .toArray();
      logger.info('Found resources by operation in MongoDB', {
        storage: 'MongoDB',
        collection: 'resources',
        operationId,
        count: resources.length,
      });
      return resources as unknown as Resource[];
    } catch (error) {
      logger.error(
        'MongoDB getResourcesByOperation failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resources', operationId }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Getting resources by operation ID from local storage', {
    storage: 'Fallback',
    collection: 'resources',
    operationId,
  });
  const resources = getLocalResources();
  return resources.filter((r) => r.assignedTo === operationId);
}

// Resource allocation API

/**
 * Validates that an allocation can be created for a resource:
 *  - the resource exists,
 *  - the requested quantity does not exceed the resource quantity,
 *  - the requested time window does not overlap another operation's allocation.
 * Throws ResourceAllocationConflictError on any violation.
 */
function assertAllocatable(
  resource: Resource | null,
  existing: ResourceAllocation[],
  allocation: ResourceAllocation
): void {
  if (!resource) {
    throw new ResourceAllocationConflictError(allocation.resourceId, 'resource not found');
  }

  // Quantity availability: requested quantity may not exceed the resource quantity.
  if (
    resource.quantity !== undefined &&
    allocation.quantity !== undefined &&
    allocation.quantity > resource.quantity
  ) {
    throw new ResourceAllocationConflictError(
      allocation.resourceId,
      `requested quantity (${allocation.quantity}) exceeds available quantity (${resource.quantity})`
    );
  }

  // Overlap detection against other operations' allocations on the same resource.
  const newStart = new Date(allocation.startDateTime).getTime();
  const newEnd = new Date(allocation.endDateTime).getTime();
  const overlap = existing.find(
    (a) =>
      a.operationId !== allocation.operationId &&
      newStart < new Date(a.endDateTime).getTime() &&
      new Date(a.startDateTime).getTime() < newEnd
  );
  if (overlap) {
    throw new ResourceAllocationConflictError(
      allocation.resourceId,
      `time window overlaps an existing allocation for operation ${overlap.operationId}`
    );
  }
}

/**
 * Recomputes a resource's status after a deallocation based on the remaining
 * allocations, rather than unconditionally forcing it back to Available.
 */
async function applyDeallocationStatus(
  resourceId: string,
  remaining: ResourceAllocation[]
): Promise<void> {
  const resource = await getResourceById(resourceId);
  if (!resource) return;

  if (remaining.length > 0) {
    // Still allocated to at least one operation -- keep it Reserved.
    await updateResource(resourceId, {
      status: 'Reserved',
      assignedTo: remaining[0].operationId,
    });
  } else {
    // No remaining allocations -- free the resource.
    await updateResource(resourceId, {
      status: 'Available',
      assignedTo: undefined,
    });
  }
}

export async function allocateResource(
  allocationData: Omit<ResourceAllocation, 'createdAt' | 'updatedAt'>
): Promise<ResourceAllocation> {
  logger.info('Allocating resource', {
    collection: 'resource-allocations',
    operation: 'allocate',
    resourceId: allocationData.resourceId,
    operationId: allocationData.operationId,
  });

  // Create a complete allocation object with timestamps
  const allocation: ResourceAllocation = {
    ...allocationData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();

      // Validate quantity/overlap against existing allocations before reserving.
      const existing = (await db
        .collection(ALLOCATIONS_COLLECTION)
        .find({ resourceId: allocation.resourceId }, { projection: { _id: 0 } })
        .toArray()) as unknown as ResourceAllocation[];
      const resourceDoc = (await db
        .collection(RESOURCES_COLLECTION)
        .findOne(
          { id: allocation.resourceId },
          { projection: { _id: 0 } }
        )) as unknown as Resource | null;
      assertAllocatable(resourceDoc, existing, allocation);

      // Atomically reserve the resource: the conditional filter only matches when
      // the resource is currently Available, so concurrent requests cannot both
      // succeed. A null result means another request reserved it first.
      const reserved = await db.collection(RESOURCES_COLLECTION).findOneAndUpdate(
        { id: allocation.resourceId, status: 'Available' },
        {
          $set: {
            status: 'Reserved',
            assignedTo: allocation.operationId,
            updatedAt: new Date().toISOString(),
          },
          $inc: { __v: 1 },
        },
        { returnDocument: 'after', projection: { _id: 0 } }
      );

      if (!reserved) {
        throw new ResourceAllocationConflictError(
          allocation.resourceId,
          'resource is not available (already reserved)'
        );
      }

      // Persist the allocation (idempotent on resource + operation).
      await db
        .collection(ALLOCATIONS_COLLECTION)
        .updateOne(
          { resourceId: allocation.resourceId, operationId: allocation.operationId },
          { $set: allocation },
          { upsert: true }
        );

      logger.info('Resource allocated in MongoDB', {
        storage: 'MongoDB',
        collection: 'resource-allocations',
        resourceId: allocation.resourceId,
        operationId: allocation.operationId,
      });
      return allocation;
    } catch (error) {
      if (error instanceof ResourceAllocationConflictError) {
        throw error; // Conflicts must not silently fall back to local storage
      }
      logger.error(
        'MongoDB allocateResource failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        {
          storage: 'MongoDB',
          collection: 'resource-allocations',
          resourceId: allocationData.resourceId,
        }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage -- re-read and verify availability before writing.
  logger.info('Allocating resource in local storage', {
    storage: 'Fallback',
    collection: 'resource-allocations',
  });
  const resource = getLocalResources().find((r) => r.id === allocation.resourceId) || null;
  const existing = getLocalAllocations().filter((a) => a.resourceId === allocation.resourceId);
  assertAllocatable(resource, existing, allocation);

  if (resource && resource.status !== 'Available') {
    throw new ResourceAllocationConflictError(
      allocation.resourceId,
      `resource is not available (current status: ${resource.status})`
    );
  }

  saveLocalAllocation(allocation);

  // Update the resource's status to Reserved
  if (resource) {
    await updateResource(resource.id, {
      status: 'Reserved',
      assignedTo: allocation.operationId,
    });
  }

  return allocation;
}

/**
 * Removes an allocation. Returns true when a record was actually removed,
 * false when none existed (so the route can respond 404).
 */
export async function deallocateResource(
  resourceId: string,
  operationId: string
): Promise<boolean> {
  logger.info('Deallocating resource', {
    collection: 'resource-allocations',
    operation: 'deallocate',
    resourceId,
    operationId,
  });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      const deleteResult = await db
        .collection(ALLOCATIONS_COLLECTION)
        .deleteOne({ resourceId, operationId });
      const removed = (deleteResult.deletedCount ?? 0) > 0;

      if (removed) {
        const remaining = (await db
          .collection(ALLOCATIONS_COLLECTION)
          .find({ resourceId }, { projection: { _id: 0 } })
          .toArray()) as unknown as ResourceAllocation[];
        await applyDeallocationStatus(resourceId, remaining);
      } else {
        logger.info('No allocation record found to deallocate', {
          storage: 'MongoDB',
          collection: 'resource-allocations',
          resourceId,
          operationId,
        });
      }
      return removed;
    } catch (error) {
      logger.error(
        'MongoDB deallocateResource failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resource-allocations', resourceId, operationId }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Deallocating resource in local storage', {
    storage: 'Fallback',
    collection: 'resource-allocations',
  });
  const removed = getLocalAllocations().some(
    (a) => a.resourceId === resourceId && a.operationId === operationId
  );
  if (!removed) {
    logger.info('No allocation record found to deallocate', {
      storage: 'Fallback',
      collection: 'resource-allocations',
      resourceId,
      operationId,
    });
    return false;
  }

  deleteLocalAllocation(resourceId, operationId);

  const remaining = getLocalAllocations().filter((a) => a.resourceId === resourceId);
  await applyDeallocationStatus(resourceId, remaining);
  return true;
}

export async function getAllocationsByOperation(
  operationId: string
): Promise<ResourceAllocation[]> {
  logger.info('Getting allocations by operation ID', {
    collection: 'resource-allocations',
    operation: 'getByOperation',
    operationId,
  });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      const allocations = await db
        .collection(ALLOCATIONS_COLLECTION)
        .find({ operationId }, { projection: { _id: 0 } })
        .toArray();
      logger.info('Found allocations by operation in MongoDB', {
        storage: 'MongoDB',
        collection: 'resource-allocations',
        operationId,
        count: allocations.length,
      });
      return allocations as unknown as ResourceAllocation[];
    } catch (error) {
      logger.error(
        'MongoDB getAllocationsByOperation failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resource-allocations', operationId }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Getting allocations by operation ID from local storage', {
    storage: 'Fallback',
    collection: 'resource-allocations',
    operationId,
  });
  const allocations = getLocalAllocations();
  return allocations.filter((a) => a.operationId === operationId);
}

export async function getAllAllocationsByResource(
  resourceId: string
): Promise<ResourceAllocation[]> {
  logger.info('Getting all allocations by resource ID', {
    collection: 'resource-allocations',
    operation: 'getByResource',
    resourceId,
  });

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      const allocations = await db
        .collection(ALLOCATIONS_COLLECTION)
        .find({ resourceId }, { projection: { _id: 0 } })
        .toArray();
      logger.info('Found allocations by resource in MongoDB', {
        storage: 'MongoDB',
        collection: 'resource-allocations',
        resourceId,
        count: allocations.length,
      });
      return allocations as unknown as ResourceAllocation[];
    } catch (error) {
      logger.error(
        'MongoDB getAllocationsByResource failed, falling back to local storage',
        error instanceof Error ? error : new Error(String(error)),
        { storage: 'MongoDB', collection: 'resource-allocations', resourceId }
      );
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  logger.info('Getting allocations by resource ID from local storage', {
    storage: 'Fallback',
    collection: 'resource-allocations',
    resourceId,
  });
  const allocations = getLocalAllocations();
  return allocations.filter((a) => a.resourceId === resourceId);
}

export async function isStorageUsingFallback(): Promise<boolean> {
  return usingFallbackStorage;
}
