import { Resource, ResourceAllocation } from '@/types/Resource';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { shouldUseMongoDb } from './storage-utils';
import { connectToDatabase } from './mongodb';
import { StaleDocumentError } from './storage-errors';

// File storage paths
const dataDir = path.join(process.cwd(), 'data');
const resourcesFilePath = path.join(dataDir, 'resources.json');
const allocationsFilePath = path.join(dataDir, 'resource-allocations.json');

// Tracking if we had to fall back to local storage
let usingFallbackStorage = false;

// Helper functions for local file storage
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    console.log(`STORAGE: Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(resourcesFilePath)) {
    console.log(`STORAGE: Creating empty resources file: ${resourcesFilePath}`);
    fs.writeFileSync(resourcesFilePath, JSON.stringify([]), 'utf8');
  }
  
  if (!fs.existsSync(allocationsFilePath)) {
    console.log(`STORAGE: Creating empty resource allocations file: ${allocationsFilePath}`);
    fs.writeFileSync(allocationsFilePath, JSON.stringify([]), 'utf8');
  }
}

function getLocalResources(): Resource[] {
  console.log('STORAGE: Reading resources from local storage');
  ensureDataDir();
  
  try {
    const data = fs.readFileSync(resourcesFilePath, 'utf8');
    const resources = JSON.parse(data) as Resource[];
    console.log(`STORAGE: Found ${resources.length} resources in local storage`);
    return resources;
  } catch (error) {
    console.error('STORAGE: Error reading resources file:', error);
    return [];
  }
}

function getLocalAllocations(): ResourceAllocation[] {
  console.log('STORAGE: Reading resource allocations from local storage');
  ensureDataDir();
  
  try {
    const data = fs.readFileSync(allocationsFilePath, 'utf8');
    const allocations = JSON.parse(data) as ResourceAllocation[];
    console.log(`STORAGE: Found ${allocations.length} resource allocations in local storage`);
    return allocations;
  } catch (error) {
    console.error('STORAGE: Error reading resource allocations file:', error);
    return [];
  }
}

function saveLocalResource(resource: Resource): void {
  console.log(`STORAGE: Saving resource to local storage: ${resource.name}`);
  ensureDataDir();
  
  const resources = getLocalResources();
  
  // Check if resource already exists
  const existingResourceIndex = resources.findIndex(r => r.id === resource.id);
  if (existingResourceIndex >= 0) {
    // Update existing resource
    console.log(`STORAGE: Updating existing resource: ${resource.name}`);
    resources[existingResourceIndex] = resource;
  } else {
    // Add new resource
    console.log(`STORAGE: Adding new resource: ${resource.name}`);
    resources.push(resource);
  }
  
  fs.writeFileSync(resourcesFilePath, JSON.stringify(resources, null, 2), 'utf8');
  console.log(`STORAGE: Successfully saved resources to file, total count: ${resources.length}`);
}

function saveLocalAllocation(allocation: ResourceAllocation): void {
  console.log(`STORAGE: Saving resource allocation to local storage: ${allocation.resourceId} to operation ${allocation.operationId}`);
  ensureDataDir();
  
  const allocations = getLocalAllocations();
  
  // Check if allocation already exists (by resource and operation)
  const existingAllocationIndex = allocations.findIndex(a => 
    a.resourceId === allocation.resourceId && a.operationId === allocation.operationId);
  
  if (existingAllocationIndex >= 0) {
    // Update existing allocation
    console.log(`STORAGE: Updating existing resource allocation`);
    allocations[existingAllocationIndex] = allocation;
  } else {
    // Add new allocation
    console.log(`STORAGE: Adding new resource allocation`);
    allocations.push(allocation);
  }
  
  fs.writeFileSync(allocationsFilePath, JSON.stringify(allocations, null, 2), 'utf8');
  console.log(`STORAGE: Successfully saved resource allocations to file, total count: ${allocations.length}`);
}

function deleteLocalResource(id: string): void {
  console.log(`STORAGE: Deleting resource from local storage: ${id}`);
  ensureDataDir();
  
  const resources = getLocalResources();
  const filteredResources = resources.filter(r => r.id !== id);
  
  fs.writeFileSync(resourcesFilePath, JSON.stringify(filteredResources, null, 2), 'utf8');
  console.log(`STORAGE: Resource deleted from local storage, remaining resources: ${filteredResources.length}`);
}

function deleteLocalAllocation(resourceId: string, operationId: string): void {
  console.log(`STORAGE: Deleting resource allocation from local storage: ${resourceId} from operation ${operationId}`);
  ensureDataDir();
  
  const allocations = getLocalAllocations();
  const filteredAllocations = allocations.filter(a => 
    !(a.resourceId === resourceId && a.operationId === operationId));
  
  fs.writeFileSync(allocationsFilePath, JSON.stringify(filteredAllocations, null, 2), 'utf8');
  console.log(`STORAGE: Resource allocation deleted from local storage, remaining allocations: ${filteredAllocations.length}`);
}

// Resource storage API
export async function getResourceById(id: string): Promise<Resource | null> {
  console.log(`STORAGE: Getting resource by ID: ${id}`);
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      return null; // Placeholder
    } catch (error) {
      console.error('STORAGE: MongoDB getResourceById failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log(`STORAGE: Getting resource by ID from local storage: ${id}`);
  const resources = getLocalResources();
  const resource = resources.find(r => r.id === id) || null;
  console.log(`STORAGE: ${resource ? 'Found' : 'Did not find'} resource with ID: ${id}`);
  return resource;
}

export async function createResource(resourceData: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>): Promise<Resource> {
  console.log(`STORAGE: Creating resource: ${resourceData.name}`);

  // Create a complete resource object with ID and timestamps
  const resource: Resource & { __v?: number } = {
    ...resourceData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 0
  };

  if (await shouldUseMongoDb()) {
    try {
      const { db } = await connectToDatabase();
      await db.collection('resources').insertOne(resource);
      console.log(`STORAGE: Resource created in MongoDB: ${resource.name}`);
      return resource;
    } catch (error) {
      console.error('STORAGE: MongoDB createResource failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  console.log(`STORAGE: Creating resource in local storage: ${resource.name}`);
  saveLocalResource(resource);
  return resource;
}

export async function updateResource(id: string, resourceData: Partial<Resource>, expectedVersion?: number): Promise<Resource | null> {
  console.log(`STORAGE: Updating resource: ${id}`);

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
            updatedAt: new Date().toISOString()
          },
          $inc: { __v: 1 }
        },
        { returnDocument: 'after', projection: { _id: 0 } }
      );

      if (!result) {
        // Distinguish "not found" from "version mismatch"
        if (expectedVersion !== undefined) {
          const exists = await db.collection('resources').findOne({ id }, { projection: { __v: 1 } });
          if (exists) {
            throw new StaleDocumentError('resources', id);
          }
        }
        console.log(`STORAGE: Resource not found for update: ${id}`);
        return null;
      }

      console.log(`STORAGE: Successfully updated resource in MongoDB: ${id}`);
      return result as unknown as Resource;
    } catch (error) {
      if (error instanceof StaleDocumentError) {
        throw error; // Re-throw StaleDocumentError -- do NOT fall back to local storage for version conflicts
      }
      console.error('STORAGE: MongoDB updateResource failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }

  // Fallback to local storage
  console.log(`STORAGE: Updating resource in local storage: ${id}`);
  const resources = getLocalResources();
  const resourceIndex = resources.findIndex(r => r.id === id);

  if (resourceIndex === -1) {
    console.log(`STORAGE: Resource not found for update: ${id}`);
    return null;
  }

  const updatedResource = {
    ...resources[resourceIndex],
    ...resourceData,
    updatedAt: new Date().toISOString()
  };

  saveLocalResource(updatedResource);
  return updatedResource;
}

export async function deleteResource(id: string): Promise<void> {
  console.log(`STORAGE: Deleting resource: ${id}`);
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      usingFallbackStorage = true;
    } catch (error) {
      console.error('STORAGE: MongoDB deleteResource failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log(`STORAGE: Deleting resource from local storage: ${id}`);
  deleteLocalResource(id);
}

export async function getAllResources(): Promise<Resource[]> {
  console.log('STORAGE: Getting all resources');
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      usingFallbackStorage = true;
    } catch (error) {
      console.error('STORAGE: MongoDB getAllResources failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log('STORAGE: Getting all resources from local storage');
  return getLocalResources();
}

export async function getResourcesByOwner(ownerId: string): Promise<Resource[]> {
  console.log(`STORAGE: Getting resources by owner ID: ${ownerId}`);
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      usingFallbackStorage = true;
    } catch (error) {
      console.error('STORAGE: MongoDB getResourcesByOwner failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log(`STORAGE: Getting resources by owner ID from local storage: ${ownerId}`);
  const resources = getLocalResources();
  return resources.filter(r => r.owner === ownerId);
}

export async function getResourcesByOperation(operationId: string): Promise<Resource[]> {
  console.log(`STORAGE: Getting resources by operation ID: ${operationId}`);
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      usingFallbackStorage = true;
    } catch (error) {
      console.error('STORAGE: MongoDB getResourcesByOperation failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log(`STORAGE: Getting resources by operation ID from local storage: ${operationId}`);
  const resources = getLocalResources();
  return resources.filter(r => r.assignedTo === operationId);
}

// Resource allocation API
export async function allocateResource(allocationData: Omit<ResourceAllocation, 'createdAt' | 'updatedAt'>): Promise<ResourceAllocation> {
  console.log(`STORAGE: Allocating resource ${allocationData.resourceId} to operation ${allocationData.operationId}`);
  
  // Create a complete allocation object with timestamps
  const allocation: ResourceAllocation = {
    ...allocationData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      usingFallbackStorage = true;
    } catch (error) {
      console.error('STORAGE: MongoDB allocateResource failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log(`STORAGE: Allocating resource in local storage`);
  saveLocalAllocation(allocation);
  
  // Update the resource's status to Reserved
  const resource = await getResourceById(allocation.resourceId);
  if (resource) {
    await updateResource(resource.id, {
      status: 'Reserved',
      assignedTo: allocation.operationId
    });
  }
  
  return allocation;
}

export async function deallocateResource(resourceId: string, operationId: string): Promise<void> {
  console.log(`STORAGE: Deallocating resource ${resourceId} from operation ${operationId}`);
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      usingFallbackStorage = true;
    } catch (error) {
      console.error('STORAGE: MongoDB deallocateResource failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log(`STORAGE: Deallocating resource in local storage`);
  deleteLocalAllocation(resourceId, operationId);
  
  // Update the resource's status back to Available
  const resource = await getResourceById(resourceId);
  if (resource) {
    await updateResource(resource.id, {
      status: 'Available',
      assignedTo: undefined
    });
  }
}

export async function getAllocationsByOperation(operationId: string): Promise<ResourceAllocation[]> {
  console.log(`STORAGE: Getting allocations by operation ID: ${operationId}`);
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      usingFallbackStorage = true;
    } catch (error) {
      console.error('STORAGE: MongoDB getAllocationsByOperation failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log(`STORAGE: Getting allocations by operation ID from local storage: ${operationId}`);
  const allocations = getLocalAllocations();
  return allocations.filter(a => a.operationId === operationId);
}

export async function getAllAllocationsByResource(resourceId: string): Promise<ResourceAllocation[]> {
  console.log(`STORAGE: Getting all allocations by resource ID: ${resourceId}`);
  
  if (await shouldUseMongoDb()) {
    try {
      // MongoDB implementation would go here
      usingFallbackStorage = true;
    } catch (error) {
      console.error('STORAGE: MongoDB getAllocationsByResource failed, falling back to local storage:', error);
      usingFallbackStorage = true;
    }
  }
  
  // Fallback to local storage
  console.log(`STORAGE: Getting allocations by resource ID from local storage: ${resourceId}`);
  const allocations = getLocalAllocations();
  return allocations.filter(a => a.resourceId === resourceId);
}

export async function isStorageUsingFallback(): Promise<boolean> {
  return usingFallbackStorage;
} 