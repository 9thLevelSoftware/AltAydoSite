---
phase: 10-access-control-hardening
plan: 01
subsystem: auth
tags: [rbac, authorization, access-control, auth-guards, next-auth]

# Dependency graph
requires:
  - phase: 09-emergency-security-dependency-cleanup
    provides: "Clean dependency baseline and Next.js security upgrade"
provides:
  - "Centralized auth-guards.ts module with requireAuth, requireClearance, requireLeadership"
  - "RBAC enforcement on all fleet-ops write routes"
  - "Clearance-based mission template access control"
affects: [10-access-control-hardening, fleet-ops, mission-templates]

# Tech tracking
tech-stack:
  added: []
  patterns: ["auth-guard pattern: async guard returns AuthResult | NextResponse, caller checks instanceof"]

key-files:
  created:
    - src/lib/auth-guards.ts
  modified:
    - src/app/api/fleet-ops/operations/route.ts
    - src/app/api/fleet-ops/operations/[id]/route.ts
    - src/app/api/fleet-ops/resources/route.ts
    - src/app/api/fleet-ops/resources/[id]/route.ts
    - src/app/api/fleet-ops/resources/allocations/route.ts
    - src/app/api/mission-templates/route.ts
    - src/lib/mission-template-storage.ts

key-decisions:
  - "Leadership = role in [Director, Manager, Board Member] OR clearance >= 3"
  - "RBAC_AUDIT console.log on denial for monitoring before full trust"
  - "Operations GET shows all ops to leadership, own-only to others"
  - "PUT/DELETE operations allows leadership OR operation leader (not just leadership)"
  - "canUserAccessTemplate: clearance >= 2 sees all templates, others own-only"
  - "missions/route.ts return true left alone -- it validates participant data, not RBAC"

patterns-established:
  - "Auth guard pattern: const auth = await requireLeadership(); if (auth instanceof NextResponse) return auth;"
  - "Non-blocking leadership check: const check = await requireLeadership(); const isLeader = !(check instanceof NextResponse);"

# Metrics
duration: 5min
completed: 2026-02-15
---

# Phase 10 Plan 01: RBAC Authorization Guards Summary

**Centralized auth-guards.ts module replacing 7 hardcoded return-true RBAC bypasses across fleet-ops and mission-template routes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-15T23:18:14Z
- **Completed:** 2026-02-15T23:23:16Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Created reusable auth-guards.ts with requireAuth, requireClearance, requireLeadership
- Replaced all hardcoded `return true` RBAC bypasses in 5 fleet-ops route files
- Added real clearance check to mission-template access control
- Full build passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create centralized auth-guards.ts module** - `c44b5ab` (feat)
2. **Task 2: Replace fleet-ops RBAC bypasses with auth-guards** - `dba0d80` (feat)
3. **Task 3: Replace mission-template RBAC bypasses with auth-guards** - `b5bb04f` (feat)

## Files Created/Modified
- `src/lib/auth-guards.ts` - Centralized authorization guard module (requireAuth, requireClearance, requireLeadership)
- `src/app/api/fleet-ops/operations/route.ts` - GET uses requireAuth, POST uses requireLeadership
- `src/app/api/fleet-ops/operations/[id]/route.ts` - PUT/DELETE check leadership OR operation leader
- `src/app/api/fleet-ops/resources/route.ts` - POST uses requireLeadership
- `src/app/api/fleet-ops/resources/[id]/route.ts` - PUT/DELETE check leadership OR resource owner
- `src/app/api/fleet-ops/resources/allocations/route.ts` - POST/DELETE check leadership OR op leader OR owner
- `src/app/api/mission-templates/route.ts` - All handlers use requireAuth from auth-guards
- `src/lib/mission-template-storage.ts` - canUserAccessTemplate uses clearance >= 2 check

## Decisions Made
- Leadership defined as role in [Director, Manager, Board Member] OR clearanceLevel >= 3, matching the original commented-out logic
- RBAC_AUDIT logging added to requireLeadership denial path for monitoring
- Operations GET shows all operations to leadership users, restricts to own operations for others
- PUT/DELETE on operations allows operation leader (not just leadership) to preserve workflow
- Resource write operations allow resource owners alongside leadership
- canUserAccessTemplate: clearance >= 2 can see all templates, lower clearance only own templates
- missions/route.ts `return true` at L11 left untouched -- it validates participant data structure, not authorization

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Auth-guards module ready for use by remaining Phase 10 plans
- RBAC enforcement active on all fleet-ops and mission-template routes
- Blocker "[Security]: RBAC hardcoded to return true" can be marked RESOLVED

## Self-Check: PASSED

All 8 files verified present. All 3 task commits verified in git log.

---
*Phase: 10-access-control-hardening*
*Completed: 2026-02-15*
