---
phase: 08-mongodb-consolidation
plan: 02
subsystem: database
tags: [mongodb, consolidation, optimistic-locking, profile-api, connection-pool]

# Dependency graph
requires:
  - phase: 08-01
    provides: "Canonical MongoDB client with getDb() helper and user CRUD with optimistic locking"
provides:
  - "Single MongoDB client module -- mongodb-client.ts deleted, all imports consolidated on mongodb.ts"
  - "Password reset token CRUD inlined via getDb() in password-reset-storage.ts"
  - "Profile API returns __v version field and handles 409 Conflict for optimistic locking"
  - "Ship storage uses db from connectToDatabase() (no manual client.db(DATABASE_ID))"
affects: [09 (security hardening can rely on single client), 10 (RBAC can use version-aware updates), 11 (profile conflict resolution)]

# Tech tracking
tech-stack:
  added: []
  patterns: [profile-api-version-field, inline-token-crud, ships-only-detection-with-version]

key-files:
  created: []
  modified:
    - src/lib/password-reset-storage.ts
    - src/lib/storage-utils.ts
    - src/lib/ship-storage.ts
    - src/lib/operation-storage.ts
    - src/lib/resource-storage.ts
    - src/lib/mission-storage.ts
    - src/lib/escort-request-storage.ts
    - src/scripts/test-mongodb-connection.ts
    - src/app/api/profile/route.ts

key-decisions:
  - "Inlined token CRUD in password-reset-storage.ts rather than creating a new helper module"
  - "Ships-only detection updated to filter __v from key count to preserve existing behavior"
  - "Profile API destructures __v from validated updates to prevent it from being $set directly"

patterns-established:
  - "Profile version contract: GET returns __v, PUT accepts __v, PUT returns 409 on StaleDocumentError"
  - "Dead import cleanup: storage modules that only imported mongodb-client as dead code had imports removed"

# Metrics
duration: 5min
completed: 2026-02-15
---

# Phase 8 Plan 2: MongoDB Client Consolidation Summary

**All storage modules consolidated on mongodb.ts, mongodb-client.ts deleted, profile API wired for __v optimistic locking with 409 Conflict handling**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-15T20:59:31Z
- **Completed:** 2026-02-15T21:04:36Z
- **Tasks:** 3
- **Files modified:** 9 (plus 1 deleted)

## Accomplishments
- Migrated password-reset-storage.ts from mongodb-client to inline token CRUD via getDb() with local JSON fallback preserved
- Removed mongodb-client.ts imports from all 7 remaining files (ship, operation, resource, mission, escort-request storage + test script + storage-utils)
- Deleted mongodb-client.ts -- zero references remain in src/
- Wired __v version field through profile API GET/PUT with StaleDocumentError -> 409 Conflict handling
- Full build passes (all pages compile), type-check passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate password-reset-storage.ts and storage-utils.ts to canonical client** - `a439e7e` (feat)
2. **Task 2: Update remaining storage module imports and delete mongodb-client.ts** - `90fdb19` (feat)
3. **Task 3: Wire version field through profile API and verify full build** - `777f5d0` (feat)

## Files Created/Modified
- `src/lib/password-reset-storage.ts` - Token CRUD inlined via getDb(), no mongodb-client dependency
- `src/lib/storage-utils.ts` - Simplified to use only connectToDatabase() for health checks
- `src/lib/ship-storage.ts` - Import changed to @/lib/mongodb, uses db from connectToDatabase() directly
- `src/lib/operation-storage.ts` - shouldUseMongoDb() rewritten with connectToDatabase(), mongodb-client removed
- `src/lib/resource-storage.ts` - Dead mongodb-client import removed
- `src/lib/mission-storage.ts` - Dead mongodb-client import removed
- `src/lib/escort-request-storage.ts` - Dead mongodb-client import removed
- `src/scripts/test-mongodb-connection.ts` - Uses connectToDatabase() for all operations
- `src/app/api/profile/route.ts` - __v in GET/PUT responses, StaleDocumentError -> 409 Conflict, Zod schema extended
- `src/lib/mongodb-client.ts` - DELETED (425 lines removed)

## Decisions Made
- Inlined token CRUD operations directly in password-reset-storage.ts rather than creating a new token-storage module -- keeps the existing module boundary and reduces file count
- Updated ships-only detection in profile PUT to filter `__v` from key count so that `{ships: [...], __v: N}` still triggers the ships-only path
- Destructured `__v` out of the validated updates object before passing to updateUser() to ensure it is not included in $set (it is handled by $inc in user-storage.ts)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated ships-only detection to account for __v key**
- **Found during:** Task 3 (profile API wiring)
- **Issue:** The existing ships-only detection checked `Object.keys(body).length === 1 && body.ships !== undefined`. When __v is sent alongside ships, this would incorrectly fall through to the general update path, causing unnecessary Zod validation of ships data.
- **Fix:** Changed detection to filter out __v key before checking: `Object.keys(body).filter(k => k !== '__v')` then check length === 1 and key === 'ships'
- **Files modified:** src/app/api/profile/route.ts
- **Verification:** Type-check and build pass
- **Committed in:** 777f5d0 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor detection logic fix required for backward compatibility. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 8 success criteria fully met: single MongoDB client, 50-connection pool, all storage modules consolidated, optimistic locking end-to-end
- mongodb-client.ts is deleted -- no dual-client confusion possible
- Profile API is ready for frontend optimistic locking integration (Phase 11 profile localStorage migration)
- StaleDocumentError propagation established -- other API routes can adopt the same pattern in Phase 10

## Self-Check: PASSED

All 9 modified files verified present, mongodb-client.ts confirmed deleted, all 3 commit hashes found in git log.

---
*Phase: 08-mongodb-consolidation*
*Completed: 2026-02-15*
