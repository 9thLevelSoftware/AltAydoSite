---
phase: 10-access-control-hardening
plan: 05
subsystem: api
tags: [file-type, magic-bytes, upload-validation, rbac, security]

# Dependency graph
requires:
  - phase: 10-01
    provides: "auth-guards.ts with requireAuth for RBAC enforcement"
provides:
  - "file-validation.ts utility with magic byte image validation"
  - "Upload-image route hardened with content validation and ownership authorization"
affects: [fleet-ops, mission-builder, file-uploads]

# Tech tracking
tech-stack:
  added: [file-type]
  patterns: [magic-byte-validation, dynamic-esm-import, ownership-authorization]

key-files:
  created:
    - src/lib/file-validation.ts
  modified:
    - src/app/api/fleet-ops/operations/upload-image/route.ts
    - next.config.js
    - package.json

key-decisions:
  - "Dynamic import for file-type ESM package to avoid build-time bundling issues"
  - "Fail open on ownership DB errors -- upload still attributed to authenticated user"
  - "Store detected MIME type instead of client-declared type for data integrity"
  - "Temp mission IDs skip ownership check since mission doesn't exist yet"

patterns-established:
  - "Magic byte validation: use file-type with dynamic import, validate before storage"
  - "serverExternalPackages for ESM-only Node packages in Next.js"

# Metrics
duration: 4min
completed: 2026-02-15
---

# Phase 10 Plan 05: File Upload Validation Summary

**Magic byte image validation with file-type package and ownership authorization on upload-image endpoint**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-15T23:25:38Z
- **Completed:** 2026-02-15T23:29:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created file-validation.ts with magic byte inspection using file-type package (SEC-13)
- Replaced Content-Type header check with actual file content validation -- renaming .exe to .jpg now rejected
- Added ownership authorization to upload-image route -- uploader must be participant, leader, or clearance >= 3 (SEC-09)
- Replaced bare getServerSession with requireAuth() from auth-guards

## Task Commits

Each task was committed atomically:

1. **Task 1: Install file-type and create file-validation.ts** - `d7e9faa` (feat)
2. **Task 2: Integrate magic byte validation and ownership check into upload-image route** - `a020ce1` (feat)

## Files Created/Modified
- `src/lib/file-validation.ts` - Magic byte validation utility (validateImageBuffer, MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES)
- `src/app/api/fleet-ops/operations/upload-image/route.ts` - Upload route with magic byte validation and ownership check
- `next.config.js` - Added file-type to serverExternalPackages
- `package.json` - Added file-type dependency

## Decisions Made
- Dynamic `import('file-type')` required since file-type v19+ is ESM-only -- static import breaks Next.js build
- Added `serverExternalPackages: ['file-type']` in next.config.js to prevent webpack bundling issues
- Fail open on ownership DB check errors -- the upload is still authenticated and attributed to user
- Store `validation.detectedType` (actual MIME from magic bytes) instead of `image.type` (client-declared) for data integrity
- Temp mission IDs (starting with `temp-`) skip ownership check since the mission doesn't exist in DB yet

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added file-type to serverExternalPackages**
- **Found during:** Task 2 (build verification)
- **Issue:** `file-type` ESM-only package caused build failure at "Collecting page data" step despite dynamic import
- **Fix:** Added `serverExternalPackages: ['file-type']` to next.config.js so Next.js treats it as external Node module
- **Files modified:** next.config.js
- **Verification:** `npm run build` passes cleanly (68/68 pages)
- **Committed in:** a020ce1 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for build to pass. No scope creep.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- File upload validation complete -- all image uploads now inspected at byte level
- Upload authorization enforced -- users must be operation participants or leaders
- Phase 10 access control hardening plans all complete

---
*Phase: 10-access-control-hardening*
*Completed: 2026-02-15*

## Self-Check: PASSED
- [x] src/lib/file-validation.ts exists
- [x] src/app/api/fleet-ops/operations/upload-image/route.ts exists
- [x] Commit d7e9faa exists
- [x] Commit a020ce1 exists
