# Architecture: Security Hardening, Performance Optimization, and Design System Consolidation

**Domain:** Cross-cutting infrastructure improvements to an existing Next.js 15 App Router application
**Researched:** 2026-02-15
**Overall confidence:** HIGH (based on direct codebase analysis + official documentation + web research)

---

## System Overview

This milestone addresses three interconnected concerns across the existing AydoCorp Next.js 15 application:

1. **Security Hardening** -- CSP headers, input sanitization standardization, auth middleware expansion, rate limiting
2. **Performance Optimization** -- framer-motion bundle reduction, SSR conversion, cache header tuning, DB connection consolidation
3. **Design System Consolidation** -- eliminating competing component implementations, unifying CSS variable usage, canonicalizing the MobiGlas component library

These are NOT independent workstreams. They have deep dependency relationships that dictate build order.

```
DEPENDENCY GRAPH (must be built in dependency order)

DB Connection Consolidation ─────────────────────────────────────────┐
  (mongodb.ts + mongodb-client.ts → unified module)                  │
                                                                     │
Rate Limiter (depends on consolidated DB OR external store) ─────────┤
                                                                     │
CSP Headers (independent, but blocks inline style cleanup) ──────────┤
                                                                     │
Input Sanitization (Zod standardization across all API routes) ──────┤
                                                                     │
Auth Middleware Expansion (independent) ─────────────────────────────-┤
                                                                     │
Cache Header Tuning (independent) ──────────────────────────────────-┤
                                                                     │
Design System Consolidation (independent of above) ─────────────────-┤
  Corner Accents → unified CornerAccents component                   │
  Button variants → unified MobiGlasButton                           │
  CSS class deduplication                                            │
                                                                     │
LazyMotion Migration (depends on design system consolidation) ───────┤
  (must know final component boundaries before migrating motion)     │
                                                                     │
SSR Conversion (depends on LazyMotion + design system) ──────────────┘
  (pages must use m components, not motion, for SSR compatibility)
```

---

## Current Architecture Analysis

### Dual MongoDB Connection Problem

Two separate MongoDB connection modules exist, each maintaining independent connection pools:

| Module | Pattern | Used By | Connection Style |
|--------|---------|---------|-----------------|
| `mongodb.ts` | Promise-based singleton with dev HMR caching | `finance.ts`, `mission-template-storage.ts`, `planned-mission-storage.ts`, `ship-name-matcher.ts`, `storage-utils.ts` | `clientPromise` pattern, exports `connectToDatabase()` returning `{client, db}` |
| `mongodb-client.ts` | Mutable singleton with reconnect/retry logic | `user-storage.ts`, `operation-storage.ts`, `mission-storage.ts`, `escort-request-storage.ts`, `resource-storage.ts`, `password-reset-storage.ts`, `ship-storage.ts` | Direct `client` reference, exports collection handles + CRUD helpers |

**Critical issue:** Both create `MongoClient` with `maxPoolSize: 100`, meaning the app potentially opens **200 connections** to the same database. Azure Cosmos DB for MongoDB vCore has connection limits, and this wastes resources.

**Additional issue:** Some storage modules import BOTH connectors. `escort-request-storage.ts`, `mission-storage.ts`, and `storage-utils.ts` import from both `mongodb.ts` AND `mongodb-client.ts`, creating ambiguity about which connection is actually used.

### Rate Limiter (Dead Code)

`src/lib/rate-limiter.ts` exists but is only imported in `src/lib/finance.ts`. The rest of the 45 API routes have zero rate limiting. The implementation is in-memory (`Map<string, RateLimitEntry>`), which means:

1. State is lost on server restart
2. In multi-instance deployments, each instance has independent counters
3. Memory grows unbounded (no cleanup of expired entries)

### Authentication Middleware Gaps

Current `src/middleware.ts` protects only 3 route prefixes:
- `/dashboard`
- `/userprofile`
- `/admin`

**Not protected:** All `/api/*` routes are excluded from middleware via the matcher regex. API routes handle their own auth individually via `getServerSession(authOptions)`, but this is inconsistent -- some routes check, some don't.

### CSP Headers: Non-Existent

`next.config.js` sets `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`, but has NO Content-Security-Policy header. The app uses:
- Inline styles extensively (Tailwind + MobiGlas CSS)
- External CDN images (FleetYards, aydocorp.space)
- External fonts (local font files, loaded via `next/font/local`)
- `data:` URIs in CSS (SVG backgrounds in globals.css)
- `framer-motion` which injects inline styles at runtime

This means a CSP must accommodate `style-src 'unsafe-inline'` (or use nonces) and several image sources.

### Input Validation: Mixed Approaches

| Approach | Routes Using It |
|----------|----------------|
| Zod schemas | 14 files (signup, contact, profile, ships, fleet-ops resources/operations, forgot-password, reset-password, mission-builder validation) |
| Manual validation functions | missions, escort-requests, mission-templates |
| No validation | several GET-only routes, some admin routes |

### framer-motion: 109 Files, No Optimization

Every file imports `{ motion }` from `framer-motion` which bundles the full 34kb feature set per entry point. No `LazyMotion`, no `m` component, no code splitting. The app is on `framer-motion@^10.16.4` (not the latest `motion` package rename).

### Design System Fragmentation

**Button implementations (4 competing patterns):**

| Implementation | Location | Usage Count |
|----------------|----------|-------------|
| `.mg-button` CSS class | `globals.css` line 125 | ~17 files via raw CSS class |
| `MobiGlasButton` React component | `mobiglas/MobiGlasButton.tsx` | ~3 files (component itself + imports) |
| `.mg-button-small` CSS class | `globals.css` line 923 | Used in Navigation, various forms |
| `.mg-button-secondary` CSS class | `globals.css` line 1125 | Mission template components |
| `.mg-btn-icon` CSS class | `globals.css` line 1144 | Icon-only buttons |

The `MobiGlasButton` component wraps `motion.button` and adds the `.mg-button` CSS class, creating a layered but underutilized abstraction.

**Corner accent implementations (4 competing patterns):**

| Implementation | Location | Files |
|----------------|----------|-------|
| `CornerAccents` React component | `mobiglas/CornerAccents.tsx` | Mostly unused outside its own file |
| Inline corner divs in `MobiGlasContainer` | `MobiGlasContainer.tsx` lines 80-84 | Used when `withCorners=true` |
| Inline corner divs in `MobiGlasPanel` | `MobiGlasPanel.tsx` lines 121-135 | Used when `cornerAccents=true` |
| Inline corner divs in `MobiGlasInput` | `MobiGlasInput.tsx` lines 57-62 | Always rendered when `cornerAccents=true` |
| Inline corner divs in `layout.tsx` | `layout.tsx` lines 51-54 | Fixed global corner brackets |
| Inline corner divs in other components | `EventCarousel`, `LocationSection`, `AuthError`, `dashboard/page.tsx` | Ad-hoc implementations |

### Page Rendering: Almost All Client-Side

Only 1 of 33 page files uses `"use client"` directive explicitly (the root `page.tsx`), but most dashboard pages are effectively client-rendered because they import client components that use `useSession`, `useState`, `useEffect`, etc. The pattern is:

```tsx
// Dashboard pages: "use client" at top, useSession() for auth, client-side fetch for data
'use client';
const { data: session, status } = useSession();
// ... useEffect to fetch data after auth check
```

This means:
- No server-side data fetching
- Auth is checked client-side (flash of loading state)
- Pages are not cacheable at the CDN layer
- SEO is not a concern for dashboard pages (auth-gated), but public pages could benefit from SSR

---

## Recommended Architecture

### Phase 1: Foundation (DB + Security Infrastructure)

#### 1A. MongoDB Connection Consolidation

**Merge `mongodb.ts` and `mongodb-client.ts` into a single unified module.**

```
BEFORE:                              AFTER:
mongodb.ts ─── connectToDatabase()   mongodb.ts ─── getDb()
     │         (returns {client,db})      │         (returns Db instance)
     │                                    │
mongodb-client.ts ─── connectToDatabase() │─── getCollection(name)
     │                 getUserById()       │    (returns Collection)
     │                 getUserByEmail()    │
     │                 etc.               │─── ensureConnection()
                                          │    (health check + reconnect)
                                          │
                                     mongodb-client.ts ─── getUserById()
                                          │                getUserByEmail()
                                          │                etc.
                                          │  (imports getDb() from mongodb.ts)
                                          │  (no longer creates its own client)
```

**Strategy:** Keep `mongodb.ts` as the sole connection manager. Refactor `mongodb-client.ts` to import and use the connection from `mongodb.ts` rather than creating its own. This halves connection pool usage and eliminates the dual-connection ambiguity.

**Key decisions:**
- The `clientPromise` pattern in `mongodb.ts` (with dev HMR caching via `globalThis`) is the correct Next.js pattern. Keep it.
- `mongodb-client.ts` becomes a CRUD helper layer that gets its `Db` instance from `mongodb.ts`, not its own `MongoClient`
- Storage modules that import both connectors (`escort-request-storage.ts`, `mission-storage.ts`, `storage-utils.ts`) must be updated to use only the unified module
- Pool settings: reduce `maxPoolSize` from 100 to 50 (single pool now, not doubled)

**Files changed:**
- `src/lib/mongodb.ts` -- add `getDb()` convenience export, reduce pool size
- `src/lib/mongodb-client.ts` -- remove `MongoClient` creation, import from `mongodb.ts`
- `src/lib/escort-request-storage.ts` -- remove dual imports
- `src/lib/mission-storage.ts` -- remove dual imports
- `src/lib/storage-utils.ts` -- remove dual imports

#### 1B. Rate Limiting

**Replace in-memory rate limiter with a solution appropriate for deployment scale.**

Two viable approaches depending on infrastructure appetite:

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **MongoDB-backed rate limiter** | No new infrastructure, uses existing DB | Adds DB load per request, less performant than Redis | Single-instance Azure App Service deployment |
| **Upstash Redis** | Purpose-built for edge/serverless, sub-ms latency, free tier generous | New dependency, new service to manage | Multi-instance or Vercel deployment |

**Recommendation:** MongoDB-backed rate limiter. AydoCorp runs on a single Azure App Service instance. Adding Redis for a rate limiter is over-engineering for the current scale. A simple MongoDB collection with TTL index handles this cleanly.

```typescript
// src/lib/rate-limiter.ts (new implementation)
// Uses MongoDB 'rateLimits' collection with TTL index
// Schema: { key: string, count: number, windowStart: Date }
// TTL index on windowStart removes expired entries automatically
```

**Integration point:** Apply in middleware.ts for API routes, not per-route. This ensures consistent coverage across all 45 API routes.

#### 1C. Input Sanitization Standardization

**Migrate all manual validation to Zod schemas.**

Currently 14 files use Zod, while routes like `missions`, `escort-requests`, and `mission-templates` use hand-rolled validation functions. The hand-rolled validators:
- Don't sanitize input (no HTML stripping, no length enforcement on string content)
- Don't provide consistent error shapes
- Don't validate nested object structures deeply

**Strategy:**
1. Create a shared validation utilities module: `src/lib/validation.ts`
2. Move all Zod schemas to colocated `*.schema.ts` files next to their route handlers
3. Add a `sanitizeString()` helper that strips HTML tags and trims whitespace
4. Replace all hand-rolled validators with Zod equivalents

**Important:** The `getUserByEmail` function in `mongodb-client.ts` uses `new RegExp('^${email}$', 'i')` for case-insensitive lookup -- this is a **NoSQL injection vector** because `email` is not escaped for regex special characters. A crafted email like `admin@corp.com|.*` would match unintended records. Fix: use `{ emailLower: email.toLowerCase() }` exclusively (the normalized field already exists in the schema).

### Phase 2: Security Headers and Auth

#### 2A. CSP Headers via Middleware

**Implement CSP in `middleware.ts`, not `next.config.js`**, because:
1. Nonces require dynamic generation per request (middleware runs per request)
2. The middleware already exists and runs on the correct path matcher
3. CSP in `next.config.js` headers is static and cannot include nonces

**CSP Policy for this application:**

```
default-src 'self';
script-src 'self' 'nonce-{DYNAMIC}';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://cdn.fleetyards.net https://images.aydocorp.space https://aydocorp.space https://cdn.discordapp.com;
font-src 'self';
connect-src 'self' https://discord.com https://cdn.fleetyards.net;
frame-ancestors 'self';
base-uri 'self';
form-action 'self';
```

**Why `'unsafe-inline'` for styles:** framer-motion injects inline styles at runtime for all animations. There is no practical way to nonce every framer-motion style injection. Tailwind also generates inline styles via `style={}` props. This is an accepted trade-off -- the real attack vector (XSS via script injection) is blocked by the strict `script-src` policy.

**Implementation notes:**
- Generate nonce using `crypto.randomUUID()` (available in Edge runtime)
- Set nonce on request headers via `x-nonce` for components to read
- Next.js automatically extracts nonce from CSP header and applies to script tags
- Development mode must include `'unsafe-eval'` for React DevTools

#### 2B. Auth Middleware Expansion

**Extend middleware to cover API routes with session verification.**

Current state: middleware excludes `/api/*` entirely. Each API route independently calls `getServerSession(authOptions)`. Problems:
1. Some routes may forget the check
2. Inconsistent error responses (some return 401, some return different shapes)
3. No centralized audit trail

**Strategy:** Add API auth to middleware, but with nuanced exclusions:

```typescript
// Routes that must remain public (no auth)
const publicApiRoutes = [
  '/api/auth',           // NextAuth endpoints
  '/api/contact',        // Public contact form
  '/api/ships',          // Public ship database (read-only)
  '/api/cron',           // Cron endpoints (use bearer token auth, not session)
  '/api/storage-status', // Health check
  '/api/diagnostic',     // Health check
];
```

**Decision:** Keep the per-route `getServerSession` calls as a defense-in-depth measure, but add middleware-level auth as the primary gate. This follows the principle of "fail closed" -- if middleware is bypassed, per-route checks still protect.

### Phase 3: Performance Optimization

#### 3A. framer-motion Bundle Reduction (LazyMotion)

**Migrate from `motion` components to `m` components with `LazyMotion` provider.**

Current bundle impact: 109 files import `{ motion }` from `framer-motion`, each bundling ~34kb of animation features. With `LazyMotion` + `m`, the initial cost drops to ~4.6kb, with features loaded asynchronously.

**Implementation:**

```tsx
// src/app/layout.tsx (or a dedicated MotionProvider)
import { LazyMotion, domAnimation } from 'framer-motion';

// Wrap the app:
<LazyMotion features={domAnimation} strict>
  {children}
</LazyMotion>
```

Then in every component file:
```tsx
// BEFORE:
import { motion } from 'framer-motion';
<motion.div animate={{...}} />

// AFTER:
import { m } from 'framer-motion';
<m.div animate={{...}} />
```

**Scale of change:** 109 files need their imports updated. This is a mechanical find-and-replace, but must be tested because:
1. `m` components require a `LazyMotion` ancestor -- if any component renders outside the provider, it will throw
2. Components using `motion` from `MotionProps` type exports need type import updates
3. The `MobiGlasButton`, `MobiGlasContainer`, `MobiGlasPanel`, `CornerAccents` components all use `motion` -- these are the foundation; update them first

**Dependency on design system consolidation:** Must be done AFTER design system changes, because if components are being merged/refactored, doing a motion migration first creates wasted work.

**Package version note:** The app uses `framer-motion@^10.16.4`. The library has since been renamed to `motion` (package name). Upgrading to the `motion` package is a separate concern -- `LazyMotion` works with `framer-motion@10.x`. Do NOT conflate the LazyMotion optimization with a package upgrade.

#### 3B. Cache Header Tuning

**Current cache headers are too conservative.**

| Resource | Current | Recommended | Rationale |
|----------|---------|-------------|-----------|
| `/_next/static/*` | `max-age=3600` (1 hour) | `max-age=31536000, immutable` | Next.js static assets are content-hashed; they NEVER change for the same URL. 1 hour is absurdly short. |
| `/images/*` | `max-age=3600` (1 hour) | `max-age=86400, stale-while-revalidate=604800` | Site images change infrequently. 1 day with 7-day stale is reasonable. |
| `/assets/*` | `max-age=3600` (1 hour) | `max-age=86400, stale-while-revalidate=604800` | Same as images. |
| `/fonts/*` | `max-age=3600` (1 hour) | `max-age=31536000, immutable` | Fonts never change. |
| `/_next/image` | `max-age=604800` (7 days) | Keep as-is | Already reasonable for optimized images. |

**The `/_next/static` fix alone is the highest-impact single change.** Next.js generates hashed filenames like `_next/static/chunks/app/page-abc123.js`. The hash changes when content changes. Setting `max-age=3600` means every returning visitor re-validates these files every hour for no reason.

#### 3C. SSR Conversion for Public Pages

**Convert public pages from client-side rendering to server-side rendering.**

Currently, even the home page (`src/app/page.tsx`) is a client component:

```tsx
"use client";
import { useSession } from 'next-auth/react';
export default function Home() {
  const { data: session, status } = useSession();
  // ... client-side rendering
}
```

This is unnecessary for the initial render. The session check can happen server-side.

**Pages suitable for SSR conversion:**

| Page | Current | SSR Approach |
|------|---------|--------------|
| `/` (home) | `"use client"` + `useSession` | Server Component + `getServerSession()` + pass `isLoggedIn` as prop |
| `/about` | Server Component (already correct) | No change needed |
| `/services` | Server Component (already correct) | No change needed |
| `/join` | Server Component (already correct) | No change needed |
| `/contact` | Server Component (already correct) | No change needed |
| `/dashboard/*` | `"use client"` (auth required) | Keep client -- auth-gated pages need client interactivity |

**Only the home page is a candidate for SSR conversion.** The dashboard pages legitimately need client-side rendering for interactive features. The public marketing pages (`about`, `services`, `join`, `contact`) are already server components -- they don't have `"use client"`.

**Implementation for home page:**

```tsx
// src/app/page.tsx (AFTER)
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import HomeContent from '@/components/HomeContent';

export default async function Home() {
  const session = await getServerSession(authOptions);
  return (
    <div className="container mx-auto px-4 py-12">
      <HomeContent isLoggedIn={!!session} userName={session?.user?.name || ''} />
    </div>
  );
}
```

This eliminates the loading spinner flash and makes the home page cacheable.

### Phase 4: Design System Consolidation

#### 4A. Button Consolidation

**Eliminate 4 competing button patterns. Canonicalize to `MobiGlasButton` component + CSS utility classes.**

**Target architecture:**

```
MobiGlasButton (React component)
  ├── variant="primary"    (replaces .mg-button CSS class)
  ├── variant="secondary"  (replaces .mg-button-secondary CSS class)
  ├── variant="ghost"      (new)
  ├── variant="danger"     (new)
  ├── variant="outline"    (new)
  ├── size="sm"            (replaces .mg-button-small CSS class)
  ├── size="md"            (default)
  ├── size="lg"            (new)
  └── size="icon"          (replaces .mg-btn-icon CSS class)
```

**Migration path:**
1. Ensure `MobiGlasButton` supports all current use cases via its props
2. Migrate files using raw `.mg-button` class to `<MobiGlasButton>`
3. Migrate `.mg-button-small` usages to `<MobiGlasButton size="sm">`
4. Migrate `.mg-button-secondary` usages to `<MobiGlasButton variant="secondary">`
5. Migrate `.mg-btn-icon` usages to `<MobiGlasButton size="icon">`
6. Remove deprecated CSS classes from `globals.css` (keep as deprecated aliases initially)

**Problem with current MobiGlasButton:** It wraps `motion.button`, which means every button in the app loads the full framer-motion bundle. After LazyMotion migration, this becomes `m.button`, which is fine. But some buttons don't need animation at all. Consider adding a `withMotion` prop (default `true`) that conditionally renders `<m.button>` vs `<button>`.

#### 4B. Corner Accent Consolidation

**Consolidate 4+ corner accent patterns into the existing `CornerAccents` component.**

The `CornerAccents` component already has a good API:
- `size`: xs/sm/md/lg/xl
- `variant`: simple/detailed/animated
- `color`: primary/secondary/accent/success/warning
- `opacity`: low/medium/high
- `withDots`: boolean

But it's barely used. Instead, every component re-implements corner accents inline:

```tsx
// This pattern appears in MobiGlasContainer, MobiGlasPanel, MobiGlasInput, layout.tsx, etc.
<div className="absolute top-0 left-0 w-5 h-5 border-t border-l border-[rgba(var(--mg-primary),0.6)]"></div>
<div className="absolute top-0 right-0 w-5 h-5 border-t border-r border-[rgba(var(--mg-primary),0.6)]"></div>
<div className="absolute bottom-0 left-0 w-5 h-5 border-b border-l border-[rgba(var(--mg-primary),0.6)]"></div>
<div className="absolute bottom-0 right-0 w-5 h-5 border-b border-r border-[rgba(var(--mg-primary),0.6)]"></div>
```

**Migration strategy:**
1. Update `CornerAccents` to support all current use cases (check if `xl` size covers the `w-12 h-12` in layout.tsx, add `w-[6px] h-[6px]` size for MobiGlasInput)
2. Replace inline corner divs in `MobiGlasContainer`, `MobiGlasPanel`, `MobiGlasInput` with `<CornerAccents />`
3. Replace ad-hoc corner divs in `EventCarousel`, `LocationSection`, `AuthError`, `dashboard/page.tsx`
4. The `layout.tsx` global corners are fixed/decorative -- these can use `CornerAccents` with appropriate size/opacity
5. Remove the `animated` variant's dependency on `motion` (use CSS animations instead) to reduce framer-motion coupling

#### 4C. CSS Variable and Class Cleanup

**Audit and deduplicate CSS classes in `globals.css`.**

Current `globals.css` is 1261 lines with several issues:
- Duplicate `.mg-panel-grid` definitions (lines 1066-1072 and 1178-1184)
- Duplicate `.mg-flicker` keyframe definitions (lines 646-662 and 1086-1100)
- Many animation utility classes that could be Tailwind config extensions
- `!important` on `.mg-button` background (line 126) -- should be removed after consolidation

**Strategy:**
1. Deduplicate `.mg-panel-grid` -- keep the one with better opacity values
2. Deduplicate `@keyframes mg-flicker` / `text-flicker` -- keep one
3. Move animation utilities to `tailwind.config.js` `extend.animation` and `extend.keyframes`
4. Remove `!important` from `.mg-button` after confirming no specificity conflicts
5. Consider extracting MobiGlas-specific styles to a `mobiglas.css` module imported in `globals.css`

---

## Data Flow Changes

### Rate Limiting Flow (New)

```
Request → middleware.ts
           │
           ├── Is API route? ──→ Check rate limit (MongoDB lookup)
           │                      │
           │                      ├── Under limit → Increment counter → Continue
           │                      │
           │                      └── Over limit → Return 429 response
           │
           ├── Is protected route? ──→ Check auth (existing flow)
           │
           └── Is public route? ──→ Apply CSP headers → Continue
```

### CSP Header Flow (New)

```
Request → middleware.ts
           │
           ├── Generate nonce (crypto.randomUUID())
           │
           ├── Set x-nonce request header
           │
           ├── Construct CSP string with nonce
           │
           └── Set Content-Security-Policy response header
                │
                └── Next.js auto-extracts nonce for script tags
```

### MongoDB Connection Flow (After Consolidation)

```
BEFORE:
  storage-module-A → mongodb.ts → MongoClient #1 (pool: 100)
  storage-module-B → mongodb-client.ts → MongoClient #2 (pool: 100)
  storage-module-C → BOTH! → Both clients

AFTER:
  mongodb.ts → MongoClient (pool: 50, singleton)
       │
       ├── getDb() → returns Db instance
       │
       └── getCollection(name) → returns Collection
            │
  mongodb-client.ts → imports getDb() from mongodb.ts
       │                (no longer creates its own MongoClient)
       │
       ├── getUserById() → uses getDb()
       ├── getUserByEmail() → uses getDb()
       └── etc.
            │
  All storage modules → import from either module (both use same client)
```

---

## Component Boundaries (Final State)

| Component | Responsibility | Files Modified | New Files |
|-----------|---------------|----------------|-----------|
| **Unified MongoDB connector** | Single connection pool, health checks, reconnect logic | `mongodb.ts` (modified), `mongodb-client.ts` (refactored) | None |
| **Rate limiter** | MongoDB-backed sliding window rate limiting | `rate-limiter.ts` (rewritten) | `src/lib/rate-limiter.ts` |
| **Security middleware** | CSP nonce generation, rate limit checks, expanded auth | `middleware.ts` (expanded) | None |
| **Validation utilities** | Shared sanitization helpers, schema patterns | None | `src/lib/validation.ts` |
| **MobiGlasButton** | Canonical button component, all variants | `MobiGlasButton.tsx` (enhanced) | None |
| **CornerAccents** | Canonical corner decoration, all sizes | `CornerAccents.tsx` (enhanced) | None |
| **LazyMotion provider** | Async feature loading for framer-motion | `layout.tsx` or `providers.tsx` (modified) | None |
| **Cache headers** | Optimized static asset caching | `next.config.js` (modified) | None |

---

## Integration Points with Existing Architecture

### Middleware Integration

The existing `middleware.ts` is the primary integration surface. Currently it only checks auth for 3 route prefixes. It must be expanded to:

1. **All routes:** Generate CSP nonce, set CSP headers
2. **API routes:** Apply rate limiting (if not in public/cron exceptions list)
3. **Protected routes:** Auth check (existing, expand list)

**Risk:** The middleware matcher currently excludes API routes. This must be changed to include API routes while still excluding static assets. New matcher:

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|assets|fonts|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.webp|.*\\.ico|.*\\.woff|.*\\.woff2|.*\\.ttf|.*\\.otf).*)',
  ],
};
```

This includes API routes while still excluding static files.

### Storage Layer Integration

The DB consolidation touches the foundational storage layer. Every storage module in `src/lib/` is affected:
- `user-storage.ts` -- already uses `mongodb-client.ts`; will continue to work after refactor
- `ship-storage.ts` -- imports `connectToDatabase` from `mongodb-client.ts`; must update import
- `operation-storage.ts` -- imports from `mongodb-client.ts`; will continue to work
- `mission-storage.ts` -- imports from BOTH; must clean up to use unified module
- `escort-request-storage.ts` -- imports from BOTH; must clean up
- `planned-mission-storage.ts` -- imports from `mongodb.ts`; will continue to work
- `mission-template-storage.ts` -- imports from `mongodb.ts`; will continue to work
- `finance.ts` -- imports from `mongodb.ts`; will continue to work
- `storage-utils.ts` -- imports from BOTH; must clean up

### Design System Integration

The MobiGlas components are used across 30+ component files. Changes to `MobiGlasButton`, `CornerAccents`, `MobiGlasPanel`, and `MobiGlasContainer` propagate to every file that imports them. The consolidation must be done component-by-component with testing after each one.

### LazyMotion + Layout Integration

The `LazyMotion` provider must wrap all routes. The existing `src/app/layout.tsx` already has a `<Providers>` wrapper component. The `LazyMotion` provider should be added inside `Providers`:

```tsx
// src/components/providers.tsx
import { LazyMotion, domAnimation } from 'framer-motion';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </SessionProvider>
  );
}
```

The `strict` prop ensures any `motion` usage (vs `m`) throws in development, catching missed migrations.

---

## Patterns to Follow

### Pattern 1: Unified Error Responses

**What:** All API routes return errors in the same shape.
**When:** Every error response from any API route.
**Example:**
```typescript
// src/lib/api-utils.ts
export function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}
```

### Pattern 2: Schema-First API Routes

**What:** Every API route that accepts input defines a Zod schema before processing.
**When:** All POST/PUT/PATCH/DELETE handlers.
**Example:**
```typescript
const schema = z.object({ /* ... */ });
const result = schema.safeParse(await request.json());
if (!result.success) return errorResponse('Validation failed', 400, result.error.flatten());
```

### Pattern 3: Component Composition over Props

**What:** Use composition patterns instead of adding more boolean props.
**When:** Building UI with MobiGlas components.
**Example:**
```tsx
// BEFORE: prop explosion
<MobiGlasPanel withScanline withHologram withCircuitBg cornerAccents cornerSize="lg" />

// AFTER: composition
<MobiGlasPanel>
  <ScanlineEffect />
  <CornerAccents size="lg" />
  {children}
</MobiGlasPanel>
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Inline Corner Accent Divs

**What:** Copy-pasting 4 corner `<div>` elements instead of using `<CornerAccents />`
**Why bad:** 8 files already have divergent corner implementations with different sizes, opacities, and colors
**Instead:** Use `<CornerAccents size="md" color="primary" opacity="medium" />`

### Anti-Pattern 2: Direct `motion` Import After LazyMotion

**What:** Using `import { motion } from 'framer-motion'` instead of `import { m } from 'framer-motion'`
**Why bad:** Defeats the purpose of LazyMotion; bundles full 34kb feature set
**Instead:** Use `m` components exclusively; the `strict` prop on `LazyMotion` catches this in dev

### Anti-Pattern 3: Per-Route Rate Limiting

**What:** Implementing rate limiting in individual API route handlers
**Why bad:** Inconsistent coverage, code duplication, missed routes
**Instead:** Centralize in middleware.ts with route-specific limits configured in a lookup table

### Anti-Pattern 4: Using Both MongoDB Modules

**What:** Importing from both `mongodb.ts` and `mongodb-client.ts` in the same file
**Why bad:** Creates ambiguity about which connection is used, potential for connection pool exhaustion
**Instead:** After consolidation, both modules share one client. Import from whichever has the API you need.

---

## Build Order (Dependencies Considered)

```
Phase 1: Foundation (no dependencies between items, can parallelize)
  ├── 1A: MongoDB connection consolidation
  ├── 1B: Rate limiter rewrite (MongoDB-backed)
  └── 1C: Input sanitization standardization (Zod everywhere)

Phase 2: Security Headers & Auth (depends on 1A for rate limiter DB access, 1B for rate limit integration)
  ├── 2A: CSP headers in middleware
  └── 2B: Auth middleware expansion

Phase 3: Design System (independent of Phases 1-2, can start in parallel)
  ├── 3A: Button consolidation (MobiGlasButton canonical)
  ├── 3B: Corner accent consolidation (CornerAccents canonical)
  └── 3C: CSS variable and class cleanup

Phase 4: Performance (depends on Phase 3 for LazyMotion migration)
  ├── 4A: LazyMotion migration (109 files, mechanical)
  ├── 4B: Cache header tuning (independent, can do anytime)
  └── 4C: SSR conversion for home page (depends on 4A)
```

**Parallelization opportunities:**
- Phases 1 and 3 can run in parallel (no dependencies between them)
- Within Phase 1, items 1A and 1C can run in parallel; 1B depends on 1A completion
- Within Phase 3, items 3A, 3B, 3C can be done sequentially (same developer) or in parallel (different developers)
- Phase 4B (cache headers) is independent and can be done at any time

**Strict ordering constraints:**
- Phase 2 MUST follow Phase 1 (rate limiter needs consolidated DB)
- Phase 4A MUST follow Phase 3 (don't migrate motion to m while components are being restructured)
- Phase 4C MUST follow Phase 4A (SSR pages need m components, not motion)

---

## Scalability Considerations

| Concern | Current (Single Instance) | At 3+ Instances | At Edge/CDN |
|---------|--------------------------|-----------------|-------------|
| Rate limiting | MongoDB-backed is fine | Must switch to Redis (Upstash) | Upstash Edge required |
| Sessions | JWT (stateless, works anywhere) | No change needed | No change needed |
| DB connections | 1 pool, 50 connections | 3 pools, 150 total -- may need to reduce per-instance pool | Consider connection pooling proxy |
| CSP nonces | Generated per-request in middleware | Works identically across instances | Works at edge |
| Static assets | Cache headers apply to reverse proxy | Same headers, CDN handles caching | Same headers |

---

## Sources

- [Next.js CSP Guide](https://nextjs.org/docs/app/guides/content-security-policy) -- Official CSP implementation guide
- [Motion LazyMotion Docs](https://motion.dev/docs/react-lazy-motion) -- LazyMotion API and bundle reduction
- [Motion Bundle Size Reduction](https://motion.dev/docs/react-reduce-bundle-size) -- m vs motion component comparison
- [Upstash Rate Limiting](https://upstash.com/blog/nextjs-ratelimiting) -- Redis-based rate limiting for Next.js
- [Next.js Cache Headers](https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers) -- Header configuration reference
- [Next.js 15 CSP Production Issue](https://github.com/vercel/next.js/discussions/80997) -- Known issue with CSP in production builds
