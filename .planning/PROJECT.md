# AydoCorp Site

## What This Is

AydoCorp's organizational website built with Next.js, featuring a dynamic ship database powered by FleetYards.net API, fleet operations management, mission planning, Discord integration, and a MobiGlas-themed UI. The site serves Star Citizen org members with tools for fleet coordination, mission briefings, escort requests, and financial tracking.

## Core Value

AydoCorp members have a secure, polished, and performant hub for managing fleet operations, missions, and org coordination.

## Current Milestone: v1.1 Project Hardening & Polish

**Goal:** Address 100+ findings from comprehensive project review — security vulnerabilities, UX pain points, performance bottlenecks, dependency debt, and UI inconsistencies.

**Target features:**
- Security hardening (unauthenticated endpoints, RBAC, input sanitization, XSS prevention)
- Dependency remediation (Next.js 15.5.12+, framer-motion v12, remove 8 unused packages)
- UX improvements (profile server persistence, confirmations, accessibility, keyboard nav)
- Performance optimization (cache headers, SSR conversion, bundle reduction, DB pagination)
- UI consistency (MobiGlas design system consolidation, missing CSS variables, button/corner unification)

## Requirements

### Validated

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

### Active

<!-- v1.1 — Project Hardening & Polish -->
- [ ] Security hardening across all API routes and auth flows
- [ ] Dependency updates (Next.js, framer-motion) and unused package removal
- [ ] UX remediation (profile persistence, accessibility, confirmations)
- [ ] Performance optimization (caching, SSR, bundle size, DB queries)
- [ ] UI design system consolidation (MobiGlas component adoption, CSS fixes)

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

## Context

Shipped v1.0 (Dynamic Ship Database) with 19,464 net new lines across 168 files. Comprehensive project review (Feb 2026) identified 100+ findings:
- 6 critical security vulnerabilities (unauthenticated endpoints, ReDoS, XSS)
- 8 high-priority auth bypass / RBAC issues
- 29 npm audit vulnerabilities (1 critical Next.js RCE)
- 8 completely unused npm packages
- 3 critical UX issues (profile data loss, no undo, no delete confirmation)
- 18 performance bottlenecks (cache headers, SSR, bundle size)
- MobiGlas design system underutilized (3 button implementations, 4 corner accent patterns)
- `--mg-error` CSS variable undefined affecting error display in 13 files

**Tech stack:** Next.js 15.3.3 (upgrading to 15.5.12+), TypeScript, Azure Cosmos DB for MongoDB vCore, Tailwind CSS 3.4, framer-motion 10 (upgrading to 12), Recharts.

**Build status:** 69/69 pages, 0 TypeScript errors, 0 ESLint errors.

## Constraints

- **Tech stack**: Next.js 15 / TypeScript / MongoDB (Cosmos DB) — must use existing stack
- **API dependency**: FleetYards API has no SLA — sync must be resilient to downtime
- **Data shape**: FleetYards response structure is fixed — our types adapt to theirs, not vice versa
- **Image dependency**: FleetYards CDN uptime required for ship images — CSS empty state fallback when missing
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

| Address all project review findings in v1.1 | Review surfaced 100+ issues across security/UX/perf/UI; systematic remediation | — Pending |

---
*Last updated: 2026-02-15 after v1.1 milestone start*
