# Project Research Summary

**Project:** AydoCorp Website - v1.1 Hardening & Polish Milestone
**Domain:** Production remediation — security hardening, Next.js 15.5 upgrade, dependency cleanup, UX fixes, design system consolidation
**Researched:** 2026-02-15
**Confidence:** HIGH

## Executive Summary

This milestone addresses 100+ findings from a comprehensive project audit across security, UX, performance, dependencies, and UI consistency. The AydoCorp website shipped a successful v1.0 (dynamic ship database), but the audit uncovered critical vulnerabilities (unauthenticated admin endpoints exposing user data, a CVSS 10.0 RCE in Next.js 15.3.3, dual MongoDB connection pools exhausting resources), severe UX issues (localStorage-only profile data causing data loss, `alert()` for feedback, missing form labels), and a fragmented design system with 530+ inline style references and 4 competing button implementations.

The recommended approach is **sequential dependency-driven remediation**: fix the dual MongoDB connection pool problem first (prerequisite for rate limiting storage), then apply emergency security patches (auth-gate exposed routes, upgrade Next.js to 15.5.12 to patch CVE-2025-66478 RCE), then harden access control (RBAC enforcement, rate limiting, CSP headers), then fix UX data loss risks (move profile to server, replace `alert()` with notifications), then optimize performance (motion v12 migration with LazyMotion, cache headers, SSR), and finally consolidate the design system (109 files using framer-motion must migrate atomically to avoid bundle bloat).

The key risk is **dependency ordering violations**. The dual MongoDB client modules must be consolidated before adding rate limiting (which adds a third DB consumer). The framer-motion package rename affects 109 files and must be done atomically in a single commit. CSP nonces force pages to dynamic rendering, requiring a split strategy (hash-based for static pages, nonces only for authenticated routes). Attempting to parallelize security fixes with design system work or Server Component conversion creates integration conflicts. The safe path is linear: infrastructure fixes → security → UX → performance → polish.

## Key Findings

### Recommended Stack

**Core decision:** Upgrade Next.js from 15.3.3 to **15.5.12** (NOT 16.x). This patches a CVSS 10.0 critical RCE (CVE-2025-66478) with active exploitation in the wild, while avoiding the massive React 19 migration and middleware-to-proxy rename that Next.js 16 requires. Next.js 15.x is supported through October 2026, giving 8 months of runway.

**Core technologies:**
- **Next.js 15.5.12** — patches critical RCE, SSRF, and DoS vulnerabilities; minimal breaking changes from 15.3.3; `next lint` deprecation handled via codemod
- **motion 12.34.0** (replaces framer-motion 10.x) — package rename from `framer-motion` to `motion`; import path changes to `motion/react`; 109 files affected; LazyMotion with `domMax` features reduces bundle by 30kb
- **@nosecone/next 1.1.0** — Next.js-specific security headers with nonce-based CSP; from Arcjet team; middleware integration
- **@arcjet/next 1.0.0-beta.15** (optional) — rate limiting + bot detection + WAF; alternative: MongoDB-backed custom rate limiter for single-instance deployment
- **Zod 3.24.4** (existing, expand coverage) — input validation for all API routes; 14 routes currently use it, audit remaining 31+ routes
- **Remove 8 unused packages** — `@azure/cosmos`, `@azure/identity`, `@azure/msal-node`, `azure-ad-verify-token`, `mammoth`, `openid-client`, `bcrypt`, `@types/bcrypt` — eliminates ~25 of 29 npm vulnerabilities

**Critical version constraints:**
- Do NOT upgrade to Next.js 16 (requires React 19, breaks next-auth v4, middleware-to-proxy rename, Turbopack default breaks custom webpack config)
- Do NOT upgrade to next-auth v5 (different cookies, logs everyone out, separate migration)
- Use `domMax` for LazyMotion (NOT `domAnimation`) — codebase uses `layoutId` animations which require layout features

### Expected Features

This is a remediation milestone, not new features. The "features" are fixes categorized by severity.

**Must have (table stakes):**
- **S1 — Auth-gate sensitive API routes** — `/api/diagnostic`, `/api/force-fallback`, `/api/storage-status` are fully unauthenticated; diagnostic exposes user emails and file paths
- **S2 — Define `--mg-error` CSS variable** — referenced in 40+ files but never declared; error messages are invisible
- **S3 — Re-enable RBAC/clearance enforcement** — clearance levels 1-5 exist but are not enforced; only mission creation checks clearance
- **S6 — Secure cron endpoints** — ship-sync and discord-sync have OPTIONAL auth (fail open, not fail closed)
- **S7 — Remove second force-fallback route** — `/api/force-fallback` GET route is unauthenticated and dumps all user data
- **U1 — Migrate profile from localStorage to server** — ALL profile data (ships, preferences, timezone) is in browser localStorage; clearing browser data loses everything
- **U2 — Replace `alert()` with notifications** — 8 alert() calls in MissionPlanner break immersion and block UI
- **DB Consolidation — Merge dual MongoDB clients** — `mongodb.ts` and `mongodb-client.ts` both create 100-connection pools; app uses 200 connections to same database

**Should have (competitive):**
- **S8-S12 — Security hardening** — rate limiting on auth endpoints, CSP headers, server-side image validation, security headers on API routes
- **U3-U7 — UX improvements** — confirmation dialogs, form labels, keyboard navigation, visible focus indicators, loading states
- **P1-P2 — Performance quick wins** — DB-level pagination (not client-side), immutable cache headers for `/_next/static` (currently 1 hour, should be 1 year)
- **D1-D2 — Design system consolidation** — unify 4 button implementations into MobiGlasButton, consolidate corner accent patterns

**Defer (v2+):**
- Full test suite (separate testing milestone)
- Next.js 16 + React 19 migration (after v1.1 stabilizes)
- NextAuth v4 → Auth.js v5 (after security stabilizes)
- Component decomposition (MissionPlanner 1211 lines, HomeContent 921 lines — separate refactoring milestone)
- WCAG AAA compliance (target AA for now)
- Redis infrastructure (MongoDB-backed rate limiting sufficient for current scale)

### Architecture Approach

The remediation follows a **dependency-driven phase sequence** dictated by infrastructure constraints. The dual MongoDB connection pool issue is the prerequisite for all database-backed features (rate limiting, session storage, profile migration). Security hardening must happen before UX work because auth-gating routes changes what data is accessible. The framer-motion package rename must be atomic (109 files in one commit) and must happen before design system consolidation (which refactors the components using motion). CSP nonces force dynamic rendering, requiring a split strategy to preserve static optimization for public pages.

**Major components:**
1. **Unified MongoDB connector** — merge `mongodb.ts` and `mongodb-client.ts` into single client with shared pool; reduce `maxPoolSize` from 100 to 50; eliminates connection exhaustion risk
2. **Security middleware** — extend `src/middleware.ts` to generate CSP nonces, apply rate limiting (MongoDB-backed), expand auth coverage; split CSP strategy: hash-based for static pages, nonces for authenticated routes only
3. **Input validation layer** — expand Zod coverage to all 45+ API routes; fix NoSQL injection in `getUserByEmail` (uses unescaped regex); sanitize error messages to not leak MongoDB details
4. **Rate limiter (MongoDB-backed)** — replace in-memory `Map` with MongoDB collection + TTL index; survives restarts, works across instances; alternative to Arcjet for single-instance deployment
5. **LazyMotion provider** — wrap app in `<LazyMotion features={domMax} strict>` and migrate 109 files from `motion` to `m` components; reduces bundle by ~30kb
6. **Canonical MobiGlas components** — consolidate 4 button implementations (.mg-button CSS, MobiGlasButton, HolographicButton, .mg-button-small) into single MobiGlasButton with variants; consolidate 4+ corner accent patterns into CornerAccents component; affects 530+ inline style references

### Critical Pitfalls

1. **CVE-2025-29927 — Middleware authorization bypass** — Next.js versions before 15.2.3 allowed attackers to bypass middleware by injecting `x-middleware-subrequest` header; current 15.3.3 should be patched, but verify after upgrade; never rely solely on middleware auth; add `getServerSession()` checks in every API route
2. **CSP nonces force all pages to dynamic rendering** — nonce-based CSP eliminates SSG and CDN caching; split strategy required: hash-based CSP for static pages, nonces only for `/dashboard/*`, `/admin/*`, `/userprofile/*`; otherwise TTFB increases 200-500ms across entire site
3. **framer-motion to motion package rename breaks 109 files** — must be done atomically in single commit; cannot install both packages simultaneously (bundle duplication); import path changes from `'framer-motion'` to `'motion/react'`; `MotionProps` type import also changes
4. **Removing `'use client'` from hook-using components** — 109 files use framer-motion (requires client), 50+ use session hooks; attempting to convert to Server Components breaks builds; realistic opportunity is data-fetching wrappers, not eliminating client components
5. **In-memory rate limiter fails in production** — current `Map`-based rate limiter resets on deployment, has no cleanup, works only on single instance; must move to MongoDB or Redis before production traffic
6. **Dual MongoDB clients create pool exhaustion** — `mongodb.ts` and `mongodb-client.ts` both create 100-connection pools; consolidate before adding new DB consumers (rate limiting, profile storage)

## Implications for Roadmap

Based on research, the milestone must be executed in strict dependency order. Parallelization opportunities exist within phases but NOT across them.

### Phase 8: MongoDB Connection Consolidation (v1.0 ended at phase 7)
**Rationale:** Prerequisite for all DB-backed features. The dual client modules create 200-connection pools to the same database. Adding rate limiting (another DB consumer) worsens the problem. Must fix infrastructure before adding consumers.
**Delivers:** Single MongoDB client with unified pool (50 connections), consistent error handling, health check with reconnect logic
**Addresses:** Pitfall 6 (dual client exhaustion), prerequisite for S8 (rate limiting), prerequisite for U1 (profile server-side migration)
**Complexity:** Medium — touches 8 storage modules; must update imports and test each module
**Research needed:** None — pattern is well-documented Next.js/MongoDB practice

### Phase 9: Emergency Security Fixes
**Rationale:** Critical vulnerabilities exist NOW. Auth bypass routes, RCE-vulnerable Next.js version, missing CSS variable breaking error visibility. Must ship immediately.
**Delivers:** Auth-gated diagnostic/force-fallback routes, Next.js 15.5.12 upgrade, `--mg-error` CSS variable defined, cron endpoint hardening
**Addresses:** S1, S2, S6, S7 (critical security), CVE-2025-66478 RCE patch, Pitfall 1 (middleware bypass)
**Avoids:** Pitfall 2 (CSP nonces) — deferred to Phase 10; Pitfall 3 (framer-motion) — separate phase
**Complexity:** Low — each fix is <10 lines; Next.js upgrade is patch bump with codemod
**Research needed:** None — audit findings are explicit

### Phase 10: Access Control Hardening
**Rationale:** With emergency holes plugged, harden the access control model. Rate limiting requires consolidated DB (Phase 8 complete). CSP requires split strategy to preserve static optimization.
**Delivers:** MongoDB-backed rate limiter, RBAC enforcement (clearance levels 1-5), CSP headers (split: hash-based for static, nonces for auth pages), Zod validation on all API routes
**Addresses:** S3, S8, S9, S10, S12, Pitfall 2 (CSP nonce dynamic rendering), Pitfall 5 (in-memory rate limiter)
**Uses:** Unified MongoDB client from Phase 8, @nosecone/next for CSP headers
**Complexity:** Medium-High — rate limiter requires TTL collection, CSP strategy requires middleware routing logic, RBAC mapping
**Research needed:** None — patterns are standard

### Phase 11: UX Critical Fixes
**Rationale:** Fix data loss risks and worst UX violations. Profile migration requires auth (Phase 10 RBAC enforced). Notification system replaces `alert()` and enables confirmation dialogs.
**Delivers:** Profile API endpoints (GET/PUT), localStorage→server migration, toast notification system (generalizes ErrorNotification), confirmation dialogs for destructive actions
**Addresses:** U1, U2, U3 (critical UX)
**Complexity:** High — U1 (profile migration) is complex: new API endpoints, data migration script, localStorage sync logic
**Research needed:** None — notification patterns exist in ErrorNotification component

### Phase 12: Dependency Upgrades (framer-motion Migration)
**Rationale:** The framer-motion package rename affects 109 files and must be atomic. LazyMotion reduces bundle but requires motion (not framer-motion). Must happen before design system consolidation (Phase 14) to avoid refactoring components twice.
**Delivers:** `motion@12.34.0` installed, all 109 files migrated to `import from 'motion/react'`, LazyMotion provider with `domMax` features, ~30kb bundle reduction
**Addresses:** P4 (bundle size), Pitfall 3 (atomic migration), Pitfall 10 (AnimatePresence behavioral changes)
**Complexity:** Medium — mechanical find-and-replace across 109 files, but must be tested (AnimatePresence with `mode="wait"` and `layoutId` are susceptible to bugs)
**Research needed:** None — Motion upgrade guide is explicit

### Phase 13: Accessibility & Performance Foundations
**Rationale:** Independent of Phases 8-12; can run in parallel with Phase 12 if resourced separately. Accessibility fixes improve quality for all users. Performance fixes (pagination, cache headers) are low-effort high-impact.
**Delivers:** Form labels (55 files audited), keyboard navigation (Headless UI Dialog for modals), focus indicators (global CSS), DB pagination for missions/users, immutable cache headers for `/_next/static`
**Addresses:** U4, U5, U6 (accessibility), P1, P2 (performance)
**Complexity:** Medium — form label audit is tedious but mechanical; Headless UI migration is per-modal
**Research needed:** None — WCAG 2.1 AA requirements are standard

### Phase 14: Design System Consolidation
**Rationale:** Depends on Phase 12 (framer-motion migration) because buttons and components use motion heavily. Consolidating 530+ inline style references is page-by-page visual work, not find-and-replace.
**Delivers:** MobiGlasButton canonical (4 variants consolidated), CornerAccents canonical (4+ patterns consolidated), CSS class deduplication (globals.css cleanup), error display unification
**Addresses:** D1, D2, D4, D5 (UI consistency), U7 (loading states via MobiGlasButton.isLoading)
**Avoids:** Pitfall 9 (visual inconsistency during migration) — build new components first, migrate page-by-page
**Complexity:** Medium-High — 530+ inline references, visual regression risk
**Research needed:** None — patterns exist in ui/mobiglas/ components

### Phase 15: Code Quality & Optimization (Stretch)
**Rationale:** Professional polish. Not blocking production but improves maintainability. Can be partially deferred if timeline pressure exists.
**Delivers:** Structured logging (replace console.*), mission state machine validation, optimistic locking (version-based conflict detection), SSR for home page, remaining bundle cleanup
**Addresses:** Q1, Q2, Q3 (code quality), P3, P5 (performance stretch)
**Complexity:** Medium — logging sweep is large (50+ files) but mechanical; SSR conversion is only 1 page (home)
**Research needed:** None — standard patterns

### Phase Ordering Rationale

- **Phase 8 is the prerequisite** — dual MongoDB clients must be consolidated before adding rate limiting (Phase 10), profile migration (Phase 11), or any other DB consumer
- **Security is sequential** — emergency fixes (Phase 9) → access control hardening (Phase 10) → data migration (Phase 11); cannot parallelize because each layer depends on the previous
- **framer-motion migration is atomic** — Phase 12 must be a single commit across 109 files; do NOT attempt incrementally
- **Design system depends on motion** — Phase 14 must follow Phase 12 because MobiGlasButton, CornerAccents, and other components use framer-motion extensively; migrating imports before consolidating components avoids double work
- **Accessibility/performance (Phase 13) is independent** — can run in parallel with Phase 12 or Phase 14 if resourced separately

**Parallelization opportunities:**
- Phase 8 standalone
- Phases 9-11 are sequential (security dependency chain)
- Phase 12 standalone (but blocks Phase 14)
- Phase 13 independent (can run alongside Phase 12)
- Phase 14 depends on Phase 12 only
- Phase 15 independent (can start anytime after Phase 10)

**No parallelization:**
- Do NOT run security (9-11) in parallel with design system (14) — creates merge conflicts and integration risk
- Do NOT run framer-motion migration (12) in parallel with design system (14) — migrating imports while refactoring components causes wasted work

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 10:** CSP nonce strategy for Next.js hydration scripts — test that `__next_f.push()` inline scripts work with nonces; known issue GitHub #80997
- **Phase 11:** Profile localStorage→server migration — design migration script, handle conflicts between localStorage and server data
- **Phase 12:** AnimatePresence behavioral changes in motion v12 — test all 20+ AnimatePresence instances with rapid state changes, especially `mode="wait"` and `layoutId` usages

**Phases with standard patterns (skip research-phase):**
- **Phase 8:** MongoDB connection consolidation — well-documented Next.js pattern
- **Phase 9:** Emergency security fixes — audit findings are explicit, no research needed
- **Phase 13:** Accessibility — WCAG 2.1 AA is standard, Headless UI Dialog is documented
- **Phase 14:** Design system consolidation — patterns exist in codebase (ui/mobiglas/)
- **Phase 15:** Code quality — logging, state machines, optimistic locking are standard patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Next.js 15.5.12 upgrade path verified against official release notes and CVE advisories; motion v12 migration verified against upgrade guide; breaking changes analyzed against codebase grep results |
| Features | **HIGH** | All findings verified by direct codebase analysis (read route handlers, counted form elements, confirmed CSS variable definitions, verified dual MongoDB clients); severity assigned based on OWASP 2025 and WCAG 2.1 standards |
| Architecture | **HIGH** | Dependency graph derived from codebase structure analysis; dual MongoDB client issue confirmed by reading both files; framer-motion usage confirmed via grep (109 files); design system fragmentation confirmed by CSS analysis (530+ inline references) |
| Pitfalls | **HIGH** | CVE-2025-29927 verified via Datadog, JFrog, and NVD disclosures; CSP nonce issue confirmed in Next.js GitHub discussion #80997; framer-motion breaking changes verified in Motion changelog; all other pitfalls verified via codebase analysis |

**Overall confidence:** HIGH

### Gaps to Address

**CSP nonce implementation strategy:** The split CSP strategy (hash-based for static, nonces for dynamic) is recommended but needs empirical testing. Next.js GitHub discussion #80997 reports CSP issues in production builds. During Phase 10 planning, test CSP headers on a staging build before production deployment.

**framer-motion AnimatePresence v12 behavior:** Motion changelog mentions velocity calculation changes and layout animation improvements, but does not explicitly confirm whether AnimatePresence bugs (#2554, #2023) are resolved. During Phase 12 execution, test all `mode="wait"` and `layoutId` instances with rapid state changes to verify behavior.

**Profile migration conflict resolution:** The localStorage→server migration (Phase 11) must handle cases where localStorage data conflicts with server data (user edited profile in two browsers). Design the conflict resolution strategy during Phase 11 planning: last-write-wins, merge strategies, or user-prompted resolution.

**Rate limiter TTL index performance:** MongoDB TTL indexes run background cleanup every 60 seconds by default. For a rate limiter checking limits on every request, verify that the TTL index does not cause performance degradation. If latency is critical, consider Upstash Redis as fallback (mentioned in STACK.md as alternative).

**Next.js 16 future compatibility:** This milestone stays on Next.js 15.x, but the eventual Next.js 16 migration (React 19, middleware-to-proxy rename) should be tracked as a future milestone. After v1.1 stabilizes, create a separate assessment for Next.js 16 + next-auth v5 migration.

## Sources

### Primary (HIGH confidence)
- **Next.js 15.5 release blog** — upgrade path, breaking changes, deprecations
- **Next.js Security Update Dec 2025** — CVE-2025-66478 RCE advisory
- **CVE-2025-29927 disclosure (Datadog, JFrog, NVD)** — middleware authorization bypass
- **Motion upgrade guide** — framer-motion to motion migration, breaking changes
- **Motion changelog** — v10 to v12 changes, AnimatePresence updates
- **Next.js CSP documentation** — nonce generation, hydration script handling
- **OWASP Top 10 2025** — security misconfiguration, input validation
- **WCAG 2.1/2.2 guidelines** — accessibility requirements (form labels, keyboard nav, focus indicators)
- **Codebase analysis** — direct reading of middleware.ts, rate-limiter.ts, mongodb.ts, mongodb-client.ts, 109 framer-motion files, 530+ CSS references, 45+ API routes

### Secondary (MEDIUM confidence)
- **Arcjet Next.js security checklist** — CSP, rate limiting, bot protection patterns
- **Next.js production checklist** — deployment best practices
- **Upstash rate limiting guide** — Redis-based alternative to MongoDB rate limiter
- **Next.js GitHub discussion #80997** — CSP in production builds issue
- **framer-motion GitHub issues #2554, #2023** — AnimatePresence bugs with rapid state changes

### Tertiary (LOW confidence)
- **Arcjet beta status** — @arcjet/next is beta; alternative MongoDB-backed rate limiter recommended for risk aversion
- **Motion v12 AnimatePresence bug fixes** — changelog mentions improvements but does not explicitly list resolved issues; needs empirical testing

---

*Research completed: 2026-02-15*
*Ready for roadmap: yes*
