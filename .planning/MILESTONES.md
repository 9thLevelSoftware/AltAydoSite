# Project Milestones: Dynamic Ship Database

## v1.0 Dynamic Ship Database (Shipped: 2026-02-04)

**Delivered:** Replaced AydoCorp's static ship database with a dynamic system powered by the FleetYards.net API, providing always-current ship data with zero manual maintenance.

**Phases completed:** 1-7 (plus 5.1 insertion) — 26 plans total

**Key accomplishments:**

- Built complete FleetYards sync pipeline with Zod validation, cron scheduling, 80% count-drop safety threshold, and full audit trails
- Delivered 5 REST API endpoints with search, filtering, batch resolution, manufacturer queries, and intelligent caching
- Migrated 100% of ship references (116/116 matches) from name strings to FleetYards UUIDs across 5 database collections
- Unified type system around ShipDocument with document-based image resolution via FleetYards CDN (4 view angles, multiple resolutions)
- Created full ship browsing UI with multi-axis filtering, grid/list views, slide-out detail panel, image gallery, and org fleet composition dashboard
- Removed 6,279 lines of legacy code and 10 dead files; clean production build (69/69 pages, 0 errors)

**Stats:**

- 168 files created/modified
- +26,380 / -6,916 lines of TypeScript/React
- 8 phases, 26 plans, 116 commits
- 2 days from start to ship (2026-02-03 to 2026-02-04)

**Git range:** `f4e6a96` (docs: map existing codebase) → `a45e065` (docs(07): complete cleanup-decommission phase)

**Tech debt carried forward:**
- Human runtime testing recommended for sync execution, cron scheduling under real conditions
- MissionParticipant.fleetyardsId and OperationParticipant.fleetyardsId are optional (string?) — allows legacy records without UUIDs
- Planned mission idempotency partial (3/4 re-updated on second migration run)

**What's next:** To be determined — `/gsd:new-milestone`

---

## v1.1 Project Hardening & Polish (Shipped: 2026-02-16)

**Delivered:** Addressed 100+ findings from comprehensive project review — security vulnerabilities, UX pain points, performance bottlenecks, dependency debt, and UI inconsistencies. The site is now secure, polished, and performant.

**Phases completed:** 8-15 (8 phases) — 36 plans total

**Key accomplishments:**

- Unified MongoDB client with optimistic locking (`__v` field) for concurrent edit detection across all 7 storage modules
- Patched 15 security vulnerabilities: RBAC enforcement, MongoDB-backed rate limiting, CSP headers, magic byte image validation, fail-closed cron auth
- Migrated framer-motion to motion v12 across 112 files with LazyMotion bundle optimization (~30kb reduction)
- Built toast notification system and server-first profile persistence (localStorage as write-through cache only)
- Added accessibility foundations: focus-visible indicators, focus trapping in all modals, skip-to-content link, form labels on all inputs
- Consolidated MobiGlas design system: unified buttons (HolographicButton removed), CornerAccents component, 3-tier error display, loading states
- Migrated ~60 files to structured Logger with severity levels (zero console.log in production code)
- Performance optimizations: SSR home page, 30fps starfield cap, immutable cache headers, DB-level pagination

**Stats:**

- 8 phases, 36 plans, 51 requirements satisfied
- 12 days from start to ship (2026-02-04 to 2026-02-16)
- TypeScript: ~51,000 LOC

**Tech debt carried forward:**

- Bundle size reduction (~30kb) from LazyMotion needs human verification with `npm run analyze`
- MobiGlasPagination component created but not yet wired to frontend list pages
- UserProfilePanel.tsx line 169 uses legacy `.mg-button-small` CSS class
- npm audit: 2 high (build-time only tar/bcrypt), 4 moderate (discord.js/undici)

**What's next:** To be determined — `/gsd:new-milestone`

---

