# Feature Landscape: Security Hardening, UX Remediation, and UI Consolidation

**Domain:** Production hardening of a Next.js 15 org management application
**Researched:** 2026-02-15
**Overall confidence:** HIGH (verified against codebase audit, OWASP 2025, Next.js production checklist, WCAG 2.1/2.2 guidelines)

---

## Context: What the Audit Found

The v1.0 ship database milestone shipped successfully (47/47 requirements). A comprehensive codebase review then uncovered 100+ findings across five categories:

- **Security:** 6 critical (unauthenticated endpoints, ReDoS vectors, XSS surface), 8 high (RBAC disabled/hardcoded, auth bypass paths, info leakage via diagnostic routes)
- **UX:** 3 critical (localStorage-only profile data, no undo on destructive actions, no delete confirmations in key flows), 7 high (alert() for user feedback, missing form labels, no keyboard navigation in modals)
- **Performance:** 18 findings (weak cache headers, client-side pagination of full datasets, no SSR for data pages, bundle bloat from unused deps, canvas animation perf)
- **Dependencies:** 29 npm vulnerabilities, 8 unused packages, Next.js RCE advisory, framer-motion 2 majors behind current
- **UI Consistency:** `--mg-error` CSS variable referenced in 40+ places but never defined, 3 separate button implementations (`mg-button` CSS class, `mg-button-small` CSS class, `MobiGlasButton` React component), 4 different corner accent patterns, design system components exist but are underutilized

This document categorizes remediation features into **must-fix** (security, data loss), **should-improve** (UX, performance), and **nice-to-have** (polish, consistency).

---

## Table Stakes

Features that MUST be implemented. Without these, the application has exploitable security holes, data loss risks, or violates basic web standards. Missing = the app is not production-ready.

### Security -- Critical (Must Fix Immediately)

| # | Feature | Why Expected | Complexity | Dependencies | Notes |
|---|---------|--------------|------------|--------------|-------|
| S1 | **Auth-gate all sensitive API routes** | `/api/diagnostic`, `/api/force-fallback`, `/api/storage-status` are fully unauthenticated. Diagnostic exposes user emails, password hash lengths, file paths, CWD. Force-fallback lets anyone switch the app to degraded storage mode. These are effectively admin endpoints with zero access control. | Low | None | 3 routes to fix. Add `getServerSession()` check + admin clearance requirement. Delete `/api/diagnostic` entirely -- it is a debug route that should never exist in production. |
| S2 | **Define `--mg-error` CSS variable** | Referenced in 40+ component files via `rgba(var(--mg-error), ...)` but never declared in `:root`. Every error state, validation message, and danger button currently renders with invisible/transparent coloring. Users cannot see form errors, validation failures, or danger indicators. | Low | None | Add `--mg-error: 255, 70, 70;` (or alias to existing `--mg-danger`) in globals.css `:root`. One-line fix with massive UX impact. |
| S3 | **Re-enable RBAC / clearance enforcement** | Clearance levels 1-5 exist in the data model and are assigned to users, but enforcement is inconsistent. Only mission creation checks clearance (level 3+). Admin routes have no clearance checks. `canUserModifyMission()` uses creator-only ownership with no admin override. The session token carries `clearanceLevel` but most routes ignore it. | Medium | S1 | Implement middleware or utility function that validates clearance at route level. Add admin override to ownership checks. Map clearance levels to route access matrix. |
| S4 | **Validate callback URLs in auth redirects** | Middleware redirects unauthenticated users to `/login?callbackUrl=<pathname>`. The `callbackUrl` is taken directly from the request path. While the current code uses `pathname` (not a full URL), the pattern is fragile. An open redirect is possible if query parameters or encoded paths are manipulated. | Low | None | Validate that callbackUrl is a relative path starting with `/`. Strip any protocol/host. |
| S5 | **Sanitize error messages in API responses** | Multiple routes expose internal implementation details: `Database error: ${error.message}` (signup, missions), `error.stack` (diagnostic), and `error.message` passthrough. These leak MongoDB connection details, collection names, and internal state on error. | Low | None | Replace error detail passthrough with generic messages. Log full details server-side only. |
| S6 | **Secure cron endpoints** | `/api/cron/ship-sync` and `/api/cron/discord-sync` have OPTIONAL auth -- they only check `CRON_SECRET` if it is set. If `CRON_SECRET` is not configured (common in development, possible in production misconfiguration), these endpoints are fully open. Ship sync triggers heavy FleetYards API calls; discord sync touches all user records. | Low | None | Make auth REQUIRED, not optional. If `CRON_SECRET` is not set, reject all requests (fail closed, not fail open). |
| S7 | **Remove or gate the second force-fallback route** | There are TWO force-fallback endpoints: `/api/fleet-ops/force-fallback` (auth-gated, POST) and `/api/force-fallback` (NO auth, GET). The GET version is worse -- it actively calls `setFallbackStorageMode(true)`, dumps all user data (ids, handles, emails, password hash metadata), and requires no authentication whatsoever. | Low | None | Delete `/api/force-fallback/route.ts` entirely. It is a debug artifact. |

### Security -- High (Fix Before Production Traffic)

| # | Feature | Why Expected | Complexity | Dependencies | Notes |
|---|---------|--------------|------------|--------------|-------|
| S8 | **Add rate limiting to auth endpoints** | Signup, login, forgot-password, and reset-password have no rate limiting. An attacker can brute-force credentials or enumerate accounts via signup 409 responses ("handle already exists", "email already exists"). | Medium | npm package (rate-limiter-flexible or upstash/ratelimit) | Apply to `/api/auth/signup`, `/api/auth/[...nextauth]`, `/api/auth/forgot-password`, `/api/auth/reset-password`. Use IP-based limiting with sliding window. |
| S9 | **Add Content-Security-Policy header** | Security headers exist (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) but CSP is missing. Without CSP, XSS payloads can load external scripts. | Medium | None (next.config.js) | Add CSP with script-src 'self', style-src 'self' 'unsafe-inline' (needed for Tailwind), img-src for CDN domains. Audit inline scripts first. |
| S10 | **Server-side image upload validation** | Upload route checks file size (5MB) and MIME type prefix (`image/`), but MIME types are client-provided and trivially spoofed. No magic byte validation. Images stored as raw buffers in MongoDB (no processing/resizing). | Medium | sharp (for image processing) or file-type (for magic byte validation) | Validate magic bytes server-side. Consider resizing to max dimensions. Limit to specific formats (JPEG, PNG, WebP). |
| S11 | **Fix password handling inconsistency** | Both `bcrypt` and `bcryptjs` are installed. OAuth users get `passwordHash: ''` (empty string, not null). Empty string could theoretically match against some bcrypt edge cases. | Low | None | Remove `bcryptjs` dependency. Set OAuth users' passwordHash to `null` instead of empty string. |
| S12 | **Add security headers to API routes** | API route responses lack security headers. The `headers()` config in next.config.js only applies to page routes (the matcher excludes `/api/*`). | Low | None | Apply security headers to API responses via middleware or response utility. |

### UX -- Critical (Data Loss or Broken Workflow)

| # | Feature | Why Expected | Complexity | Dependencies | Notes |
|---|---------|--------------|------------|--------------|-------|
| U1 | **Migrate profile data from localStorage to server** | `useUserProfile` hook stores ALL profile data (name, photo, subsidiary, pay grade, position, timezone, gameplay preferences, ships) in browser localStorage keyed by email. If the user clears browser data, switches browsers, or uses incognito mode, their entire profile is gone. Ships array in localStorage duplicates/conflicts with the server-side user record. | High | S3 (server needs to know who the user is), API endpoint for profile CRUD | Create `/api/profile` GET/PUT endpoints. Migrate localStorage data to user document in MongoDB. Keep localStorage as cache only, not source of truth. This is the highest-complexity UX fix. |
| U2 | **Replace alert() calls with UI notifications** | 8 `alert()` calls in MissionPlanner.tsx for success/error feedback. `alert()` blocks the UI thread, has no styling, breaks immersion in the MobiGlas theme, and is jarring on mobile. | Medium | ErrorNotification component (already exists) | The codebase already has `ErrorNotification.tsx` with full MobiGlas styling. Create a companion `SuccessNotification` or generalize to `Toast`. Replace all alert() calls. |
| U3 | **Add confirmation dialogs for destructive actions** | Mission deletion in MissionPlanner calls DELETE API directly with no confirmation. EscortRequestDetail has a proper confirmation modal, proving the pattern exists. The inconsistency means some deletes are one-click-irreversible. | Low-Medium | U2 (notification system for consistency) | EscortRequestDetail.tsx already implements a confirm/cancel modal pattern. Extract and reuse. Apply to mission delete, fleet ship remove, profile reset. |

### UX -- High (Accessibility and Usability)

| # | Feature | Why Expected | Complexity | Dependencies | Notes |
|---|---------|--------------|------------|--------------|-------|
| U4 | **Add accessible form labels** | Codebase has 266 form elements (inputs, selects, buttons, textareas) across 55 files but only 33 accessibility attributes (aria-label, role, htmlFor, aria-describedby) across 13 files. Most form inputs have no associated label element or aria-label. Screen readers cannot identify what fields are for. WCAG 1.3.1 (Info and Relationships) and 4.1.2 (Name, Role, Value) failures. | Medium | None | Audit all form components. MobiGlasInput already supports labels -- ensure all usages pass label prop. Add htmlFor/id pairs. Add aria-describedby for error messages. |
| U5 | **Keyboard navigation for modals and pickers** | FleetShipPickerModal, MissionShipPickerModal, and other modals lack focus trapping, Escape-to-close, and keyboard-navigable lists. Users must use a mouse. WCAG 2.1.1 (Keyboard) and 2.1.2 (No Keyboard Trap) failures. | Medium | @headlessui/react (already installed, v1.7.18) | Headless UI provides Dialog with built-in focus trapping and Escape handling. The dependency is already installed but underutilized. Migrate modals to Headless UI Dialog. |
| U6 | **Visible focus indicators** | The MobiGlas dark theme makes default browser focus outlines nearly invisible against the dark background. Custom focus styles exist on some elements (mg-button has `:focus` styles) but most interactive elements rely on browser defaults that disappear into the dark UI. WCAG 2.4.7 (Focus Visible). | Low-Medium | None | Add global focus-visible styles using the MobiGlas cyan glow aesthetic: `outline: 2px solid rgba(var(--mg-primary), 0.8)`. Apply via Tailwind plugin or global CSS. |
| U7 | **Loading states for async operations** | MobiGlasButton has an `isLoading` prop with a spinner animation, but most buttons in the app are plain HTML `<button>` or CSS `mg-button` class elements with no loading state. Users click submit buttons with no feedback that the action is processing. | Low-Medium | U2 (notification for completion), button consolidation | As buttons are consolidated to MobiGlasButton, loading states come for free. Priority is high-frequency actions: mission create/update, profile save, escort request submit. |

---

## Differentiators

Features that improve quality beyond the minimum. Not blocking production, but distinguish a professional application from a hobby project. Valued by users who interact with the app regularly.

### Performance Optimization

| # | Feature | Value Proposition | Complexity | Dependencies | Notes |
|---|---------|-------------------|------------|--------------|-------|
| P1 | **Database-level pagination** | `getAllPlannedMissions()` loads entire collection into memory, then slices in JavaScript. Same pattern in `/api/users`. With 100+ missions and growing, this wastes memory and adds latency. Push `.skip().limit()` to MongoDB queries. | Medium | None | Affects planned-missions and users routes. Ship API already has proper DB pagination (built correctly in v1.0). |
| P2 | **Static asset cache headers** | All static assets (CSS, JS, images, fonts) have `max-age=3600` (1 hour). Next.js static chunks are content-hashed and can safely use `max-age=31536000, immutable`. Fonts and images should be cached for days/weeks, not hours. | Low | None | Update next.config.js `headers()`. `/_next/static` should be immutable. Images/fonts should be `max-age=604800` (7 days). |
| P3 | **SSR or ISR for public pages** | Ship browse page, services page, about page, and other public content are client-rendered with useEffect data fetching. These could be server-rendered or statically generated for faster initial load and better SEO. | Medium | None | Ship browse page is the highest-value target: it fetches `/api/ships` client-side on every visit. Use Next.js App Router server components or `generateStaticParams`. |
| P4 | **Bundle size reduction** | `@azure/cosmos`, `@azure/identity`, `@azure/msal-node`, `mammoth` (Word doc parser), `openid-client`, and potentially `bcryptjs` (duplicate of `bcrypt`) are installed but may be unused or replaceable. framer-motion 10.x is 2 major versions behind (current is 12.x). | Medium | Dependency audit | Run `@next/bundle-analyzer` (already configured). Remove confirmed unused packages. Upgrade framer-motion (check breaking changes). |
| P5 | **Reduce client-side JavaScript for public pages** | Landing page (HomeContent.tsx, 921 lines), services page, and about page ship large client bundles for animations and effects. Consider splitting heavy animation code. | Medium | P4 | Use `next/dynamic` with `ssr: false` for animation-heavy components. Move static content to server components. |

### UI Consistency and Design System

| # | Feature | Value Proposition | Complexity | Dependencies | Notes |
|---|---------|-------------------|------------|--------------|-------|
| D1 | **Consolidate button implementations** | Three competing patterns: (1) `.mg-button` CSS class in globals.css, (2) `.mg-button-small` and `.mg-button-secondary` CSS classes, (3) `MobiGlasButton` React component with variants, sizes, loading states, icons. Components use different ones arbitrarily. MobiGlasButton is the most complete but least used. | Medium | S2 (mg-error must work for danger variant) | Audit all button usages. Migrate to MobiGlasButton for interactive buttons. Keep CSS classes only for static/decorative cases. Create a migration checklist by file. |
| D2 | **Consolidate corner accent patterns** | `CornerAccents` React component exists but only 3 files use it. Meanwhile, 10+ files manually implement corner accents with inline divs (`absolute top-0 left-0 w-2 h-2 border-t border-l`). ErrorNotification has its own corner accent pattern. MobiGlasButton has a `withCorners` prop with yet another pattern. | Low-Medium | None | Extract all corner accent patterns. Decide on one implementation (the CornerAccents component). Replace inline implementations. |
| D3 | **Utilize MobiGlas design system components** | The `/components/ui/mobiglas/` directory exports 9 components: Container, Panel, Button, Input, TextArea, CornerAccents, ScanlineEffect, StatusIndicator, DataStreamBackground, HolographicBorder. Most dashboard pages ignore these and build their own panels/containers with raw Tailwind. | Medium-High | D1, D2 | This is the "design system adoption" effort. Prioritize high-traffic pages (dashboard, mission planner, fleet builder). Do NOT attempt all pages at once. |
| D4 | **Unify error display patterns** | Error states use: inline red text, ErrorNotification component, alert() calls, red-bordered divs, and `console.error` (invisible to user). No consistent pattern for showing validation errors, API errors, or system errors. | Medium | S2, U2 | Define three tiers: (1) field-level validation (MobiGlasInput error prop), (2) form-level errors (inline alert component), (3) system-level errors (toast notification). |
| D5 | **Replace mg-nav-item remnants** | `mg-nav-item` CSS class still exists in globals.css and Footer.tsx but is a deprecated pattern. Navigation buttons should use the standard button patterns. | Low | D1 | Minor cleanup. Verify mg-nav-item usage, migrate to MobiGlasButton or standard link styling. |

### Code Quality

| # | Feature | Value Proposition | Complexity | Dependencies | Notes |
|---|---------|-------------------|------------|--------------|-------|
| Q1 | **Structured logging (replace console.*)** | `console.log()` and `console.error()` scattered throughout. A `Logger` class exists in `src/lib/logger.ts` with `logInfo`, `logError`, `logDebug`, `logWarn` but most code still uses raw console. Production logs are unstructured, unsearchable, and may expose sensitive data. | Medium | None | Replace raw console calls with logger. Ensure sensitive data (emails, tokens, IDs) is masked. This is a sweep across ~50+ files but each change is mechanical. |
| Q2 | **Add mission state machine validation** | Mission status transitions (DRAFT -> SCHEDULED -> ACTIVE -> DEBRIEFING -> COMPLETED) are not validated. Any status can jump to any other status. No `canTransitionTo()` function exists. | Low-Medium | None | Create a state machine map. Add validation in the update API route. Reject invalid transitions with a 400 response. |
| Q3 | **Add optimistic locking for concurrent edits** | No `version` field on missions or operations. Two users editing the same mission simultaneously causes last-write-wins data loss. | Medium | None | Add `version: number` to mission documents. Increment on each update. Check version in update API -- reject with 409 Conflict if stale. |

---

## Anti-Features

Features to explicitly NOT build in this remediation milestone. These are scope traps that look tempting during a hardening pass but would derail the effort.

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|--------------|-----------|-------------------|
| A1 | **Full test suite** | Writing comprehensive tests for all 45+ API routes, 55+ components, and storage layers would consume more effort than all other fixes combined. Testing is valuable but should be a dedicated milestone, not mixed into security fixes. | Add tests ONLY for the specific security fixes (auth checks, rate limiting, input validation). Create a testing milestone for systematic coverage. |
| A2 | **Migrate off NextAuth to Auth.js v5** | NextAuth 4.x is stable and working. Auth.js v5 has significant API changes. Migrating authentication during a security hardening pass introduces new risk -- the opposite of hardening. | Pin NextAuth 4.x. Monitor for critical security patches. Plan migration as a separate future milestone. |
| A3 | **Rewrite monolithic components** | MissionPlanner.tsx (1211 lines), MissionForm.tsx (1178 lines), MissionPlannerForm.tsx (1090 lines), HomeContent.tsx (921 lines) are large but functional. Refactoring them during security work risks introducing regressions in complex state management. | Fix specific issues within them (alert() replacement, accessibility). Plan component decomposition as a separate effort. |
| A4 | **Implement real-time collaboration** | Optimistic locking (Q3) addresses concurrent edit safety. Building real-time collaborative editing (WebSocket-based) is a massive feature, not a fix. | Add version-based conflict detection. Show "this record was modified by another user" error. Do not build live sync. |
| A5 | **Complete WCAG AAA compliance** | WCAG AAA requires contrast ratios of 7:1, sign language interpretation for media, and other extreme measures. The MobiGlas dark theme with cyan accents may not meet AAA contrast. AA is the standard target. | Target WCAG 2.1 AA. Fix the critical violations (labels, keyboard nav, focus visibility). Leave AAA for a dedicated accessibility audit. |
| A6 | **Add Redis for caching/sessions** | Redis would improve rate limiting and session management but adds infrastructure complexity. In-memory rate limiting is sufficient for the current scale (<100 concurrent users). | Use in-memory rate limiting (Map-based with TTL). Add Redis when scaling demands it. |
| A7 | **Switch to a different CSS framework or design system** | Tailwind CSS 3.3.0 works. Switching to 4.x or to a component library (shadcn/ui, Radix, etc.) during hardening would touch every file. | Stay on Tailwind 3.x. Consolidate within the existing MobiGlas design system. Evaluate Tailwind 4 and shadcn/ui for a future milestone. |

---

## Feature Dependencies

```
S2 (--mg-error CSS var) ──────────────────────────────────────┐
  │                                                             │
  └── D1 (Button consolidation) ── D3 (Design system adoption) │
                                                                │
S1 (Auth-gate routes) ── S3 (RBAC enforcement) ── U1 (Profile  │
  │                        │                       server-side) │
  │                        │                                    │
  └── S7 (Remove debug routes)                                  │
                                                                │
S4 (Callback URL validation)                                    │
S5 (Sanitize error messages)                                    │
S6 (Secure cron endpoints)                                      │
                                                                │
U2 (Toast notifications) ── U3 (Confirm dialogs)               │
  │                                                             │
  └── D4 (Unify error display) ─────────────────────────────────┘
                                                                │
U4 (Form labels) ── U5 (Keyboard nav) ── U6 (Focus indicators) │
                      │                                         │
                      └── Uses @headlessui/react (installed)    │
                                                                │
P1 (DB pagination)                                              │
P2 (Cache headers)                                              │
P3 (SSR public pages) ── P5 (Reduce client JS)                 │
P4 (Bundle size) ── dependency audit                            │
                                                                │
Q1 (Structured logging)                                         │
Q2 (State machine validation)                                   │
Q3 (Optimistic locking)                                         │
                                                                │
D2 (Corner accent consolidation) ── D3 (Design system adoption)│
D5 (mg-nav-item cleanup) ── D1                                 │
```

**Critical path:** S2 (unblocks visible errors) -> S1/S7 (close security holes) -> S5/S6 (harden remaining routes) -> S3 (enforce RBAC) -> U1 (fix data loss risk) -> U2/U3 (fix UX gaps) -> D1/D4 (consolidate patterns)

**Independent tracks (can run in parallel):**
- Security fixes (S1-S12): mostly independent, can be done in any order
- Accessibility fixes (U4-U7): independent of security
- Performance (P1-P5): independent of security and UX
- UI consolidation (D1-D5): depends on S2 only

---

## MVP Recommendation

The remediation effort should be ordered by risk, not by category. Fix what can hurt users first.

### Phase 1: Emergency Security Fixes (must ship first)

**Rationale:** These are exploitable vulnerabilities that exist right now.

1. **S2 - Define --mg-error CSS variable** -- One line of CSS, but without it, users literally cannot see error messages. Unblocks every error-related feature.
2. **S1 - Auth-gate sensitive API routes** -- Close the diagnostic and force-fallback holes. Delete debug routes.
3. **S7 - Remove unauthenticated force-fallback** -- Delete the GET route at `/api/force-fallback`.
4. **S5 - Sanitize error messages** -- Stop leaking internal details in 500 responses.
5. **S6 - Secure cron endpoints** -- Make CRON_SECRET required, not optional.
6. **S4 - Validate callback URLs** -- Close the open redirect vector.
7. **S11 - Fix password handling** -- Remove bcryptjs, fix empty-string passwordHash.

**Estimated complexity:** Low. Each fix is a few lines. Total phase is <1 day of focused work.

### Phase 2: Access Control and Auth Hardening

**Rationale:** With the holes plugged, harden the access control model.

8. **S3 - Re-enable RBAC** -- Implement route-level clearance enforcement. Add admin override to ownership checks.
9. **S8 - Rate limiting on auth endpoints** -- Prevent brute-force and enumeration attacks.
10. **S9 - Content-Security-Policy** -- Add CSP header to prevent XSS payload execution.
11. **S12 - Security headers on API routes** -- Extend header coverage.
12. **S10 - Server-side image validation** -- Magic byte validation for uploads.

**Estimated complexity:** Medium. Rate limiting requires a library. RBAC requires mapping clearance levels to routes.

### Phase 3: UX Critical Fixes

**Rationale:** Fix data loss risks and the worst UX violations.

13. **U2 - Toast notification system** -- Replace alert() calls. Build on existing ErrorNotification.
14. **U3 - Confirmation dialogs** -- Extract the pattern from EscortRequestDetail. Apply to all destructive actions.
15. **U1 - Profile server-side migration** -- Move profile data from localStorage to the database. Highest complexity single item.

**Estimated complexity:** Medium-High. U1 alone is significant (new API endpoints, data migration, localStorage->server sync).

### Phase 4: Accessibility and Performance

**Rationale:** These improve quality for all users and are independent of the security fixes.

16. **U4 - Form labels** -- Audit and fix all 55 files with form elements.
17. **U5 - Keyboard navigation** -- Migrate modals to Headless UI Dialog.
18. **U6 - Focus indicators** -- Global focus-visible styles.
19. **P1 - Database pagination** -- Push pagination to MongoDB for missions and users.
20. **P2 - Cache headers** -- Fix static asset cache lifetimes.

**Estimated complexity:** Medium. Largely mechanical but touches many files.

### Phase 5: UI Consolidation and Polish

**Rationale:** With functionality solid, unify the visual layer.

21. **D1 - Button consolidation** -- Migrate to MobiGlasButton across the app.
22. **D2 - Corner accent consolidation** -- Standardize on CornerAccents component.
23. **D4 - Error display unification** -- Three-tier error strategy.
24. **D5 - mg-nav-item cleanup** -- Remove deprecated pattern.
25. **U7 - Loading states** -- Leverage MobiGlasButton isLoading prop.

**Estimated complexity:** Medium. Many file touches but each change is straightforward.

### Phase 6: Code Quality and Optimization (stretch)

**Rationale:** Professional polish. Not blocking production but improves maintainability.

26. **Q1 - Structured logging** -- Replace console.* with logger.
27. **Q2 - Mission state machine** -- Validate status transitions.
28. **Q3 - Optimistic locking** -- Version-based conflict detection.
29. **P3 - SSR for public pages** -- Server-render ship browse and public content.
30. **P4 - Bundle size reduction** -- Remove unused deps, upgrade framer-motion.
31. **P5 - Reduce client JS** -- Dynamic imports for heavy components.
32. **D3 - Design system adoption** -- Broader MobiGlas component usage.

**Estimated complexity:** Medium-High. Logging sweep is large. SSR migration requires testing.

### Defer to Future Milestones

- **Full test suite** (A1) -- Dedicated testing milestone
- **NextAuth -> Auth.js v5 migration** (A2) -- After security stabilizes
- **Component decomposition** (A3) -- Separate refactoring milestone
- **Redis infrastructure** (A6) -- When scaling demands it
- **Tailwind 4 / CSS framework evaluation** (A7) -- After consolidation

---

## Prioritization Matrix

| Priority | Category | Items | Risk if Deferred | Effort |
|----------|----------|-------|-------------------|--------|
| P0 - Emergency | Security | S1, S2, S4, S5, S6, S7, S11 | Exploitable now | Low |
| P1 - Critical | Security | S3, S8, S9, S10, S12 | Attackable auth, XSS surface | Medium |
| P1 - Critical | UX | U1, U2, U3 | Data loss, broken feedback | Medium-High |
| P2 - High | Accessibility | U4, U5, U6, U7 | WCAG non-compliance, exclusion | Medium |
| P2 - High | Performance | P1, P2 | Scalability, cache waste | Low-Medium |
| P3 - Medium | UI Consistency | D1, D2, D4, D5 | Visual inconsistency | Medium |
| P3 - Medium | Code Quality | Q1, Q2, Q3 | Maintainability debt | Medium |
| P4 - Low | Performance | P3, P4, P5 | Load time, bundle size | Medium |
| P4 - Low | UI Polish | D3 | Underutilized design system | Medium-High |

---

## Sources

### Security
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) -- Official production deployment guidance (HIGH confidence)
- [Next.js Security Update Dec 2025](https://nextjs.org/blog/security-update-2025-12-11) -- RCE advisory for Next.js (HIGH confidence)
- [Next.js Security Checklist (Arcjet)](https://blog.arcjet.com/next-js-security-checklist/) -- Comprehensive hardening guide (MEDIUM confidence)
- [Complete Next.js Security Guide 2025 (TurboStarter)](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) -- Auth and API protection patterns (MEDIUM confidence)
- [OWASP Top 10 2025 - Security Misconfiguration](https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/) -- Security misconfiguration guidance (HIGH confidence)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html) -- Node-specific security patterns (HIGH confidence)
- [NextAuth.js - Securing Pages and API Routes](https://next-auth.js.org/tutorials/securing-pages-and-api-routes) -- Auth protection patterns (HIGH confidence)
- [Securing API Routes with Middleware and JWT](https://www.djamware.com/post/68f99de910360530b36a6596/secure-api-routes-in-nextjs-with-middleware-and-jwt) -- JWT middleware patterns (MEDIUM confidence)

### Accessibility
- [React Accessibility Best Practices (AllAccessible)](https://www.allaccessible.org/blog/react-accessibility-best-practices-guide) -- WCAG-compliant React SPA guide (MEDIUM confidence)
- [ARIA Labels Implementation Guide (AllAccessible)](https://www.allaccessible.org/blog/implementing-aria-labels-for-web-accessibility) -- ARIA attribute guidance (MEDIUM confidence)
- [Keyboard Navigation & Focus WCAG (Accesify)](https://www.accesify.io/blog/keyboard-navigation-focus-wcag/) -- Focus management patterns (MEDIUM confidence)
- [WCAG 2.2 Compliance Checklist (AllAccessible)](https://www.allaccessible.org/blog/wcag-22-compliance-checklist-implementation-roadmap) -- Implementation roadmap (MEDIUM confidence)
- [React Accessibility Guide (BrowserStack)](https://www.browserstack.com/guide/react-accessibility) -- Practical React a11y guide (MEDIUM confidence)

### Performance
- [Next.js Performance Optimization (Pagepro)](https://pagepro.co/blog/nextjs-performance-optimization-in-9-steps/) -- 9-step optimization guide (MEDIUM confidence)
- [Expert Guide to Next.js Performance (Blazity)](https://blazity.com/the-expert-guide-to-nextjs-performance-optimization) -- Bundle, SSR, and caching strategies (MEDIUM confidence)
- [React & Next.js Best Practices 2025 (Strapi)](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices) -- Modern patterns (MEDIUM confidence)

### UI / Design Systems
- Codebase analysis of `src/components/ui/mobiglas/` -- 9 components, barrel exports, typed props (HIGH confidence -- direct code review)
- Codebase analysis of `src/app/globals.css` -- CSS variable definitions, button classes, design tokens (HIGH confidence -- direct code review)

### Confidence Notes

| Area | Confidence | Reason |
|------|------------|--------|
| Security findings | HIGH | Verified by reading actual route handlers, checking auth presence/absence, confirming CSS variable definitions |
| UX findings | HIGH | Verified by reading component source, counting form elements vs labels, confirming alert() usage |
| Performance findings | MEDIUM-HIGH | Verified pagination patterns in code; cache header values confirmed in next.config.js; SSR opportunities inferred |
| Accessibility gaps | MEDIUM | Counted elements and attributes but did not run automated a11y scanner (axe-core). Manual audit recommended for validation |
| UI consistency | HIGH | Verified by searching for all button class usages, CSS variable definitions, component import patterns |
| Dependency risks | MEDIUM | Version numbers confirmed in package.json; vulnerability count from project context, not independently verified via npm audit |
