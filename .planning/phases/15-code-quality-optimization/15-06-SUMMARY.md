---
phase: 15-code-quality-optimization
plan: 06
subsystem: api
tags: [logging, structured-logging, logger, api-routes, security]

# Dependency graph
requires:
  - phase: 15-02
    provides: Fleet-ops missions route with state machine validation
  - phase: 15-05
    provides: Storage module logging migration (logger module exists and tested)
provides:
  - Zero console.* calls in all API route files
  - Structured logging with route context for all API endpoints
  - Stack trace capture for all API errors
  - Security-compliant logging (no passwords/tokens logged)
affects: [monitoring, observability, debugging, error-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "API route logging with route context: logger.info('message', { route: '/api/...' })"
    - "Error logging with stack trace capture: logger.error('message', error instanceof Error ? error : new Error(String(error)), context)"

key-files:
  created: []
  modified:
    - src/app/api/auth/signup/route.ts
    - src/app/api/auth/forgot-password/route.ts
    - src/app/api/auth/reset-password/route.ts
    - src/app/api/auth/auth.ts
    - src/app/api/profile/route.ts
    - src/app/api/planned-missions/route.ts
    - src/app/api/planned-missions/[id]/route.ts
    - src/app/api/planned-missions/[id]/attendance/route.ts
    - src/app/api/planned-missions/[id]/discord/route.ts
    - src/app/api/planned-missions/[id]/status/route.ts
    - src/app/api/security/escort-requests/route.ts
    - src/app/api/fleet-ops/missions/route.ts
    - src/app/api/fleet-ops/operations/route.ts
    - src/app/api/fleet-ops/operations/[id]/route.ts
    - src/app/api/fleet-ops/operations/upload-image/route.ts
    - src/app/api/fleet-ops/operations/images/[id]/route.ts
    - src/app/api/fleet-ops/operations/assign-ship/route.ts
    - src/app/api/fleet-ops/resources/route.ts
    - src/app/api/fleet-ops/resources/[id]/route.ts
    - src/app/api/fleet-ops/resources/allocations/route.ts
    - src/app/api/fleet-ops/force-fallback/route.ts
    - src/app/api/events/discord/route.ts
    - src/app/api/admin/discord-sync/route.ts
    - src/app/api/discord/roles/route.ts
    - src/app/api/discord/roles/user/route.ts
    - src/app/api/discord/init/route.ts
    - src/app/api/discord/assign-synced-role/route.ts
    - src/app/api/finance/transactions/route.ts
    - src/app/api/users/route.ts
    - src/app/api/users/leaders/route.ts
    - src/app/api/ships/route.ts
    - src/app/api/ships/[id]/route.ts
    - src/app/api/ships/manufacturers/route.ts
    - src/app/api/ships/sync-status/route.ts
    - src/app/api/ships/batch/route.ts
    - src/app/api/cron/warm-images/route.ts
    - src/app/api/cron/ship-sync/route.ts
    - src/app/api/cron/discord-sync/route.ts
    - src/app/api/mission-templates/route.ts
    - src/app/api/mission-templates/[id]/route.ts

key-decisions:
  - "Route context included in all log entries for centralized log filtering"
  - "Error objects passed to logger.error for stack trace preservation"
  - "Security-sensitive routes do not log passwords, tokens, or secrets"
  - "RBAC audit logs use logger.info (not warn) for routine operations"

patterns-established:
  - "API route logging: Include { route: '/api/...' } in all log context"
  - "Error handling: Use error instanceof Error ? error : new Error(String(error))"
  - "Unauthorized cron requests: Use logger.warn for security events"

# Metrics
duration: 45min
completed: 2026-02-16
---

# Phase 15 Plan 06: API Route Logging Migration Summary

**Complete migration of all API routes from console.log/warn/error to structured logger with zero console calls remaining**

## Performance

- **Duration:** ~45 min (including context reset continuation)
- **Started:** 2026-02-16T15:38:00Z (estimated)
- **Completed:** 2026-02-16T16:23:41Z
- **Tasks:** 2
- **Files modified:** 40

## Accomplishments
- Migrated 40 API route files to use structured logger from @/lib/logger
- Added route context to all log entries for centralized filtering
- Ensured stack trace capture for all error logs via Error object passing
- Verified zero console.* calls remaining in entire src/app/api/ directory
- Security-compliant logging: no passwords, tokens, or secrets logged

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate logging in auth, profile, and planned-missions routes** - `777ce46` (refactor)
2. **Task 2: Migrate logging in remaining API routes** - `65a9a88` (refactor)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified

### Task 1 Files (17 files)
- `src/app/api/auth/signup/route.ts` - Auth signup with structured logging
- `src/app/api/auth/forgot-password/route.ts` - Password reset request logging
- `src/app/api/auth/reset-password/route.ts` - Password reset execution logging
- `src/app/api/auth/auth.ts` - NextAuth configuration logging
- `src/app/api/profile/route.ts` - User profile CRUD logging
- `src/app/api/planned-missions/route.ts` - Mission list/create/update/delete logging
- `src/app/api/planned-missions/[id]/route.ts` - Single mission operations logging
- `src/app/api/planned-missions/[id]/attendance/route.ts` - Attendance tracking logging
- `src/app/api/planned-missions/[id]/discord/route.ts` - Discord integration logging
- `src/app/api/planned-missions/[id]/status/route.ts` - Status transitions logging (deviation)
- `src/app/api/security/escort-requests/route.ts` - Escort request CRUD logging
- `src/app/api/fleet-ops/missions/route.ts` - Fleet missions logging
- `src/app/api/fleet-ops/operations/route.ts` - Operations CRUD logging
- `src/app/api/fleet-ops/operations/[id]/route.ts` - Single operation logging
- `src/app/api/fleet-ops/operations/upload-image/route.ts` - Image upload logging
- `src/app/api/fleet-ops/operations/images/[id]/route.ts` - Image retrieval logging
- `src/app/api/fleet-ops/operations/assign-ship/route.ts` - Ship assignment logging (deviation)

### Task 2 Files (23 files)
- `src/app/api/fleet-ops/resources/route.ts` - Resource CRUD logging
- `src/app/api/fleet-ops/resources/[id]/route.ts` - Single resource logging
- `src/app/api/fleet-ops/resources/allocations/route.ts` - Allocation logging
- `src/app/api/fleet-ops/force-fallback/route.ts` - Fallback toggle logging
- `src/app/api/events/discord/route.ts` - Discord events logging
- `src/app/api/admin/discord-sync/route.ts` - Admin sync logging
- `src/app/api/discord/roles/route.ts` - Discord roles logging
- `src/app/api/discord/roles/user/route.ts` - User roles logging
- `src/app/api/discord/init/route.ts` - Discord init logging
- `src/app/api/discord/assign-synced-role/route.ts` - Role assignment logging
- `src/app/api/finance/transactions/route.ts` - Transaction logging
- `src/app/api/users/route.ts` - Users list logging
- `src/app/api/users/leaders/route.ts` - Leaders list logging
- `src/app/api/ships/route.ts` - Ships list logging
- `src/app/api/ships/[id]/route.ts` - Single ship logging
- `src/app/api/ships/manufacturers/route.ts` - Manufacturers logging (deviation)
- `src/app/api/ships/sync-status/route.ts` - Sync status logging (deviation)
- `src/app/api/ships/batch/route.ts` - Batch ships logging (deviation)
- `src/app/api/cron/warm-images/route.ts` - Image warming logging
- `src/app/api/cron/ship-sync/route.ts` - Ship sync logging (deviation)
- `src/app/api/cron/discord-sync/route.ts` - Discord sync logging (deviation)
- `src/app/api/mission-templates/route.ts` - Mission templates logging (deviation)
- `src/app/api/mission-templates/[id]/route.ts` - Single template logging (deviation)

## Decisions Made
- Include `{ route: '/api/...' }` in all log context for centralized filtering
- Pass Error objects to logger.error() for stack trace capture
- Do NOT log sensitive data (passwords, tokens, secrets) in auth routes
- Use logger.warn for unauthorized cron requests (security events)
- Use logger.info for RBAC audit logs (routine operations)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added 2 files discovered during Task 1 verification**
- **Found during:** Task 1 verification
- **Issue:** Plan listed ~31 files but grep found 2 additional files with console calls
- **Fix:** Updated planned-missions/[id]/status/route.ts and fleet-ops/operations/assign-ship/route.ts
- **Files modified:** 2 additional files
- **Verification:** Grep returned zero matches after fix
- **Committed in:** 777ce46 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added 7 files discovered during Task 2 verification**
- **Found during:** Task 2 verification
- **Issue:** Plan's verification step requires zero console calls in ALL src/app/api/ files
- **Fix:** Updated ships/manufacturers, ships/sync-status, ships/batch, cron/ship-sync, cron/discord-sync, mission-templates/route.ts, mission-templates/[id]/route.ts
- **Files modified:** 7 additional files (34 console calls total)
- **Verification:** Grep returned zero matches across entire src/app/api/ directory
- **Committed in:** 65a9a88 (Task 2 commit)

---

**Total deviations:** 9 auto-fixed files (all Rule 2 - missing critical for consistency)
**Impact on plan:** All auto-fixes necessary to meet success criteria ("zero console.* calls in ALL API routes"). No scope creep.

## Issues Encountered
- Context reset during execution required continuation from previous session state
- Additional files beyond plan's explicit list were discovered and handled automatically

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- API layer logging migration complete
- Zero console.* calls remaining in src/app/api/
- All error logs capture stack traces via Error object passing
- Ready for observability/monitoring integration in future phases

## Self-Check: PASSED

- Key file exists: src/app/api/auth/signup/route.ts
- Task 1 commit exists: 777ce46
- Task 2 commit exists: 65a9a88

---
*Phase: 15-code-quality-optimization*
*Completed: 2026-02-16*
