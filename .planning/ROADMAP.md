# Roadmap: AydoCorp Site

## Milestones

- **v1.0 Dynamic Ship Database** - Phases 1-7 (shipped 2026-02-04)
- **v1.1 Project Hardening & Polish** - Phases 8-15 (in progress)

## Phases

<details>
<summary>v1.0 Dynamic Ship Database (Phases 1-7) - SHIPPED 2026-02-04</summary>

See `.planning/MILESTONES.md` for v1.0 details. 26 plans across 8 phases (including 5.1 insertion).

</details>

### v1.1 Project Hardening & Polish

**Milestone Goal:** Address 100+ findings from comprehensive project review -- security vulnerabilities, UX pain points, performance bottlenecks, dependency debt, and UI inconsistencies. Deliver a secure, polished, performant production site.

**Phase Numbering:** Integer phases (8, 9, 10): Planned milestone work. Decimal phases (9.1, 9.2): Urgent insertions if needed.

- [x] **Phase 8: MongoDB Consolidation** - Merge dual connection modules into single client with unified pool (completed 2026-02-15)
- [x] **Phase 9: Emergency Security & Dependency Cleanup** - Patch critical vulnerabilities, upgrade Next.js, remove unused packages, define missing CSS variable (completed 2026-02-15)
- [x] **Phase 10: Access Control Hardening** - RBAC enforcement, rate limiting, CSP headers, ownership checks, image validation (completed 2026-02-15)
- [x] **Phase 11: UX Critical Fixes** - Profile server migration, toast notifications, confirmation dialogs (completed 2026-02-16)
- [ ] **Phase 12: Motion v12 Migration** - Atomic framer-motion to motion package migration across 109 files with LazyMotion
- [ ] **Phase 13: Accessibility & Performance Foundations** - Form labels, keyboard nav, focus indicators, cache headers, DB pagination
- [ ] **Phase 14: Design System Consolidation** - Button unification, corner accents, auth form migration, error tiers, loading states
- [ ] **Phase 15: Code Quality & Optimization** - Structured logging, state machine, optimistic locking, SSR conversion, bundle cleanup

## Phase Details

### Phase 8: MongoDB Consolidation
**Goal**: The application uses a single, reliable MongoDB connection pool instead of two competing clients
**Depends on**: Nothing (first phase of v1.1; v1.0 Phase 7 complete)
**Requirements**: INFRA-01, QUAL-04
**Success Criteria** (what must be TRUE):
  1. Only one MongoDB client module exists; all storage modules import from the same source
  2. Application starts with a single connection pool (50 connections max, not 200)
  3. All existing database operations (users, missions, ships, escorts, finance) work identically after consolidation
  4. Race condition in updateUser() is eliminated -- concurrent profile saves do not silently overwrite each other
**Plans**: 2 plans in 2 waves

Plans:
- [ ] 08-01-PLAN.md -- Refactor mongodb.ts canonical client + migrate user CRUD with optimistic locking
- [ ] 08-02-PLAN.md -- Migrate remaining storage modules, wire profile API, delete mongodb-client.ts

### Phase 9: Emergency Security & Dependency Cleanup
**Goal**: Critical security vulnerabilities are patched, the RCE-vulnerable Next.js version is upgraded, unused packages are removed, and error messages become visible
**Depends on**: Phase 8 (consolidated DB client simplifies security fixes)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-14, SEC-15, INFRA-02, INFRA-03, INFRA-04, DS-01
**Success Criteria** (what must be TRUE):
  1. Unauthenticated requests to /api/diagnostic, /api/force-fallback, and /api/storage-status are rejected with 401
  2. Cron endpoints reject requests without valid CRON_SECRET (fail closed)
  3. Error messages styled with --mg-error are visible (red text renders correctly across all 13 files)
  4. npm audit shows zero critical vulnerabilities; Next.js version is 15.5.12+
  5. Malicious input in email/handle fields, email templates, auth redirects, and API error responses cannot trigger ReDoS, XSS, or information leakage
**Plans**: 4 plans in 2 waves

Plans:
- [ ] 09-01-PLAN.md -- Endpoint security hardening: delete debug endpoints, fail-closed cron auth, fix finance DB
- [ ] 09-02-PLAN.md -- Input sanitization & auth safety: eliminate regex lookups, escape email templates, validate callbacks, fix OAuth hash
- [ ] 09-03-PLAN.md -- Error sanitization & CSS variables: sanitize error.message from 38 API routes, define --mg-error and --mg-panel
- [ ] 09-04-PLAN.md -- Dependency cleanup & Next.js upgrade: remove 8 unused packages, move @types/*, upgrade to 15.5.12

### Phase 10: Access Control Hardening
**Goal**: Every protected route enforces authorization, rate limiting prevents brute force, and security headers defend against injection
**Depends on**: Phase 8 (rate limiter needs consolidated DB), Phase 9 (emergency holes plugged first)
**Requirements**: SEC-08, SEC-09, SEC-10, SEC-11, SEC-12, SEC-13
**Success Criteria** (what must be TRUE):
  1. Users without sufficient clearance level are rejected from protected routes (RBAC enforced, not hardcoded true)
  2. Users can only edit/delete their own missions, escort requests, and ship assignments (ownership checks in place)
  3. Repeated failed login attempts from the same IP are throttled after a configurable threshold
  4. Browser developer tools show Content-Security-Policy and security headers on all responses
  5. Image uploads are validated server-side with magic byte checking (renaming a .exe to .jpg is rejected)
**Plans**: 5 plans in 2 waves

Plans:
- [ ] 10-01-PLAN.md -- Create auth-guards.ts and restore RBAC enforcement across fleet-ops and mission-template routes (SEC-08)
- [ ] 10-02-PLAN.md -- Add ownership checks to escort requests and ship assignment (SEC-09)
- [ ] 10-03-PLAN.md -- MongoDB-backed rate limiter on auth endpoints with TTL auto-cleanup (SEC-10)
- [ ] 10-04-PLAN.md -- Content-Security-Policy and security headers on all responses (SEC-11, SEC-12)
- [ ] 10-05-PLAN.md -- Server-side image upload validation with magic byte checking (SEC-09, SEC-13)

### Phase 11: UX Critical Fixes
**Goal**: User profile data persists on the server, feedback uses themed notifications instead of browser alerts, and destructive actions require confirmation
**Depends on**: Phase 8 (profile migration needs consolidated DB), Phase 10 (RBAC protects profile endpoints)
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. User's fleet, preferences, and timezone persist after clearing browser data or logging in from a different device
  2. All feedback (success, error, info) appears as themed MobiGlas toast notifications -- zero alert() or confirm() calls remain
  3. Removing a ship from fleet, deleting a mission, or resetting profile triggers a confirmation dialog before executing
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 11-01-PLAN.md — Toast notification system + confirmation dialog components (Wave 1)
- [ ] 11-02-PLAN.md — Profile server-side migration with localStorage fallback (Wave 2)
- [ ] 11-03-PLAN.md — Replace alert/confirm calls + add destructive action guards (Wave 2)

### Phase 12: Motion v12 Migration
**Goal**: The framer-motion package is replaced with motion v12 across all 109 files in a single atomic migration, with LazyMotion reducing bundle size
**Depends on**: Phase 9 (Next.js upgraded first to avoid compounding dependency changes)
**Requirements**: INFRA-05, PERF-03
**Success Criteria** (what must be TRUE):
  1. package.json lists "motion" (not "framer-motion"); no dual-package bundle bloat
  2. All 109 files import from "motion/react" instead of "framer-motion"
  3. LazyMotion provider with domMax features wraps the application; bundle size reduced by ~30kb
  4. All animations work correctly -- AnimatePresence transitions, layoutId animations, and hover/tap interactions behave identically to before
**Plans**: 2 plans in 2 waves

Plans:
- [ ] 12-01-PLAN.md -- Package swap (framer-motion -> motion), bulk import replacement (112 files), LazyMotion provider
- [ ] 12-02-PLAN.md -- Migrate staggerChildren to stagger() in 5 files, full production build validation

### Phase 13: Accessibility & Performance Foundations
**Goal**: Forms are screen-reader accessible, modals trap focus and respond to keyboard, performance bottlenecks in caching and pagination are eliminated
**Depends on**: Phase 8 (DB pagination needs consolidated client)
**Requirements**: UX-04, UX-05, UX-06, UX-08, UX-09, UX-10, PERF-01, PERF-02, PERF-07
**Success Criteria** (what must be TRUE):
  1. Every form input has an associated label (htmlFor/id pairing) -- screen readers announce field purpose
  2. Modals trap focus when open, close on Escape key, and return focus to trigger element on close
  3. Keyboard-focused elements show a visible cyan glow indicator; mouse clicks do not trigger focus outlines
  4. Mission and user lists paginate at the database level (MongoDB skip/limit) -- pages with 100+ items load in under 2 seconds
  5. Static assets under /_next/static return Cache-Control: immutable with max-age=31536000 (1 year)
**Plans**: TBD

Plans:
- [ ] 13-01: TBD
- [ ] 13-02: TBD
- [ ] 13-03: TBD

### Phase 14: Design System Consolidation
**Goal**: MobiGlas design system is the single source of truth for buttons, corners, auth forms, error display, and loading states
**Depends on**: Phase 12 (motion migration complete -- don't refactor components while migrating imports)
**Requirements**: DS-02, DS-03, DS-04, DS-05, DS-06, DS-07, DS-08, UX-07
**Success Criteria** (what must be TRUE):
  1. Only MobiGlasButton exists for buttons (HolographicButton and raw .mg-button CSS usage replaced); variants cover all use cases
  2. Corner accents use a single CornerAccents component everywhere (4+ competing patterns eliminated)
  3. LoginForm and SignupForm use MobiGlas design system components and match the site's visual language
  4. Error messages display consistently in 3 tiers: field-level inline, form-level banner, system-level toast notification
  5. High-frequency async actions (mission create, profile save, escort submit) show loading spinners in their trigger buttons
**Plans**: TBD

Plans:
- [ ] 14-01: TBD
- [ ] 14-02: TBD
- [ ] 14-03: TBD

### Phase 15: Code Quality & Optimization
**Goal**: Production-grade logging, state validation, conflict detection, and remaining performance optimizations for a maintainable codebase
**Depends on**: Phase 10 (logging benefits from security context), Phase 12 (SSR conversion after motion migration)
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-05, PERF-04, PERF-05, PERF-06, PERF-08
**Success Criteria** (what must be TRUE):
  1. All server-side logging uses structured Logger with severity levels -- zero console.log/warn/error calls remain in production code
  2. Invalid mission status transitions (e.g., "completed" back to "planning") are rejected by the API with a clear error message
  3. When two users edit the same resource concurrently, the second save detects the conflict and warns the user instead of silently overwriting
  4. Home page renders as a Server Component (no "use client" at page level); dashboard authentication check has no artificial delay
  5. Each page has a unique metadata title visible in browser tabs for multi-tab distinction
**Plans**: TBD

Plans:
- [ ] 15-01: TBD
- [ ] 15-02: TBD
- [ ] 15-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15

**Dependency Graph:**
- Phase 8: No dependencies (infrastructure foundation)
- Phase 9: Phase 8
- Phase 10: Phases 8, 9
- Phase 11: Phases 8, 10
- Phase 12: Phase 9
- Phase 13: Phase 8 (can run in parallel with Phase 12)
- Phase 14: Phase 12
- Phase 15: Phases 10, 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. MongoDB Consolidation | v1.1 | 2/2 | Complete | 2026-02-15 |
| 9. Emergency Security & Deps | v1.1 | 4/4 | Complete | 2026-02-15 |
| 10. Access Control Hardening | v1.1 | Complete    | 2026-02-15 | - |
| 11. UX Critical Fixes | v1.1 | Complete    | 2026-02-16 | - |
| 12. Motion v12 Migration | v1.1 | 0/2 | Planned | - |
| 13. Accessibility & Performance | v1.1 | 0/TBD | Not started | - |
| 14. Design System Consolidation | v1.1 | 0/TBD | Not started | - |
| 15. Code Quality & Optimization | v1.1 | 0/TBD | Not started | - |
