---
phase: 15-code-quality-optimization
plan: 01
subsystem: database
tags: [mongodb, optimistic-locking, concurrency, storage]

# Dependency graph
requires:
  - phase: 08-mongodb-consolidation
    provides: user-storage.ts with __v optimistic locking pattern
provides:
  - Shared StaleDocumentError class in storage-errors.ts
  - Optimistic locking with __v field in all 7 storage modules
  - expectedVersion parameter on all update functions
affects: [api-routes, planned-missions, missions, operations, resources, escorts, templates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic locking via __v field with MongoDB findOneAndUpdate"
    - "StaleDocumentError for version mismatch detection"
    - "Optional expectedVersion parameter for backward compatibility"

key-files:
  created:
    - src/lib/storage-errors.ts
  modified:
    - src/lib/user-storage.ts
    - src/lib/planned-mission-storage.ts
    - src/lib/operation-storage.ts
    - src/lib/mission-storage.ts
    - src/lib/resource-storage.ts
    - src/lib/escort-request-storage.ts
    - src/lib/mission-template-storage.ts

key-decisions:
  - "StaleDocumentError extracted to shared module, user-storage re-exports for backward compat"
  - "expectedVersion optional on all update functions for backward compat with existing callers"
  - "Version 0 handling: $or filter for __v:0 or missing __v (legacy documents)"
  - "StaleDocumentError never triggers local fallback - must propagate to API routes"

patterns-established:
  - "Optimistic locking: add __v:0 on create, $inc __v on update, check expectedVersion"
  - "Import StaleDocumentError from storage-errors.ts, not user-storage.ts"

# Metrics
duration: 5min
completed: 2026-02-16
---

# Phase 15 Plan 01: Optimistic Locking Summary

**Shared StaleDocumentError module + optimistic locking with __v version field extended to all 7 storage modules for concurrent edit detection**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-16T15:54:24Z
- **Completed:** 2026-02-16T15:59:24Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Extracted StaleDocumentError to shared storage-errors.ts module
- Extended __v optimistic locking pattern from user-storage to 6 additional storage modules
- All update functions now support optional expectedVersion parameter for version checking
- Backward compatibility maintained - existing callers without expectedVersion work unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract StaleDocumentError to shared module** - `88f81d4` (refactor)
2. **Task 2: Add optimistic locking to 6 storage modules** - `45303fb` (feat)

## Files Created/Modified
- `src/lib/storage-errors.ts` - Shared StaleDocumentError class (created)
- `src/lib/user-storage.ts` - Import from storage-errors, re-export for backward compat
- `src/lib/planned-mission-storage.ts` - __v:0 on create, expectedVersion on updatePlannedMission
- `src/lib/operation-storage.ts` - __v:0 on create, expectedVersion on updateOperation
- `src/lib/mission-storage.ts` - __v:0 on create, expectedVersion on updateMission
- `src/lib/resource-storage.ts` - __v:0 on create, expectedVersion on updateResource
- `src/lib/escort-request-storage.ts` - __v:0 on create, expectedVersion on updateEscortRequest
- `src/lib/mission-template-storage.ts` - __v:0 on create, expectedVersion on updateMissionTemplate

## Decisions Made
- **StaleDocumentError extraction:** user-storage.ts re-exports for backward compat so existing consumers (profile route) continue to work
- **expectedVersion optional:** Backward compatible rollout - callers not yet updated skip version checking
- **Version 0 edge case:** Handle documents that may not have __v field yet (treat missing as version 0)
- **StaleDocumentError propagation:** Never triggers local fallback - must propagate to API routes for 409 response

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript error in about/page.tsx (documented in STATE.md) - unrelated to this plan's changes, does not block storage module verification

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 7 storage modules now support concurrent edit detection
- API routes can optionally pass expectedVersion to enable version checking
- Future plans can add version checking to specific API routes incrementally

---
*Phase: 15-code-quality-optimization*
*Completed: 2026-02-16*
