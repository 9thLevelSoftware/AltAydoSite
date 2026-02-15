---
phase: 08-mongodb-consolidation
plan: 01
subsystem: database
tags: [mongodb, optimistic-locking, connection-pool, atomic-updates, cosmos-db]

# Dependency graph
requires:
  - phase: none
    provides: "Existing mongodb.ts and user-storage.ts files"
provides:
  - "Canonical MongoDB client with getDb() helper (src/lib/mongodb.ts)"
  - "User CRUD with atomic findOneAndUpdate and optimistic locking via __v version field"
  - "StaleDocumentError class for 409 Conflict handling in API routes"
affects: [08-02 (remaining storage modules migrate to getDb()), 09/10 (API routes can use StaleDocumentError for conflict responses)]

# Tech tracking
tech-stack:
  added: []
  patterns: [optimistic-locking-via-__v, getDb-convenience-helper, fire-and-forget-indexes, once-per-process-guard]

key-files:
  created: []
  modified:
    - src/lib/mongodb.ts
    - src/lib/user-storage.ts

key-decisions:
  - "50-connection pool (down from 100) with minPoolSize=2 for warm connections"
  - "waitQueueTimeoutMS reduced to 15s to prevent indefinite queue hangs"
  - "Index creation is fire-and-forget with once-per-process guard instead of awaited on every call"
  - "expectedVersion parameter is optional for backward compatibility -- callers not yet updated skip version checking"
  - "StaleDocumentError propagates through catch blocks -- never triggers local storage fallback"
  - "Regex inputs escaped to prevent ReDoS in email/handle lookups"

patterns-established:
  - "getDb() pattern: all storage modules import getDb() from mongodb.ts, not raw MongoClient"
  - "Optimistic locking: updateX() accepts optional expectedVersion, uses $inc __v, throws StaleDocumentError on mismatch"
  - "Lazy version introduction: documents without __v are treated as version 0, no migration script needed"
  - "WithId<Document> cast pattern: use `as unknown as T` for MongoDB document-to-type casts"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 8 Plan 1: MongoDB Client & User CRUD Summary

**Canonical MongoDB client with getDb() helper and atomic user updates using optimistic locking via __v version field**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T20:54:28Z
- **Completed:** 2026-02-15T20:57:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Refactored mongodb.ts into the single canonical MongoDB connection module with optimized pool (50 max, 2 warm) and getDb() convenience export
- Migrated all user CRUD from mongodb-client.ts into user-storage.ts with inline MongoDB driver operations
- Replaced the read-modify-write race condition in updateUser() with atomic findOneAndUpdate using $set/$inc and optimistic locking
- Added StaleDocumentError that propagates to API routes for 409 Conflict responses

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor mongodb.ts into canonical client with getDb() helper** - `8083064` (feat)
2. **Task 2: Migrate user CRUD to user-storage.ts with optimistic locking** - `b718c0f` (feat)

## Files Created/Modified
- `src/lib/mongodb.ts` - Canonical MongoDB client: 50-pool, DATABASE_ID constant, getDb() export, once-per-process index guard, no per-call ping
- `src/lib/user-storage.ts` - Inline user CRUD with atomic findOneAndUpdate, optimistic locking via __v, StaleDocumentError, ReDoS-safe regex, local fallback preserved

## Decisions Made
- Used 50-connection pool (down from 100) since this is a single-pool architecture -- 50 is more than sufficient for the user base
- Made `expectedVersion` optional on `updateUser()` so existing callers continue working without modification (backward compatible rollout)
- Index creation changed from blocking `await` on every `connectToDatabase()` call to fire-and-forget with a once-per-process boolean guard -- eliminates a latency source
- Removed the `db.command({ ping: 1 })` health check that ran on every `connectToDatabase()` call -- the MongoDB driver handles connection health internally
- ReDoS protection added to email and handle regex lookups by escaping special characters in user input

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript cast errors for MongoDB WithId<Document>**
- **Found during:** Task 2 (user CRUD migration)
- **Issue:** `doc as User` fails TypeScript strict checking because `WithId<Document>` and `User` don't sufficiently overlap. The plan specified `doc as User` but the compiler requires a two-step cast.
- **Fix:** Changed all 5 instances from `doc as User` to `doc as unknown as User`
- **Files modified:** src/lib/user-storage.ts
- **Verification:** `npm run type-check` passes with zero errors
- **Committed in:** b718c0f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cast syntax adjustment required for TypeScript strict mode. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- mongodb.ts is now the canonical client -- Plan 02 can migrate remaining storage modules (mission, operation, escort, resource, password-reset) to use getDb()
- mongodb-client.ts still exists and is imported by 7 other files -- Plan 02 will handle those migrations and eventual deletion
- StaleDocumentError is ready for API route consumption once callers are updated to pass expectedVersion

## Self-Check: PASSED

All files verified present, all commit hashes found in git log.

---
*Phase: 08-mongodb-consolidation*
*Completed: 2026-02-15*
