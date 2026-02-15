---
phase: 09-emergency-security-dependency-cleanup
plan: 02
subsystem: security
tags: [redos, xss, open-redirect, oauth, input-validation, html-escaping]

# Dependency graph
requires:
  - phase: 08-mongodb-consolidation
    provides: Normalized fields (emailLower, aydoHandleLower) on all user documents
provides:
  - ReDoS-safe user lookups using normalized fields only
  - XSS-safe HTML email templates via escapeHtml()
  - Open redirect protection on login callback URLs
  - Correct OAuth user passwordHash (null instead of empty string)
affects: [10-auth-rbac, auth, email, login]

# Tech tracking
tech-stack:
  added: []
  patterns: [escapeHtml for email templates, isValidCallbackUrl for redirect validation, normalized field lookups without regex]

key-files:
  created: []
  modified:
    - src/lib/user-storage.ts
    - src/lib/email-service.ts
    - src/components/auth/LoginForm.tsx
    - src/app/api/auth/auth.ts
    - src/types/user.ts

key-decisions:
  - "Removed $regex fallback entirely (Phase 8 migrated all records to have normalized fields)"
  - "User type passwordHash changed to string | null to properly represent OAuth users"

patterns-established:
  - "escapeHtml(): All user-supplied values in HTML email templates must be escaped"
  - "isValidCallbackUrl(): All URL redirects from query params must be validated as safe relative paths"
  - "Normalized field lookups: Use emailLower/aydoHandleLower directly, never $regex"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 9 Plan 02: Input Sanitization Summary

**Eliminated 4 input attack vectors: ReDoS in user lookups, XSS in email templates, open redirect on login, and empty-string passwordHash for OAuth users**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T22:07:12Z
- **Completed:** 2026-02-15T22:09:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Removed `$regex` from getUserByEmail() and getUserByHandle(), using normalized fields only (SEC-03)
- Added escapeHtml() utility and applied to all 6 user-supplied interpolations in HTML email templates (SEC-04)
- Added isValidCallbackUrl() validation to all 3 callbackUrl usages in LoginForm (SEC-06)
- Changed OAuth user passwordHash from empty string to null and updated User type to `string | null` (SEC-07)

## Task Commits

Each task was committed atomically:

1. **Task 1: Eliminate regex from user lookups and escape email template inputs** - `5079f52` (fix)
2. **Task 2: Validate callback URLs and fix OAuth passwordHash** - `92bd137` (fix)

## Files Created/Modified
- `src/lib/user-storage.ts` - Removed $regex fallback from getUserByEmail() and getUserByHandle()
- `src/lib/email-service.ts` - Added escapeHtml() utility, applied to all user-supplied HTML interpolations
- `src/components/auth/LoginForm.tsx` - Added isValidCallbackUrl() validation for all callbackUrl usages
- `src/app/api/auth/auth.ts` - Changed OAuth passwordHash from '' to null
- `src/types/user.ts` - Updated passwordHash type from string to string | null

## Decisions Made
- Removed $regex fallback entirely rather than replacing with collation -- Phase 8 migrated all records to have normalized fields (emailLower, aydoHandleLower), so the regex fallback for legacy records is unnecessary
- Updated User type passwordHash to `string | null` to properly represent OAuth users who have no password

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated User type for passwordHash nullability**
- **Found during:** Task 2 (OAuth passwordHash fix)
- **Issue:** Plan mentioned checking the User type but the type was `string`, needed to be `string | null` to accept null
- **Fix:** Changed `passwordHash: string` to `passwordHash: string | null` in src/types/user.ts
- **Files modified:** src/types/user.ts
- **Verification:** npm run type-check passes with null assignment
- **Committed in:** 92bd137 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Type update was anticipated by the plan (it said "If the type is string, update it to string | null"). Necessary for correctness.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 input sanitization vulnerabilities (SEC-03, SEC-04, SEC-06, SEC-07) are closed
- Ready for plans 09-03 and 09-04 (dependency cleanup and Next.js upgrade)

## Self-Check: PASSED

- All 5 modified files exist on disk
- Commit 5079f52 (Task 1) confirmed in git log
- Commit 92bd137 (Task 2) confirmed in git log
- npm run type-check passes
- Zero $regex in user-storage.ts (comments only)
- 7 escapeHtml references in email-service.ts (1 definition + 6 usages)
- 4 isValidCallbackUrl references in LoginForm.tsx (1 definition + 3 usages)
- passwordHash: null confirmed in auth.ts

---
*Phase: 09-emergency-security-dependency-cleanup*
*Completed: 2026-02-15*
