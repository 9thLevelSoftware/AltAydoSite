# AltAydoSite Bug Fix Plan

Repository: `~/AltAydoSite`
Basis: consolidated review of all 17 `.aydo-review/*.md` findings reports

## Priority model

Order the fixes by impact first, then effort:
- Critical path: anything that can leak access, corrupt data, or silently invalidate security controls.
- Quick wins: low-effort fixes that immediately remove confusing failure modes, leaks, or false-success behavior.
- Tech debt: structural cleanup needed to keep the same classes of bugs from reappearing.

## Critical path

These are the highest-impact items and should be handled first.

1. Fix the Discord init endpoint to fail closed when `INIT_SECRET` is missing.
2. Replace all optional/nullable Discord clearance comparisons with a centralized fail-closed guard.
3. Require a verified internal user record before creating or refreshing JWT sessions.
4. Invalidate sessions when the backing user no longer exists or has been disabled.
5. Lock down fleet-ops mission list/create/update/delete authorization so only permitted actors can touch records.
6. Restrict the fleet-ops `force-fallback` runtime switch to admins/leadership only.
7. Add mission-level authorization checks to image upload and image fetch routes.
8. Add unique storage constraints for user identity fields and treat duplicates as conflicts.
9. Stop the shared user-storage fallback from switching the whole process to stale local JSON after one transient Mongo error.
10. Make password-reset token storage and consumption atomic, and hash tokens at rest.
11. Make rate limiting fail closed on store outages and use a trusted client-IP source.
12. Fix the password generator so it never defaults to a known password or prints plaintext secrets.

## Quick wins

These are relatively small changes that should reduce noise, false positives, and operator confusion quickly.

1. Return 400 for malformed JSON bodies instead of converting them into 500s.
2. Validate `ObjectId`/ID inputs before constructing Mongo queries.
3. Clamp and validate `page`/`pageSize` and other request-controlled numeric inputs.
4. Make scripts set a non-zero exit code on partial or failed work.
5. Change debug/test scripts so they do not print full user records or other PII to logs.
6. Fix redirect targets that point to missing routes.
7. Replace `Math.random()` and render-time timestamps with stable values or server-provided data.
8. Remove invalid interactive nesting, especially button-inside-anchor patterns.
9. Decode breadcrumb/path labels before rendering them.
10. Fix misleading labels such as current time rendered as `LAST LOGIN`.
11. Convert obvious placeholder/stub pages and dry-run endpoints into explicit `501`/feature-flagged behavior.
12. Repair any obvious no-op helpers so they either work or clearly report that they are unsupported.

## Tech debt

These items are more structural, but they prevent whole classes of repeat failures.

1. Unify storage behavior so MongoDB, fallback JSON, and migration scripts all use the same document IDs and CRUD semantics.
2. Add or correct unique indexes on normalized identity fields, then clean up any pre-existing duplicates.
3. Align index definitions with the real document fields used by queries and sorts.
4. Rework mission/operation/resource mutations to use transactions, conditional updates, or uniqueness guarantees instead of read-modify-write sequences.
5. Remove placeholder comments and stubbed CRUD branches from the operation/resource storage layer.
6. Move dashboard authentication to a single server-side boundary instead of relying on scattered client checks.
7. Remove or strongly gate the debug/reset pages from production builds.
8. Tighten CSP, SVG handling, and middleware authorization so security assumptions fail closed.
9. Improve accessibility semantics across the UI library and icon exports.
10. Revisit local time and timezone utilities so they preserve instants correctly for recurring calculations.

## Suggested execution order

If this were being implemented in stages, a sensible order would be:

1. Security and auth failures
2. Storage consistency and atomicity
3. Script exit codes and operational correctness
4. Page-level stubs, redirects, and UX fixes
5. UI polish, accessibility, and cleanup

## Acceptance criteria for the plan

- The highest-risk authorization and storage issues are fixed before any cosmetic cleanup.
- Scripts no longer report success on partial failure.
- Routes that mutate state are explicit about who can call them and what they are allowed to change.
- Fallback behavior is deterministic and never hides data loss or stale reads.
- Placeholder UI and documentation-only behavior are either implemented or clearly marked unsupported.
