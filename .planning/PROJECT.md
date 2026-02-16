# AydoCorp Site

## What This Is

AydoCorp's organizational website built with Next.js 15.5.12, featuring a dynamic ship database powered by FleetYards.net API, fleet operations management, mission planning, Discord integration, and a MobiGlas-themed UI. The site serves Star Citizen org members with secure, polished tools for fleet coordination, mission briefings, escort requests, and financial tracking.

## Core Value

AydoCorp members have a secure, polished, and performant hub for managing fleet operations, missions, and org coordination.

## Requirements

### Validated

**v1.0 Dynamic Ship Database:**
- ✓ Static ship database with 500+ ships — existing
- ✓ Ship images served via CDN (images.aydocorp.space) — existing
- ✓ Ship selection in user fleet builder — existing
- ✓ Ship selection in mission planner — existing
- ✓ Ship data in resource management — existing
- ✓ Manufacturer-grouped ship browsing — existing
- ✓ Ship type/size/role filtering — existing
- ✓ Hybrid storage system (MongoDB + JSON fallback) — existing
- ✓ Periodic sync from FleetYards API into Cosmos DB/MongoDB — v1.0
- ✓ Ship data stored with FleetYards UUIDs as canonical identifiers — v1.0
- ✓ Ship images sourced from FleetYards CDN (multiple sizes/views) — v1.0
- ✓ Cron/scheduled job triggers sync automatically — v1.0
- ✓ Stale data used gracefully when FleetYards API is unavailable — v1.0
- ✓ Migration script converts existing ship name references to FleetYards UUIDs — v1.0
- ✓ All user profile ship references use FleetYards UUIDs — v1.0
- ✓ All mission/operation ship references use FleetYards UUIDs — v1.0
- ✓ Ship data API serves from database instead of static JSON — v1.0
- ✓ Fleet builder UI refreshed with better images and search/filters — v1.0
- ✓ Mission planner ship picker refreshed with improved UX — v1.0
- ✓ Old static ships.json and R2 image pipeline decommissioned — v1.0

**v1.1 Project Hardening & Polish:**
- ✓ INFRA-01: MongoDB consolidation (single client, unified pool) — v1.1
- ✓ INFRA-02: Removed 8 unused npm packages — v1.1
- ✓ INFRA-03: @types/* packages moved to devDependencies — v1.1
- ✓ INFRA-04: Next.js upgraded to 15.5.12 — v1.1
- ✓ INFRA-05: Motion v12 migration across 112 files — v1.1
- ✓ SEC-01 through SEC-15: All 15 security requirements satisfied — v1.1
- ✓ UX-01 through UX-10: All 10 UX requirements satisfied — v1.1
- ✓ PERF-01 through PERF-08: All 8 performance requirements satisfied — v1.1
- ✓ DS-01 through DS-08: All 8 design system requirements satisfied — v1.1
- ✓ QUAL-01 through QUAL-05: All 5 code quality requirements satisfied — v1.1

### Active

(No active requirements — define with `/gsd:new-milestone`)

### Out of Scope

- In-game pricing / aUEC shop data — adds complexity, not needed for fleet management
- Pledge/real-money pricing — not relevant to org operations
- Ship loaner information — not needed for mission planning
- Mirroring images to R2 — using FleetYards CDN directly, simpler
- Manual admin sync button — cron handles it, can add later if needed
- 3D ship models / holo viewer — conflicts with MobiGlas 2D aesthetic
- Ship comparison tools — deferred to v2 requirements (CMP-01, CMP-02)
- Smart ship suggestions / fleet gap analysis — deferred to v2 (SMART-01, SMART-02, SMART-03)
- Loaner ship awareness / purchase locations — deferred to v2 (EXT-01, EXT-02, EXT-03)
- Full test suite — high effort, separate testing milestone
- NextAuth to Auth.js v5 — different cookies, logs everyone out, separate migration
- Monolithic component refactoring — MissionPlanner, HomeContent are large but functional
- WCAG AAA compliance — MobiGlas dark theme may not meet AAA contrast, target AA
- Redis infrastructure — MongoDB-backed rate limiting sufficient for current scale

## Context

**Current state:** v1.1 shipped with 51 requirements satisfied across 8 phases. The codebase is now:
- **Secure**: 15 security vulnerabilities patched, RBAC enforced, rate limiting active, CSP headers, magic byte validation
- **Accessible**: Form labels, focus trapping, keyboard navigation, skip-to-content link
- **Performant**: SSR home page, 30fps animation cap, DB pagination, immutable cache headers
- **Consistent**: MobiGlas design system unified, 3-tier error display, loading states
- **Maintainable**: Structured logging, state machines, optimistic locking

**Tech stack:** Next.js 15.5.12, TypeScript, Azure Cosmos DB for MongoDB vCore, Tailwind CSS 3.4, motion 12.34.0, Recharts.

**Build status:** 69/69 pages, 0 TypeScript errors, 0 ESLint errors.

**Known tech debt:**
- npm audit: 2 high (build-time only tar/bcrypt), 4 moderate (discord.js/undici)
- MobiGlasPagination component created but not wired to frontend
- UserProfilePanel.tsx line 169 uses legacy `.mg-button-small` CSS
- Bundle size reduction from LazyMotion needs human verification

## Constraints

- **Tech stack**: Next.js 15 / TypeScript / MongoDB (Cosmos DB) — must use existing stack
- **API dependency**: FleetYards API has no SLA — sync must be resilient to downtime
- **Data shape**: FleetYards response structure is fixed — our types adapt to theirs
- **Image dependency**: FleetYards CDN uptime required for ship images — CSS empty state fallback
- **Migration**: All existing ship references migrated — 116/116 at 100% match rate

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use FleetYards API as golden source | Eliminates manual ship list maintenance, always current | ✓ Good — 500+ ships synced, zero maintenance |
| FleetYards UUID as canonical ship identifier | Resilient to ship name changes, proper foreign key | ✓ Good — clean references across all collections |
| Periodic sync to database (not live API calls) | Fast page loads, resilience to API downtime | ✓ Good — 5-min cache, stale data preserved on API failure |
| FleetYards CDN images directly (no R2 mirror) | Simpler architecture, no image sync pipeline | ✓ Good — 4 view angles, multiple resolutions, zero maintenance |
| Big-bang migration for existing references | Clean cutover, no dual-format complexity | ✓ Good — 116/116 names matched (100%), idempotent |
| Cron job for sync (no manual trigger) | Automated, one less admin feature to build | ✓ Good — instrumentation.ts + overdue-check on startup |
| Zod .passthrough() for schema validation | Forward compatibility with FleetYards API changes | ✓ Good — API format change absorbed without breakage |
| 80% count-drop threshold for sync safety | Prevents data loss from partial API responses | ✓ Good — safety net in place |
| CSS-only empty states (no placeholder images) | Eliminates placeholder PNG dependency, cleaner fallback | ✓ Good — works consistently across all ship display contexts |
| useReducer for ship browse state | Centralized filter state, avoids stale closures | ✓ Good — clean state management in ShipBrowsePage |
| Address all project review findings in v1.1 | Review surfaced 100+ issues across security/UX/perf/UI | ✓ Good — 51/51 requirements satisfied, site hardened |
| Optimistic locking with `__v` field | Detect concurrent edit conflicts without pessimistic locks | ✓ Good — StaleDocumentError propagated to API routes |
| MongoDB-backed rate limiting | No Redis infrastructure needed at current scale | ✓ Good — atomic $inc operations with TTL cleanup |
| Server-first profile with localStorage cache | Prevents data loss on browser clear, cross-device sync | ✓ Good — one-time migration, write-through cache |
| Motion v12 with LazyMotion | Modern animation library, bundle size reduction | ✓ Good — domMax provider, ~30kb savings expected |
| Structured Logger over console.* | Production-grade logging with severity, filtering | ✓ Good — zero console.log in production code |

---
*Last updated: 2026-02-16 after v1.1 milestone*
