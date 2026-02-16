# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** AydoCorp members have a secure, polished, and performant hub for managing fleet operations, missions, and org coordination.
**Current focus:** Phase 14 - Design System Consolidation

## Current Position

Phase: 14 of 15 (Design System Consolidation)
Plan: 7 of 7 in current phase (14-03 complete)
Status: Executing Phase 14
Last activity: 2026-02-16 -- Plan 14-03 executed (public page button consolidation)

Progress: [██████░░░░] 58%

## Performance Metrics

**v1.0 Summary:**
- Total plans completed: 26
- Average duration: ~2.7 min per plan
- Total execution time: ~69 min

**v1.1:**
- Total plans completed: 20
- Phases: 8 (Phases 8-15)
- Requirements: 51

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 08    | 01   | 3min     | 2     | 2     |
| 08    | 02   | 5min     | 3     | 10    |
| 09    | 01   | 3min     | 2     | 9     |
| 09    | 02   | 3min     | 2     | 5     |
| 09    | 03   | 7min     | 2     | 36    |
| 09    | 04   | 4min     | 2     | 3     |
| 10    | 03   | 4min     | 3     | 6     |
| 10    | 01   | 5min     | 3     | 8     |
| 10    | 04   | 2min     | 2     | 1     |
| 10    | 02   | 4min     | 3     | 2     |
| 10    | 05   | 4min     | 2     | 4     |
| 11    | 01   | 2min     | 2     | 7     |
| 11    | 02   | 4min     | 2     | 5     |
| 11    | 03   | 3min     | 2     | 3     |
| 12    | 01   | 3min     | 2     | 117   |
| 12    | 02   | 2min     | 2     | 5     |
| 13    | 01   | 3min     | 2     | 6     |
| 13    | 03   | 6min     | 2     | 6     |
| 13    | 02   | 5min     | 2     | 14    |
| 13    | 04   | 4min     | 2     | 6     |
| 14    | 01   | 2min     | 2     | 3     |
| 14    | 02   | 2min     | 2     | 3     |
| 14    | 04   | 3min     | 2     | 2     |
| 14    | 06   | 2min     | 2     | 3     |
| 14    | 05   | 1min     | 2     | 8     |
| 14    | 03   | 2min     | 2     | 3     |

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table with outcomes.
v1.1 decision: Address all project review findings in v1.1 (100+ issues across security/UX/perf/UI).
08-01: Pool reduced to 50 (from 100), minPoolSize=2 for warm connections
08-01: Index creation fire-and-forget with once-per-process guard (no per-call ping)
08-01: expectedVersion optional on updateUser() for backward-compatible rollout
08-01: StaleDocumentError never triggers local fallback -- must propagate to API routes
08-02: Token CRUD inlined in password-reset-storage.ts (no separate token-storage module)
08-02: Profile API ships-only detection filters __v from key count for backward compat
08-02: __v destructured from validated updates before passing to updateUser() to prevent $set conflict
09-01: Deleted /api/diagnostic and /api/force-fallback entirely (debug-only, no production use)
09-01: Fail-closed cron pattern returns 503 (not 401) when CRON_SECRET unset to distinguish misconfiguration from bad token
09-01: Fixed warm-images to use { db } from connectToDatabase() for consistency
09-01: Removed migrate-users npm script proactively (depends on @azure/cosmos removal in Plan 04)
09-02: Removed $regex fallback entirely -- Phase 8 migrated all records to have normalized fields
09-02: User type passwordHash changed to string | null to properly represent OAuth users
09-03: --mg-error: 255, 70, 70 matches existing --mg-danger value for design consistency
09-03: --mg-panel: 0, 20, 40 slightly lighter than --mg-panel-dark for visible panel background
09-03: StaleDocumentError 409 uses user-friendly message instead of error.message
09-03: Per-user errors in assign-synced-role logged server-side instead of returned in response
09-04: Removed 8 unused packages in single npm uninstall for atomic operation
09-04: Accepted 2 high-severity tar vulns as build-time only (bcrypt native addon, not runtime exploitable)
09-04: Accepted 4 moderate undici/discord.js vulns as requiring major version change (out of scope)
09-04: @types/bcrypt and @types/nodemailer moved to devDependencies (development-only tooling)
10-03: Atomic findOneAndUpdate with $inc/$setOnInsert for race-condition-safe rate limiting
10-03: Fail open on MongoDB errors -- rate limit check allows request with console.warn
10-03: Login rate limit throws Error (NextAuth authorize) vs standalone routes return 429 JSON
10-04: unsafe-inline for script-src/style-src required by Next.js hydration and Tailwind inline styles
10-04: API cache headers via next.config.js headers() instead of middleware to avoid matcher conflicts
10-01: Leadership = role in [Director, Manager, Board Member] OR clearance >= 3, matching original commented-out logic
10-01: Auth guard pattern: async function returns AuthResult | NextResponse, caller checks instanceof
10-01: canUserAccessTemplate clearance >= 2 sees all templates, lower clearance own-only
10-01: missions/route.ts return true left alone -- validates participant data structure, not RBAC
10-04: X-Frame-Options DENY kept alongside CSP frame-ancestors none for older browser fallback
10-02: Escort PUT allows creator/officer/leadership; DELETE restricts to creator/leadership only
10-02: Ship assignment self-assignment allowed, cross-user requires leadership clearance >= 3
10-02: Planned-missions canUserModifyMission/canUserDeleteMission verified -- no bypasses found
10-05: Dynamic import for file-type ESM package -- static import breaks Next.js build
10-05: Fail open on ownership DB errors -- upload still attributed to authenticated user
10-05: Store detected MIME type instead of client-declared for data integrity
10-05: serverExternalPackages needed for file-type ESM-only package in Next.js
11-01: crypto.randomUUID() for toast IDs instead of Math.random for collision safety
11-01: React.createElement in ConfirmDialogProvider to keep hook as .ts file
11-01: Toast provider outside ConfirmDialog provider so confirms can trigger toasts
11-02: Server is source of truth; localStorage is write-through cache only
11-02: One-time localStorage migration for preferredGameplayLoops on first server load
11-02: Optimistic state not reverted on save error -- localStorage cache preserves user intent
11-02: Field mapping layer: subsidiary<->division, handle<->aydoHandle between client/server
11-03: Confirmation in UserFleetBuilder (child) wrapping onRemoveShip prop, not in parent wrapper
11-03: ResetProfileComponent prompts confirmation before executing, redirects to profile on cancel
11-03: ResetProfileComponent also resets server-side profile via API PUT (not just localStorage)
12-01: Used `as const` assertions to fix motion v12 stricter transition type checking
12-01: Fixed AboutHero direction -> repeatType for motion v12 API change
12-01: No strict prop on LazyMotion -- codebase uses motion.div not m.div
12-02: DashboardPanelLayout staggerChildren + delayChildren combined into stagger(0.1, { startDelay: 0.1 })
13-01: Inputs retain :focus (not :focus-visible) -- form inputs should show focus on mouse click
13-01: UX-08 hierarchy page uses hardcoded sample data -- added DEMO DATA badge label
13-01: Build fails due to pre-existing Next.js manifest issue (not caused by Phase 13 changes)
13-03: useFocusTrap hook is single source of truth for modal Escape/focus -- all manual handlers removed
13-03: ref on outermost persistent div inside portal content (not animated wrappers that unmount)
13-04: Default pageSize changed to 25 (from 50), max to 100 (from 200) for consistency with ships API
13-04: Paginated functions added alongside non-paginated for backward compat (dashboard counts etc.)
13-04: passwordHash excluded from paginated user queries via MongoDB projection
13-02: Stable string IDs with component-scoped prefixes (login-, signup-, profile-, panel-, etc.) to avoid collisions
13-02: Dynamic form sections use {prefix}-{field}-{index} pattern for unique IDs
13-02: aria-labelledby with role=radiogroup/group for radio and checkbox groups
14-01: HTML attributes passed explicitly (not via spread) to avoid MotionProps conflicts on MobiGlasButton
14-01: ariaLabel prop name maps to aria-label on element for TypeScript compatibility
14-02: OperationCard has no mg-button usage (clickable div card) -- no changes needed
14-02: HolographicButton icon prop mapped to MobiGlasButton leftIcon prop
14-02: mg-button-secondary CSS in globals.css left in place (dead CSS cleanup out of scope)
14-06: MissionDetail has no form-level errors (read-only view) -- no changes needed
14-06: Escort submit uses variant=danger matching security page red theme
14-04: Confirm password input kept as custom element (not MobiGlasInput) to preserve dynamic border color for password match states
14-04: Discord OAuth button migrated to MobiGlasButton variant=secondary with leftIcon prop for Discord SVG
14-06: Success messages kept as plain styled div (MobiGlasFormError is error-only)
14-05: Added danger color option to CornerAccents component for delete button corner accents
14-05: MissionDetail and OperationCard status colors migrated to MobiGlas palette for consistency
14-03: HomeContent system status indicator (div with mg-button class) replaced with disabled MobiGlasButton
14-03: recruitment/page.tsx does not exist -- skipped without error

### Pending Todos

None yet.

### Blockers/Concerns

- [Tech Debt]: MissionParticipant.fleetyardsId optional -- tighten after confirming all records migrated
- [Security]: npm audit 2 high (build-time tar/bcrypt only), 4 moderate (discord.js/undici) -- remaining after Phase 9
- [RESOLVED]: RBAC hardcoded to return true -- fixed in Plan 10-01 with auth-guards.ts
- [RESOLVED]: Next.js RCE vulnerability CVE-2025-55182 -- patched by upgrade to 15.5.12 in Plan 09-04
- [Risk]: CSP nonces force dynamic rendering -- Phase 10 uses split strategy (hash for static, nonces for auth pages)
- [RESOLVED]: framer-motion migration affects 112 files -- completed in Plan 12-01 with motion@12.34.0
- [RESOLVED]: Profile localStorage migration -- server-first with one-time migration in Plan 11-02

- [Build]: npm run build fails with missing manifest JSON -- pre-existing Node.js v24.5.0 / Next.js compatibility issue

## Session Continuity

Last session: 2026-02-16
Stopped at: Completed 14-03-PLAN.md
Resume file: .planning/phases/14-design-system-consolidation/14-03-SUMMARY.md
