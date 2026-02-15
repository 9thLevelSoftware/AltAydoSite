---
phase: 09-emergency-security-dependency-cleanup
plan: 03
subsystem: api, security, ui
tags: [error-handling, information-leakage, css-variables, api-security]

# Dependency graph
requires:
  - phase: 08-mongodb-consolidation
    provides: "API route structure with MongoDB/fallback storage"
provides:
  - "Sanitized API error responses across all 35 route files"
  - "--mg-error and --mg-panel CSS variables in :root"
  - "Visible error text in 13 component files"
affects: [09-emergency-security-dependency-cleanup, 10-security-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Generic error messages in API responses with server-side logging preserved", "Untyped catch clauses instead of error: any"]

key-files:
  created: []
  modified:
    - "src/app/globals.css"
    - "src/app/api/**/route.ts (35 files)"

key-decisions:
  - "--mg-error: 255, 70, 70 matches existing --mg-danger value for design consistency"
  - "--mg-panel: 0, 20, 40 slightly lighter than --mg-panel-dark for visible panel background"
  - "StaleDocumentError 409 response uses user-friendly message instead of error.message"
  - "Per-user errors in assign-synced-role logged server-side instead of returned in response"

patterns-established:
  - "API error pattern: generic message in response, full error in console.error"
  - "Catch clause pattern: untyped catch (error) instead of catch (error: any)"

# Metrics
duration: 7min
completed: 2026-02-15
---

# Phase 09 Plan 03: Error Response Sanitization Summary

**Sanitized ~75 error.message leaks across 35 API routes and defined 2 missing CSS variables for visible error rendering**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-15T22:07:08Z
- **Completed:** 2026-02-15T22:13:58Z
- **Tasks:** 2
- **Files modified:** 36

## Accomplishments
- Eliminated all error.message and error.stack leakage from API response bodies across 35 route files (~75 instances)
- Defined --mg-error and --mg-panel CSS custom properties in :root, making error text visible across 13 component files
- Fixed error: any type annotations to proper untyped catch clauses throughout
- Preserved all console.error() calls for server-side debugging

## Task Commits

Each task was committed atomically:

1. **Task 1: Define --mg-error and --mg-panel CSS variables** - `b6d3dc2` (fix)
2. **Task 2: Sanitize error.message from all API route responses** - `d07d8a3` (fix)

## Files Created/Modified
- `src/app/globals.css` - Added --mg-error and --mg-panel CSS custom properties to :root
- `src/app/api/users/route.ts` - Sanitized error response
- `src/app/api/users/leaders/route.ts` - Sanitized error response
- `src/app/api/events/discord/route.ts` - Sanitized 5 error response locations
- `src/app/api/planned-missions/route.ts` - Sanitized 5 error response locations
- `src/app/api/planned-missions/[id]/route.ts` - Sanitized 3 error responses
- `src/app/api/planned-missions/[id]/status/route.ts` - Sanitized autoPublishToDiscord error
- `src/app/api/planned-missions/[id]/discord/route.ts` - Sanitized 4 error responses
- `src/app/api/profile/route.ts` - Sanitized GET/PUT error responses including StaleDocumentError
- `src/app/api/discord/roles/route.ts` - Sanitized GET/POST error responses
- `src/app/api/discord/roles/user/route.ts` - Sanitized POST error response
- `src/app/api/discord/init/route.ts` - Sanitized POST error response
- `src/app/api/discord/assign-synced-role/route.ts` - Sanitized main handler and per-user errors
- `src/app/api/admin/discord-sync/route.ts` - Sanitized GET/POST error responses
- `src/app/api/auth/signup/route.ts` - Sanitized database and registration error responses
- `src/app/api/ships/route.ts` - Sanitized error response
- `src/app/api/ships/batch/route.ts` - Sanitized error response
- `src/app/api/ships/manufacturers/route.ts` - Sanitized error response
- `src/app/api/ships/sync-status/route.ts` - Sanitized error response
- `src/app/api/ships/[id]/route.ts` - Sanitized error response
- `src/app/api/cron/warm-images/route.ts` - Sanitized error response
- `src/app/api/cron/ship-sync/route.ts` - Sanitized error response
- `src/app/api/cron/discord-sync/route.ts` - Sanitized error response
- `src/app/api/fleet-ops/operations/route.ts` - Sanitized GET/POST error responses
- `src/app/api/fleet-ops/operations/[id]/route.ts` - Sanitized GET/PUT/DELETE error responses
- `src/app/api/fleet-ops/operations/assign-ship/route.ts` - Removed details field with error.message
- `src/app/api/fleet-ops/operations/upload-image/route.ts` - Removed details field with error.message
- `src/app/api/fleet-ops/operations/images/[id]/route.ts` - Removed details field with error.message
- `src/app/api/fleet-ops/resources/route.ts` - Sanitized GET/POST error responses
- `src/app/api/fleet-ops/resources/[id]/route.ts` - Sanitized GET/PUT/DELETE error responses
- `src/app/api/fleet-ops/resources/allocations/route.ts` - Sanitized GET/POST/DELETE error responses
- `src/app/api/fleet-ops/missions/route.ts` - Sanitized GET/POST/PUT/DELETE error responses
- `src/app/api/fleet-ops/force-fallback/route.ts` - Removed details field with error.message
- `src/app/api/mission-templates/route.ts` - Sanitized GET/POST/PUT/DELETE error responses
- `src/app/api/mission-templates/[id]/route.ts` - Sanitized GET/PUT/DELETE error responses
- `src/app/api/security/escort-requests/route.ts` - Sanitized GET/POST/PUT/DELETE error responses

## Decisions Made
- StaleDocumentError (409 Conflict) response now uses a user-friendly message ("Profile was modified by another session. Please refresh and try again.") instead of error.message, since the original message could contain internal state details
- Per-user errors in the assign-synced-role endpoint are now logged server-side via console.error instead of being included in the response payload, preventing per-user MongoDB error details from being returned to admin clients
- Removed `details` fields from fleet-ops error responses that were leaking internal error messages alongside the main error field

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All API routes now return generic error messages without internal details
- Error text is visible in the UI with proper --mg-error CSS variable
- Ready for Plan 04 (Next.js upgrade) or Phase 10 security hardening
- Build and type-check both pass cleanly

## Self-Check: PASSED

- FOUND: src/app/globals.css
- FOUND: .planning/phases/09-emergency-security-dependency-cleanup/09-03-SUMMARY.md
- FOUND: b6d3dc2 (Task 1 commit)
- FOUND: d07d8a3 (Task 2 commit)
- type-check: PASSED
- build: PASSED (69 pages)

---
*Phase: 09-emergency-security-dependency-cleanup*
*Completed: 2026-02-15*
