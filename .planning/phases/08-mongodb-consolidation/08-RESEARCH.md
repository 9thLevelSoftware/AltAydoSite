# Phase 8: MongoDB Consolidation - Research

**Researched:** 2026-02-15
**Domain:** MongoDB connection management, optimistic concurrency control
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use optimistic locking with a version field on documents prone to concurrent writes (starting with user profiles)
- When a stale write is detected, reject it with a clear error rather than silently overwriting
- The user experience: second save gets an error message saying data changed since they loaded it, with option to reload and retry
- This is the standard approach for web apps -- no auto-merge complexity needed at this stage
- Keep the existing local JSON fallback behavior during consolidation
- Phase 8 is about merging two MongoDB clients into one, not about removing the safety net
- The fallback system is orthogonal to connection consolidation -- removing it is a separate decision for a future phase if desired

### Claude's Discretion
- Connection pool sizing details (timeouts, idle connections, retry intervals) within the 50-connection max
- Which module to keep as the canonical client vs which to deprecate
- Migration order (which storage modules to consolidate first)
- Verification approach (how to confirm all operations work identically)
- Internal module naming and export structure

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Summary

The application currently has two separate MongoDB connection modules -- `mongodb.ts` and `mongodb-client.ts` -- each creating their own `MongoClient` instance with independent 100-connection pools. This means the app can open up to 200 concurrent connections to Azure Cosmos DB for MongoDB vCore, which is wasteful and creates confusion about which module to import. Additionally, `mongodb-client.ts` contains an `updateUser()` function with a read-modify-write race condition: it reads the full user document, merges changes in JavaScript, then writes the entire document back with `$set`, allowing concurrent saves to silently overwrite each other.

The consolidation requires: (1) keeping `mongodb.ts` as the canonical connection module (it has the better architecture -- singleton promise pattern, HMR-safe global caching), (2) migrating all user CRUD operations from `mongodb-client.ts` into `user-storage.ts` using the canonical client, (3) updating all 16 files that import from either module to use a single source, and (4) implementing optimistic locking with a `__v` version field on user documents to prevent the race condition.

**Primary recommendation:** Keep `mongodb.ts` as the canonical client, refactor it to export a `getDb()` helper alongside `connectToDatabase()`, migrate all user operations out of `mongodb-client.ts`, then delete `mongodb-client.ts`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mongodb | ^6.16.0 | MongoDB Node.js driver (already installed) | Official driver, direct access to all MongoDB features |
| Next.js | 15.3.3 | App framework (already installed) | Dictates module caching patterns for dev/prod |

### Supporting
No new libraries needed. This is purely an internal refactoring of existing code.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw mongodb driver | Mongoose ODM | Mongoose adds schema validation and built-in optimistic concurrency (`__v` field), but this project is deep into raw driver usage across 10+ storage modules. Introducing Mongoose for one phase would create a mixed-ORM codebase -- worse than either pure approach |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Current State: Two Competing Clients

```
src/lib/
  mongodb.ts          # Client A: singleton promise pattern, returns {client, db}
  mongodb-client.ts   # Client B: mutable client variable, contains user CRUD + tokens
  storage-utils.ts    # Bridge: imports BOTH modules, uses both for connection checking
  user-storage.ts     # Imports mongodb-client (for user CRUD operations)
  ship-storage.ts     # Imports mongodb-client (connectToDatabase for collection access)
  mission-storage.ts  # Imports BOTH (mongodb-client via *, mongodb via connectToDatabase)
  escort-request-storage.ts  # Imports BOTH
  resource-storage.ts        # Imports mongodb-client
  operation-storage.ts       # Imports mongodb-client
  password-reset-storage.ts  # Imports mongodb-client
  planned-mission-storage.ts # Imports mongodb (connectToDatabase)
  mission-template-storage.ts # Imports mongodb (connectToDatabase)
  finance.ts                  # Imports mongodb (connectToDatabase)
  ship-name-matcher.ts        # Imports mongodb (connectToDatabase)
  mongo-indexes.ts            # Pure function, imported by both clients
```

### Recommended Target State

```
src/lib/
  mongodb.ts          # CANONICAL: singleton client, exports connectToDatabase() + getDb()
  mongo-indexes.ts    # Unchanged: pure function, imported by mongodb.ts
  storage-utils.ts    # Simplified: imports only mongodb.ts
  user-storage.ts     # Refactored: user CRUD moved here from mongodb-client.ts
  ship-storage.ts     # Updated: import from mongodb.ts
  mission-storage.ts  # Updated: import only from mongodb.ts
  escort-request-storage.ts  # Updated: import only from mongodb.ts
  resource-storage.ts        # Updated: import only from mongodb.ts
  operation-storage.ts       # Updated: import only from mongodb.ts
  password-reset-storage.ts  # Updated: import only from mongodb.ts + user CRUD inline
  planned-mission-storage.ts # Unchanged (already uses mongodb.ts)
  mission-template-storage.ts # Unchanged (already uses mongodb.ts)
  finance.ts                  # Unchanged (already uses mongodb.ts)
  ship-name-matcher.ts        # Unchanged (already uses mongodb.ts)

  # DELETED: mongodb-client.ts (all functionality absorbed into mongodb.ts + user-storage.ts)
```

### Pattern 1: Canonical Client with getDb() Helper

**What:** A single module that exports both a low-level `connectToDatabase()` (returns `{client, db}`) and a convenience `getDb()` (returns just the `Db` instance). All storage modules import from this single source.

**When to use:** Every database operation across the application.

**Example:**
```typescript
// src/lib/mongodb.ts (consolidated)
import { MongoClient, Db } from 'mongodb';
import { ensureMongoIndexes } from '@/lib/mongo-indexes';

const uri = process.env.MONGODB_URI || process.env.COSMOSDB_CONNECTION_STRING || '';
const DATABASE_ID = process.env.COSMOS_DATABASE_ID || 'aydocorp-database';

const options = {
  maxPoolSize: 50,       // Down from 100 per client (was 200 total)
  minPoolSize: 2,        // Keep 2 warm connections for low-latency first requests
  maxIdleTimeMS: 120000, // 2 minutes idle timeout
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 30000,
  waitQueueTimeoutMS: 15000,
  retryWrites: false,    // Required for Cosmos DB vCore
};

let clientPromise: Promise<MongoClient>;

// ... singleton pattern (existing code from mongodb.ts) ...

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const client = await clientPromise;
  const db = client.db(DATABASE_ID);
  return { client, db };
}

// Convenience helper: most storage modules only need the Db
export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}
```

### Pattern 2: Optimistic Locking with Version Field

**What:** Add a `__v` (version) field to user documents. On update, include the current version in the filter and increment it atomically. If the filter matches zero documents, a concurrent modification occurred.

**When to use:** `updateUser()` and any future operations on high-contention documents.

**Example:**
```typescript
// In user-storage.ts (after migration from mongodb-client.ts)
import { getDb } from './mongodb';

export class StaleDocumentError extends Error {
  constructor(collection: string, id: string) {
    super(`Document in ${collection} with id ${id} was modified by another request. Please reload and try again.`);
    this.name = 'StaleDocumentError';
  }
}

export async function updateUser(id: string, userData: Partial<User>, expectedVersion: number): Promise<User> {
  const db = await getDb();

  // Atomic update: only succeeds if version matches
  const result = await db.collection('users').findOneAndUpdate(
    { id, __v: expectedVersion },
    {
      $set: { ...userData, updatedAt: new Date().toISOString() },
      $inc: { __v: 1 }
    },
    { returnDocument: 'after', projection: { _id: 0 } }
  );

  if (!result) {
    // Could be: document not found OR version mismatch
    const exists = await db.collection('users').findOne({ id }, { projection: { _id: 0 } });
    if (!exists) {
      return null; // Document genuinely not found
    }
    throw new StaleDocumentError('users', id);
  }

  return result as User;
}
```

### Pattern 3: Backward-Compatible Version Field Introduction

**What:** When reading user documents that lack a `__v` field (pre-migration), treat them as version 0. The first update adds the field.

**When to use:** During and after the migration, to handle documents that existed before versioning was introduced.

**Example:**
```typescript
export async function getUserById(id: string): Promise<User | null> {
  const db = await getDb();
  const doc = await db.collection('users').findOne({ id }, { projection: { _id: 0 } });
  if (!doc) return null;

  // Normalize: treat missing __v as version 0
  const user = doc as User & { __v?: number };
  if (user.__v === undefined) {
    user.__v = 0;
  }
  return user;
}
```

### Anti-Patterns to Avoid

- **Read-modify-write without version check:** The current `updateUser()` in `mongodb-client.ts` reads the full document, merges in JS, then writes back. Two concurrent saves to different fields will cause the second write to overwrite the first's changes silently.

- **Multiple MongoClient instances per process:** Each `new MongoClient()` creates an independent connection pool with its own TLS handshakes, auth, and socket management. A Next.js process should have exactly one `MongoClient`.

- **Importing specific collections from the client module:** `mongodb-client.ts` exports `userCollection`, `resetTokenCollection`, etc. as module-level variables. These can be null if the connection hasn't been established, leading to null-reference errors. Instead, each storage module should get its collection from the `db` object on each call.

- **Swallowing version mismatch silently:** The `updateUser()` must propagate the `StaleDocumentError` to the API route, which must return a 409 Conflict to the frontend. The frontend must show the user a "data changed, please reload" message.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection pooling | Custom pool manager | mongodb driver's built-in pool | The driver handles TCP lifecycle, TLS, auth, idle cleanup |
| Version field naming | Custom version scheme | `__v` convention | Matches MongoDB/Mongoose ecosystem convention; tools understand it |
| Atomic update | Read-modify-write in JS | `findOneAndUpdate` with `$set` + `$inc` | Single database round-trip; no race window |
| Connection health checks | Manual ping loops | mongodb driver's topology monitoring | Driver auto-reconnects and emits events |

**Key insight:** The mongodb driver 6.x already handles connection lifecycle robustly. The consolidation is about removing a redundant `MongoClient` instance and ensuring all code paths use the same one, not about building connection management infrastructure.

## Common Pitfalls

### Pitfall 1: Breaking the HMR-Safe Global Pattern
**What goes wrong:** In development, Next.js re-evaluates modules on hot reload. If you don't cache the `MongoClient` promise on `globalThis`, each reload creates a new connection pool, eventually exhausting connections.
**Why it happens:** The existing `mongodb.ts` already handles this correctly with `globalWithMongo._mongoClientPromise`. But during refactoring, it's easy to accidentally remove or break this pattern.
**How to avoid:** Keep the `process.env.NODE_ENV === 'development'` branch that caches on `globalThis`. Verify in dev that `npm run dev` with repeated file saves doesn't accumulate connections.
**Warning signs:** "MongoServerError: too many open connections" in dev mode after saving files multiple times.

### Pitfall 2: Version Field Not Present on Existing Documents
**What goes wrong:** Existing user documents in the database don't have a `__v` field. If the `updateUser()` filter requires `__v: expectedVersion`, it will match zero documents for any existing user.
**Why it happens:** The version field is new; it doesn't exist on documents created before this phase.
**How to avoid:** Treat missing `__v` as version 0. On first update, use filter `{ id, $or: [{ __v: 0 }, { __v: { $exists: false } }] }` and set `__v: 1`. After the first update, subsequent updates use the normal pattern.
**Warning signs:** All existing user updates failing after deployment.

### Pitfall 3: Forgetting to Update API Routes That Import Directly
**What goes wrong:** Several API routes (`assign-ship`, `upload-image`, `images/[id]`, `warm-images`, `finance/transactions`, `force-fallback`) import `connectToDatabase` directly from `mongodb.ts`. These will continue working but if the function signature or return shape changes, they'll break silently.
**Why it happens:** These routes bypass the storage layer and call `connectToDatabase()` directly for ad-hoc database queries.
**How to avoid:** Use grep to find ALL import sites before making any changes to `mongodb.ts` exports. Update them all in a single pass.
**Warning signs:** Build errors or runtime crashes in seemingly unrelated routes after the consolidation.

### Pitfall 4: ship-storage.ts Imports from mongodb-client.ts Differently
**What goes wrong:** `ship-storage.ts` imports `{ connectToDatabase }` from `@/lib/mongodb-client`, but this function returns `{ client, userCollection, resetTokenCollection, transactionCollection }` -- a different shape than `mongodb.ts`'s `connectToDatabase` which returns `{ client, db }`.
**Why it happens:** The two modules export functions with the same name but different return types.
**How to avoid:** When updating `ship-storage.ts` to use the canonical module, also update how it accesses collections. It currently does `const { client } = await connectToDatabase()` then `client.db(DATABASE_ID)` -- which will need to change to `const { db } = await connectToDatabase()` or `const db = await getDb()`.
**Warning signs:** TypeScript errors about missing properties on the return type.

### Pitfall 5: Double Connection Check in storage-utils.ts
**What goes wrong:** `storage-utils.ts` currently imports BOTH modules and calls both `connectToDatabase()` (from `mongodb.ts`) AND `mongoDb.ensureConnection()` (from `mongodb-client.ts`). After deleting `mongodb-client.ts`, this will break.
**Why it happens:** The module was written as a bridge between the two clients.
**How to avoid:** Simplify `storage-utils.ts` to only use the canonical client's `connectToDatabase()` for its health check.
**Warning signs:** Import errors on build after deleting `mongodb-client.ts`.

### Pitfall 6: Cosmos DB vCore and retryWrites
**What goes wrong:** Setting `retryWrites: true` can cause unexpected behavior with Cosmos DB for MongoDB vCore, because vCore handles retries differently than native MongoDB.
**Why it happens:** Cosmos DB vCore is wire-compatible but not feature-identical to MongoDB.
**How to avoid:** Keep `retryWrites: false` in the consolidated client options. This is already correctly set in both existing modules.
**Warning signs:** Duplicate writes, "RetryableWriteError" exceptions.

## Code Examples

### Example 1: Consolidated mongodb.ts Module

```typescript
// Source: Adapted from existing mongodb.ts with pool sizing from phase requirements
import { MongoClient, Db } from 'mongodb';
import { ensureMongoIndexes } from '@/lib/mongo-indexes';

const mongoUri = process.env.MONGODB_URI || process.env.COSMOSDB_CONNECTION_STRING;

if (!mongoUri && process.env.NODE_ENV === 'production') {
  throw new Error('CRITICAL: MongoDB/CosmosDB connection string is required in production.');
}

const uri: string = mongoUri || '';
const DATABASE_ID = process.env.COSMOS_DATABASE_ID || 'aydocorp-database';

const options = {
  maxPoolSize: 50,        // Phase 8 requirement: single pool, 50 max
  minPoolSize: 2,         // Keep 2 warm for low-latency first requests
  maxIdleTimeMS: 120000,  // 2 min (within Azure LB 4-min limit)
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 30000,
  waitQueueTimeoutMS: 15000,
  retryWrites: false,     // Required for Cosmos DB vCore
};

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };
  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Track whether indexes have been ensured (once per process lifetime)
let indexesEnsured = false;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (!uri) {
    throw new Error('No MongoDB URI configured.');
  }
  const client = await clientPromise;
  const db = client.db(DATABASE_ID);

  if (!indexesEnsured) {
    indexesEnsured = true;
    ensureMongoIndexes(db).catch(err => {
      console.error('Index creation failed:', err);
      indexesEnsured = false; // Allow retry on next call
    });
  }

  return { client, db };
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

export { clientPromise };
```

### Example 2: Migrated updateUser with Optimistic Locking

```typescript
// Source: Pattern from https://oneuptime.com/blog/post/2026-01-25-mongodb-optimistic-locking/view
export class StaleDocumentError extends Error {
  constructor(collection: string, id: string) {
    super(`Document was modified by another request. Please reload and try again.`);
    this.name = 'StaleDocumentError';
  }
}

export async function updateUser(
  id: string,
  userData: Partial<User>,
  expectedVersion?: number
): Promise<User | null> {
  const db = await getDb();

  // Build the version filter
  // If expectedVersion is undefined, skip version checking (backward compat)
  // If expectedVersion is provided, enforce optimistic locking
  const versionFilter: Record<string, unknown> = expectedVersion !== undefined
    ? { __v: expectedVersion }
    : {};

  const result = await db.collection('users').findOneAndUpdate(
    { id, ...versionFilter },
    {
      $set: { ...userData, updatedAt: new Date().toISOString() },
      $inc: { __v: 1 }
    },
    { returnDocument: 'after', projection: { _id: 0 } }
  );

  if (!result) {
    // Distinguish "not found" from "version mismatch"
    if (expectedVersion !== undefined) {
      const exists = await db.collection('users').findOne(
        { id },
        { projection: { __v: 1 } }
      );
      if (exists) {
        throw new StaleDocumentError('users', id);
      }
    }
    return null;
  }

  return result as unknown as User;
}
```

### Example 3: API Route Handling StaleDocumentError

```typescript
// In an API route like /api/profile/update
import { StaleDocumentError } from '@/lib/user-storage';

export async function PUT(request: Request) {
  try {
    const { id, __v, ...updates } = await request.json();
    const user = await updateUser(id, updates, __v);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof StaleDocumentError) {
      return NextResponse.json(
        { error: 'CONFLICT', message: error.message },
        { status: 409 }
      );
    }
    throw error;
  }
}
```

## Discretionary Recommendations

### Which Module to Keep: mongodb.ts (canonical)

**Rationale:** `mongodb.ts` uses the singleton promise pattern (`clientPromise`) which is the officially recommended approach for Next.js apps. It handles HMR correctly in development mode, and its `connectToDatabase()` returns a clean `{client, db}` interface that most storage modules already use. In contrast, `mongodb-client.ts` uses a mutable `client` variable with manual `ensureConnection()` retry logic, exports raw collections as module-level variables (fragile), and mixes connection management with user CRUD (poor separation of concerns).

### Connection Pool Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| `maxPoolSize` | 50 | Phase requirement. More than enough for a small org app. Previously 100 per client (200 total) |
| `minPoolSize` | 2 | Keeps 2 connections warm for immediate use after idle periods. Azure LB can close truly idle connections |
| `maxIdleTimeMS` | 120000 | 2 minutes. Well under Azure Load Balancer's 4-minute idle timeout |
| `connectTimeoutMS` | 30000 | Match existing config |
| `socketTimeoutMS` | 30000 | Match existing config |
| `serverSelectionTimeoutMS` | 30000 | Match existing config |
| `waitQueueTimeoutMS` | 15000 | Added explicit queue timeout to prevent indefinite hangs. Not set in current config (defaults to 0/unlimited) |
| `retryWrites` | false | Required for Azure Cosmos DB for MongoDB vCore |

### Migration Order

1. **First: mongodb.ts refactoring** -- Add `getDb()` helper, reduce pool to 50, consolidate `DATABASE_ID` usage
2. **Second: user-storage.ts** -- Move user CRUD from `mongodb-client.ts` into `user-storage.ts`, add version field, implement optimistic locking
3. **Third: password-reset-storage.ts** -- Move reset token functions from `mongodb-client.ts` into `password-reset-storage.ts`
4. **Fourth: storage-utils.ts** -- Simplify to use only canonical client
5. **Fifth: remaining storage modules** -- Update imports in `ship-storage.ts`, `operation-storage.ts`, `resource-storage.ts`, `mission-storage.ts`, `escort-request-storage.ts`
6. **Sixth: API routes** -- Update direct imports in routes (these already use `mongodb.ts`, mostly need signature verification)
7. **Seventh: scripts** -- Update `test-mongodb-connection.ts`, `migrate-ship-references.ts`
8. **Last: delete mongodb-client.ts** -- Only after all imports are migrated and verified

### Verification Approach

1. **TypeScript compilation:** `npm run type-check` must pass with zero errors
2. **Build:** `npm run build` must succeed (all 69+ pages)
3. **Grep verification:** `grep -r "mongodb-client" src/` must return zero results
4. **Import audit:** Only `mongodb.ts` should export `connectToDatabase` and `getDb`; no other module should create a `new MongoClient()`
5. **Connection count:** In dev mode, verify via MongoDB logs or `db.serverStatus().connections` that only one connection pool exists
6. **Optimistic locking test:** Open two browser tabs on the same user profile, edit different fields, save both -- second save should show conflict error

## Import Dependency Map

### Files importing from `mongodb-client.ts` (MUST be migrated)

| File | What it imports | Migration action |
|------|----------------|------------------|
| `user-storage.ts` | `* as mongoDb` (getUserById, updateUser, etc.) | Move CRUD to this file, import from `mongodb.ts` |
| `storage-utils.ts` | `* as mongoDb` (ensureConnection) | Replace with `connectToDatabase()` from `mongodb.ts` |
| `ship-storage.ts` | `{ connectToDatabase }` | Change import to `@/lib/mongodb` |
| `resource-storage.ts` | `* as mongoDb` | Change import to `@/lib/mongodb` |
| `escort-request-storage.ts` | `* as mongoDb` | Remove import (not actually used for DB ops) |
| `password-reset-storage.ts` | `* as mongoDb` (token CRUD) | Move token CRUD here, import from `mongodb.ts` |
| `operation-storage.ts` | `* as mongoDb` (only for shouldUseMongoDb) | Remove import, use storage-utils |
| `mission-storage.ts` | `* as mongoDb` (only for shouldUseMongoDb) | Remove import, already uses `mongodb.ts` connectToDatabase |
| `test-mongodb-connection.ts` (script) | `* as mongoDb` | Update to use `mongodb.ts` |

### Files importing from `mongodb.ts` (already correct, may need signature updates)

| File | What it imports |
|------|----------------|
| `storage-utils.ts` | `{ connectToDatabase }` |
| `mission-storage.ts` | `{ connectToDatabase }` |
| `escort-request-storage.ts` | `{ connectToDatabase }` |
| `planned-mission-storage.ts` | `{ connectToDatabase }` |
| `mission-template-storage.ts` | `{ connectToDatabase }` |
| `finance.ts` | `{ connectToDatabase }` |
| `ship-name-matcher.ts` | `{ connectToDatabase }` |
| `api/cron/warm-images/route.ts` | `{ connectToDatabase }` |
| `api/finance/transactions/route.ts` | `{ connectToDatabase }` |
| `api/force-fallback/route.ts` | `{ connectToDatabase }` |
| `api/fleet-ops/operations/assign-ship/route.ts` | `{ connectToDatabase }` |
| `api/fleet-ops/operations/images/[id]/route.ts` | `{ connectToDatabase }` |
| `api/fleet-ops/operations/upload-image/route.ts` | `{ connectToDatabase }` |
| `test-mongodb-connection.ts` (script) | `{ connectToDatabase }` |
| `migrate-ship-references.ts` (script) | `{ connectToDatabase }` |

## Pre-existing Issues Found During Research

1. **operation-storage.ts, resource-storage.ts:** These modules import `mongodb-client.ts` but their MongoDB implementations are placeholders (`// MongoDB implementation would go here`). They always fall back to local JSON storage. This is not blocking for Phase 8 (they just need their imports updated), but the incomplete MongoDB implementations should be noted for a future phase.

2. **finance.ts uses `client.db()` without DATABASE_ID:** Line 22 calls `client.db()` (no argument), which uses the default database from the connection string. Other modules explicitly use `COSMOS_DATABASE_ID`. This inconsistency should be fixed during consolidation to use the canonical `DATABASE_ID`.

3. **warm-images route also uses `client.db()` pattern:** Line 36 calls `client.db(process.env.COSMOS_DATABASE_ID || 'aydocorp-database')` directly on the client. After consolidation, it should use the `db` from `connectToDatabase()` or `getDb()`.

4. **mongodb-client.ts reads from file system:** The `resolveMongoUri()` function in `mongodb-client.ts` (lines 7-31) attempts to read a `mongodb-connection.txt` file as a URI source. This pattern is not present in `mongodb.ts`. Since `mongodb.ts` is becoming canonical, this file-based fallback will be lost. Given it appears to be a legacy debugging aid, this is acceptable -- but should be documented in migration notes.

5. **escort-request-storage.ts double-imports:** It imports `* as mongoDb from './mongodb-client'` but never actually uses any `mongoDb.*` function for its database operations (it uses `connectToDatabase` from `./mongodb` directly). The `mongodb-client` import is dead code.

6. **mission-storage.ts double-imports:** It imports both `* as mongoDb from './mongodb-client'` and `{ connectToDatabase } from './mongodb'`, but only `connectToDatabase` is used. The `mongoDb` import is only used for `shouldUseMongoDb` from `storage-utils` (imported separately). The `mongoDb` import can be removed.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple MongoClient per process | Single shared client | MongoDB driver 3.x+ best practice | Prevents connection exhaustion |
| Read-modify-write for updates | `findOneAndUpdate` with atomic operators | Always been best practice | Prevents race conditions |
| Manual connection health checks | Driver topology monitoring | MongoDB driver 4.x+ | Driver auto-reconnects; `ensureConnection()` is redundant |
| `retryWrites: true` default | `retryWrites: false` for Cosmos DB vCore | Cosmos DB limitation | Prevents duplicate writes |

**Deprecated/outdated:**
- `mongodb-client.ts`'s `ensureConnection()` with manual ping/retry: The mongodb driver 6.x handles topology changes and reconnection internally. The `clientPromise` pattern in `mongodb.ts` is sufficient -- once the promise resolves, the driver manages the connection lifecycle.

## Open Questions

1. **Frontend version field propagation**
   - What we know: The API must return `__v` with user data, and the frontend must send it back on updates
   - What's unclear: Which specific API routes handle user profile updates, and do they currently accept/return a version field?
   - Recommendation: During implementation, audit all user update API routes (`/api/profile/*`, `/api/users/*`, etc.) and add `__v` to the request/response. The planner should include a task for this.

2. **Existing documents without `__v` field**
   - What we know: Current user documents lack the `__v` field entirely
   - What's unclear: Whether to run a one-time migration to add `__v: 0` to all existing documents, or handle it lazily
   - Recommendation: Handle lazily -- treat missing `__v` as version 0 in code. This avoids needing a migration script and works immediately. The first update to each document will add the field.

3. **Local storage fallback and version fields**
   - What we know: The local JSON fallback (`local-storage.ts`) also has a `updateUser()` that does read-modify-write
   - What's unclear: Should the local storage also implement optimistic locking?
   - Recommendation: No. Local storage is a development/emergency fallback and doesn't face real concurrent write pressure. Adding versioning there adds complexity without benefit. Keep it simple.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/mongodb.ts`, `src/lib/mongodb-client.ts`, and all 16 importing files -- direct inspection
- [MongoDB Node.js Driver Connection Pools](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/) -- pool configuration defaults and recommendations
- [MongoDB Connection Pool Performance Tuning](https://www.mongodb.com/docs/manual/tutorial/connection-pool-performance-tuning/) -- official pool sizing guidance

### Secondary (MEDIUM confidence)
- [MongoDB Optimistic Locking Pattern](https://oneuptime.com/blog/post/2026-01-25-mongodb-optimistic-locking/view) -- verified pattern with `findOneAndUpdate`, `$inc: { __v: 1 }`
- [Azure Cosmos DB Connection Pool Best Practices](https://learn.microsoft.com/en-us/answers/questions/151890/best-practices-for-connection-pooling-for-azure-co) -- Cosmos DB-specific pool advice (singleton client, idle timeout alignment)

### Tertiary (LOW confidence)
- None -- all findings verified against official sources or codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries; pure refactoring of existing code
- Architecture: HIGH -- both modules inspected line-by-line; all import paths traced
- Pitfalls: HIGH -- identified from direct codebase analysis and known MongoDB/Cosmos DB behaviors
- Optimistic locking pattern: HIGH -- verified against official MongoDB docs and recent blog posts

**Research date:** 2026-02-15
**Valid until:** Stable infrastructure change; valid indefinitely unless mongodb driver major version changes
