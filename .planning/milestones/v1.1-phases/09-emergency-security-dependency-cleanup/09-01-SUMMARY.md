---
phase: 09-emergency-security-dependency-cleanup
plan: 01
subsystem: api, security
tags: [next-auth, endpoint-security, cron-auth, fail-closed, database-fix]

# Dependency graph
requires: []
provides:
  - Auth-gated storage-status endpoint (getServerSession)
  - Fail-closed cron authentication pattern (503 when CRON_SECRET missing)
  - Clean 401 responses with no debug info or secret leaks
  - Correct database targeting for finance transactions
affects: [09-02, 09-03, 09-04, 10-security-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fail-closed cron auth: reject 503 when CRON_SECRET unset, 401 on mismatch"
    - "Auth-gated status endpoints via getServerSession(authOptions)"
    - "Sanitized error responses: generic messages, no stack traces"

key-files:
  created: []
  modified:
    - src/app/api/storage-status/route.ts
    - src/app/api/cron/discord-sync/route.ts
    - src/app/api/cron/ship-sync/route.ts
    - src/app/api/cron/warm-images/route.ts
    - src/app/api/discord/assign-synced-role/route.ts
    - src/app/api/finance/transactions/route.ts
    - src/lib/finance.ts
    - package.json

key-decisions:
  - "Deleted /api/diagnostic and /api/force-fallback entirely rather than auth-gating (debug endpoints have no production use)"
  - "Auth-gated /api/storage-status with session check rather than deleting (still useful for admins)"
  - "Fail-closed cron pattern returns 503 (not 401) when CRON_SECRET unset to distinguish misconfiguration from bad token"
  - "Removed migrate-users npm script proactively (depends on @azure/cosmos being removed in Plan 04)"
  - "Fixed warm-images to use { db } from connectToDatabase() instead of manual client.db(envVar) for consistency"

patterns-established:
  - "Fail-closed cron auth: all cron endpoints must check !cronSecret first, return 503"
  - "No debug objects in 401 responses: only { error: 'Unauthorized' }"
  - "Database access via { db } from connectToDatabase(), never client.db() without args"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 9 Plan 01: Endpoint Security Hardening Summary

**Deleted 2 unauthenticated debug endpoints, auth-gated storage-status, enforced fail-closed cron auth on 3 endpoints, stripped debug info from 401 responses, and fixed finance DB targeting**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T22:07:04Z
- **Completed:** 2026-02-15T22:10:41Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Eliminated 2 completely unauthenticated endpoints that leaked user IDs, emails, password hash info, file paths, cwd, and error stacks
- Enforced fail-closed authentication on all 3 cron endpoints (discord-sync, ship-sync, warm-images) -- previously skipped auth entirely when CRON_SECRET was unset
- Removed debug object from assign-synced-role 401 response that leaked CRON_SECRET prefix and received auth header
- Fixed finance transactions writing to wrong database (client.db() without args vs connectToDatabase().db)

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete debug endpoints and auth-gate storage-status** - `4dab538` (fix)
2. **Task 2: Fix cron auth to fail-closed, strip debug from 401s, fix finance DB** - `777e20f` (fix)

## Files Created/Modified
- `src/app/api/diagnostic/route.ts` - DELETED (leaked user data, file paths, error stacks to unauthenticated callers)
- `src/app/api/force-fallback/route.ts` - DELETED (leaked user data, roles, password hash info to unauthenticated callers)
- `src/app/api/storage-status/route.ts` - Added getServerSession auth gate, sanitized error responses
- `src/app/api/cron/discord-sync/route.ts` - Fail-closed cron auth (503 when CRON_SECRET unset)
- `src/app/api/cron/ship-sync/route.ts` - Fail-closed cron auth (503 when CRON_SECRET unset)
- `src/app/api/cron/warm-images/route.ts` - Fail-closed cron auth + fixed db access to use connectToDatabase().db
- `src/app/api/discord/assign-synced-role/route.ts` - Removed debug object from 401 response
- `src/app/api/finance/transactions/route.ts` - Fixed to use { db } from connectToDatabase()
- `src/lib/finance.ts` - Fixed to use { db } from connectToDatabase()
- `package.json` - Removed migrate-users script

## Decisions Made
- Deleted /api/diagnostic and /api/force-fallback entirely rather than auth-gating them -- these are debug-only endpoints with no production use
- Auth-gated /api/storage-status with getServerSession rather than deleting -- still useful for admin monitoring
- Fail-closed cron pattern returns 503 (Server misconfigured) rather than 401 when CRON_SECRET is unset, making it clear the issue is configuration not authorization
- Removed migrate-users npm script proactively since it depends on @azure/cosmos which will be removed in Plan 04
- Fixed warm-images to use `{ db }` from connectToDatabase() for consistency (was using client.db(envVar) directly)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed warm-images database access pattern**
- **Found during:** Task 2 (cron auth fixes)
- **Issue:** warm-images/route.ts used `const { client } = await connectToDatabase(); const db = client.db(process.env.COSMOS_DATABASE_ID || 'aydocorp-database')` -- while this technically worked (explicit env var), it bypassed the centralized db selection in connectToDatabase() and would break if the env var was missing
- **Fix:** Changed to `const { db } = await connectToDatabase()` for consistency with all other database access patterns
- **Files modified:** src/app/api/cron/warm-images/route.ts
- **Verification:** Type-check passes, build succeeds
- **Committed in:** 777e20f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minimal -- improved consistency of database access pattern. No scope creep.

## Issues Encountered
- Stale `.next/types` cache referenced deleted diagnostic and force-fallback endpoints, causing type-check failure. Resolved by removing the stale cache directories.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All critical endpoint security issues resolved
- Ready for Plan 02 (dependency cleanup) and subsequent security hardening phases
- CRON_SECRET must be configured in production environment for cron endpoints to function (was likely already set, but now it's enforced rather than optional)

## Self-Check: PASSED

All files verified present (or confirmed deleted). All commit hashes found in git log.

---
*Phase: 09-emergency-security-dependency-cleanup*
*Completed: 2026-02-15*
