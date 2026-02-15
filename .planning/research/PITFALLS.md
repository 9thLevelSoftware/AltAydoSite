# Domain Pitfalls: Security Hardening, Dependency Upgrades, and Design System Consolidation

**Domain:** Production Next.js app modernization -- security hardening, Next.js 15.3 to 15.5 upgrade, framer-motion v10 to motion v12 migration, Server Component conversion, design system consolidation
**Researched:** 2026-02-15
**Overall Confidence:** HIGH (codebase analysis of 109 framer-motion files, 50+ auth-dependent files, 530+ MobiGlas CSS references, 97 files with hand-coded MG patterns; verified against official Next.js 15.5 release notes, Motion upgrade guide, CVE-2025-29927 disclosure, and Next.js CSP documentation)

---

## Critical Pitfalls

Mistakes that cause auth bypass, broken pages, or require full rollbacks across the 69-page app.

---

### Pitfall 1: CVE-2025-29927 -- Middleware Authorization Bypass on Current Next.js Version

**What goes wrong:** The app currently runs Next.js 15.3.3. CVE-2025-29927 disclosed that all Next.js versions before 15.2.3 (and select later versions) allowed attackers to bypass middleware by injecting an `x-middleware-subrequest` internal header. The current middleware at `src/middleware.ts` uses `getToken()` from `next-auth/jwt` to protect `/dashboard`, `/userprofile`, and `/admin` routes. If the fix is incomplete or headers are not stripped, an attacker can access all protected routes without authentication.

**Why it happens:** Next.js internally uses `x-middleware-subrequest` to prevent infinite middleware loops on subrequests. Versions prior to the fix did not strip this header from external requests, so any HTTP client could set it and skip middleware entirely. The fix (in 15.2.3+) strips internal headers and validates against a random hex string.

**Consequences:** Complete auth bypass on all protected routes. Dashboard, user profiles, admin pages, fleet operations, finance tracker -- all exposed without login.

**Prevention:**
- Verify the installed Next.js version (15.3.3) includes the CVE fix by checking the changelog -- it does (15.2.3+ patched), but this must be re-verified after any upgrade.
- **Never rely solely on middleware for authorization.** Add `getServerSession()` checks in every API route and Server Component that serves sensitive data. Currently, the API routes already check `getServerSession(authOptions)` -- confirm coverage across all 35+ auth-dependent files.
- After upgrading to 15.5, explicitly test that the `x-middleware-subrequest` header is stripped from external requests.

**Detection:** Run `curl -H "x-middleware-subrequest: middleware" https://yoursite.com/dashboard` -- if it returns 200 instead of a redirect, the vulnerability is present.

**Phase mapping:** Security Hardening phase (do first, before any other changes).

**Confidence:** HIGH -- CVE-2025-29927 is well-documented by Datadog, JFrog, and NVD. The current version 15.3.3 should include the fix, but verification is required.

---

### Pitfall 2: CSP Nonce Implementation Forces All Pages to Dynamic Rendering

**What goes wrong:** Adding Content-Security-Policy with nonces to prevent inline script injection requires generating a fresh nonce per request. This forces every page to render dynamically (no SSG, no CDN caching of HTML). For a 69-page app with many static-eligible pages (about, join, services, contact), this eliminates static optimization and increases server load.

**Why it happens:** Next.js applies nonces during server-side rendering based on the CSP header in the request. Static pages are generated at build time when no request exists, so no nonce can be injected. Additionally, Next.js uses inline scripts during hydration (`__next_f.push([...])`) which get blocked by strict CSP unless you either use `'unsafe-inline'` (defeats the purpose) or nonces (requires dynamic rendering).

**Consequences:**
- All pages become dynamically rendered, increasing TTFB by 200-500ms per page.
- CDN caching becomes HTML-level ineffective (can still cache assets).
- Performance regression across the entire site, not just protected pages.

**Prevention:**
- **Use CSP without nonces for static pages.** Apply `'unsafe-inline'` for script-src only on truly static marketing pages, and nonce-based CSP only on authenticated pages.
- Alternatively, use `'strict-dynamic'` with a hash-based approach for static pages and nonce-based for dynamic pages.
- Set CSP headers in middleware selectively -- only add nonces to paths under `/dashboard/`, `/admin/`, `/userprofile/`, not to `/`, `/about/`, `/services/`, etc.
- The existing `next.config.js` `headers()` already sets X-Frame-Options, X-Content-Type-Options, and Referrer-Policy. CSP can be added there for static pages and in middleware for dynamic pages.

**Detection:** After implementation, check response headers on static pages. If `x-nextjs-cache: HIT` disappears from all pages, dynamic rendering has been forced globally.

**Phase mapping:** Security Hardening phase, but plan CSP strategy BEFORE implementing to avoid the all-dynamic trap.

**Confidence:** HIGH -- confirmed in Next.js 15 CSP documentation and GitHub discussion #80997.

---

### Pitfall 3: framer-motion to motion Package Rename Breaks 109 Files Simultaneously

**What goes wrong:** The migration from `framer-motion` (v10) to `motion` (v12) involves a package rename: all 109 files importing from `'framer-motion'` must change to `'motion/react'`. If done as a single commit, a single typo or missed file breaks the entire build. If done incrementally, having both packages installed simultaneously causes bundle duplication and potential version conflicts.

**Why it happens:** The Motion project rebranded from `framer-motion` to `motion` starting with v11. While `framer-motion` as a package still exists and re-exports from `motion`, it is deprecated and will stop receiving updates. The React API itself has no breaking changes between v10 and v12 -- the risk is entirely in the import path migration across 109 files.

**Consequences:**
- Build failure if any file still imports `'framer-motion'` after the old package is uninstalled.
- Bundle bloat if both `framer-motion` and `motion` are installed simultaneously (two copies of the same library).
- `MotionProps` type import changes from `'framer-motion'` to `'motion/react'` -- the `MobiGlasPanel` component uses `MotionProps` explicitly and will fail to type-check.

**Prevention:**
- Do the migration as a single atomic commit using a find-and-replace operation:
  1. `npm install motion@latest`
  2. Replace all `from 'framer-motion'` with `from 'motion/react'` across all 109 files.
  3. `npm uninstall framer-motion`
  4. Run `npm run type-check && npm run build` to verify.
- Verify these specific import patterns exist in the codebase and must all be updated:
  - `import { motion } from 'framer-motion'` (most files)
  - `import { motion, AnimatePresence } from 'framer-motion'` (20+ files)
  - `import { motion, MotionProps } from 'framer-motion'` (MobiGlasPanel.tsx)
- **Do NOT try to migrate files incrementally** -- the "both packages installed" state is a trap.

**Detection:** `grep -r "from 'framer-motion'" src/` returns 0 results after migration. `npm ls framer-motion` returns empty.

**Phase mapping:** framer-motion Migration phase (standalone, do NOT combine with other refactoring).

**Confidence:** HIGH -- verified from Motion upgrade guide and codebase grep showing exact import patterns.

---

### Pitfall 4: Removing 'use client' from Components That Use Hooks or framer-motion

**What goes wrong:** Attempting to convert a component from Client to Server Component by removing `'use client'` fails silently at build time or crashes at runtime if the component (or any of its children) uses `useState`, `useEffect`, `useRef`, `framer-motion`, `useSession`, or any other client-only API. With 109 files using framer-motion and 50+ files using session hooks, the blast radius is enormous.

**Why it happens:** In Next.js App Router, all components are Server Components by default. The `'use client'` directive marks the boundary. Any component that uses React hooks, browser APIs, or client-side libraries (framer-motion, next-auth `useSession`) MUST be a Client Component. Developers often think "server components are better" and try to remove `'use client'` without auditing every hook and import in the file.

**Consequences:**
- Build error: `You're importing a component that needs useState. It only works in a Client Component.`
- Runtime crash: `TypeError: Cannot read properties of null (reading 'useState')`
- Subtle bug: Component renders without animations on server, looks broken to users.

**Prevention:**
- **Do NOT attempt wholesale conversion.** Audit each component individually for:
  1. React hooks (`useState`, `useEffect`, `useRef`, `useContext`, `useCallback`, `useMemo`)
  2. framer-motion imports (109 files -- ALL must remain client components)
  3. Event handlers (`onClick`, `onChange`, `onSubmit`, etc.)
  4. `useSession` or `useSearchParams` or `useRouter` (from `next/navigation`)
  5. Browser APIs (`window`, `document`, `localStorage`)
- The conversion candidates are components that ONLY render static JSX with no interactivity -- likely only layout wrappers and static content sections. In this codebase, that number is small because the MobiGlas design system uses framer-motion pervasively.
- Use the **composition pattern**: keep a Server Component as the parent, pass data down to a thin Client Component child that handles interactivity.
- **The realistic opportunity is moving data fetching UP to server components**, not eliminating client components. Create Server Component wrappers that fetch data and pass it as props to existing Client Components.

**Detection:** `npm run type-check` catches most violations, but some only surface at runtime (e.g., conditional hook usage). Run `npm run build` for full validation.

**Phase mapping:** Performance Optimization phase (after framer-motion migration, after security hardening).

**Confidence:** HIGH -- well-documented Next.js behavior, verified against codebase analysis showing 109 framer-motion files and hook usage patterns.

---

### Pitfall 5: In-Memory Rate Limiter Fails in Multi-Instance and Serverless Deployments

**What goes wrong:** The current rate limiter at `src/lib/rate-limiter.ts` uses an in-memory `Map<string, RateLimitEntry>` to track request counts. In production with Azure's standalone deployment (multiple instances), each instance has its own Map. An attacker can distribute requests across instances and bypass the rate limit entirely. The Map also resets on every deployment or instance restart.

**Why it happens:** The `apiRateLimiter` and `authRateLimiter` are module-level singletons. In a single-process Node.js server, this works. In containerized/scaled deployments (Azure App Service with multiple instances, or any serverless setup), each instance is a separate process with its own memory space.

**Consequences:**
- Rate limiting is effectively disabled in multi-instance production deployments.
- Auth brute-force protection (5 requests per 5 minutes) does not work across instances.
- Memory leak: the `Map` grows unbounded since there is no cleanup of expired entries.

**Prevention:**
- **Replace in-memory Map with MongoDB/Cosmos DB storage for rate limit state.** The app already has a MongoDB connection (`mongodb-client.ts`). Add a `rateLimits` collection with TTL index for automatic expiration.
- Alternatively, use Redis/Upstash for rate limiting if latency is critical (MongoDB adds ~5-10ms per rate limit check).
- Add a cleanup mechanism for expired entries -- the current implementation never removes entries from the Map.
- For the auth rate limiter specifically, consider using IP + handle combination as the key, not just IP, to prevent one user's failed attempts from locking out others on the same network.

**Detection:** In production, check `process.env.NODE_ENV === 'production'` and log a warning if the in-memory rate limiter is being used. Add monitoring for rate limit bypass attempts.

**Phase mapping:** Security Hardening phase (address alongside CSP and middleware hardening).

**Confidence:** HIGH -- directly verified from `src/lib/rate-limiter.ts` code analysis and confirmed by multiple sources on in-memory rate limiting failures in production.

---

### Pitfall 6: Dual MongoDB Client Modules Create Connection Pool Exhaustion

**What goes wrong:** The codebase has two separate MongoDB client modules -- `mongodb-client.ts` and `mongodb.ts` -- each creating their own `MongoClient` instances with `maxPoolSize: 100`. In production, this means up to 200 concurrent connections to Cosmos DB, which may exceed the connection limit and cause connection timeouts or "MongoServerSelectionError" failures.

**Why it happens:** `mongodb-client.ts` manages its own `client` variable with `ensureConnection()` retry logic, while `mongodb.ts` uses the Next.js-recommended `clientPromise` pattern with `global` caching for HMR. Both are imported by different parts of the app -- storage modules use one, page components may use the other. Consolidating them risks breaking either consumer pattern.

**Consequences:**
- Double connection pool usage in production (200 connections instead of 100).
- Connection pool exhaustion causes cascading failures across all DB-dependent features.
- Subtle bugs where one module's connection drops but the other's doesn't, creating inconsistent behavior.
- During the security hardening phase, adding rate limit storage to MongoDB adds a third pattern of DB access, worsening the problem.

**Prevention:**
- **Consolidate to a single MongoDB client module BEFORE adding new DB consumers** (rate limiting, session storage, etc.).
- Keep the `mongodb.ts` pattern (clientPromise with global caching) as the canonical approach.
- Migrate all `mongodb-client.ts` consumers to use the shared client.
- Reduce `maxPoolSize` to 50 after consolidation -- Cosmos DB vCore has connection limits per tier.
- Add connection pool monitoring with `client.on('connectionPoolCreated')` and `client.on('connectionPoolClosed')`.

**Detection:** In Azure Cosmos DB metrics, check "Total Connections" -- if it exceeds `maxPoolSize` consistently, you have multiple client instances.

**Phase mapping:** Technical debt phase (do BEFORE security hardening, since security adds more DB consumers).

**Confidence:** HIGH -- directly observed in codebase. Both files exist and both create `new MongoClient()`.

---

## Moderate Pitfalls

Mistakes that cause regressions, extra work, or delayed delivery but don't break the app catastrophically.

---

### Pitfall 7: Next.js 15.5 Deprecates `next lint` -- Build Pipeline Will Emit Warnings

**What goes wrong:** The app's `package.json` uses `"lint": "next lint"`. Next.js 15.5 deprecates the `next lint` command and will show deprecation warnings. In Next.js 16, `next lint` will be removed entirely. Additionally, `next build` currently runs a linting step automatically -- this auto-lint during builds will also be removed in Next.js 16.

**Why it happens:** Next.js is decoupling its linting from the framework, preferring direct ESLint CLI or Biome usage.

**Prevention:**
- After upgrading to 15.5, run the official codemod: `npx @next/codemod@latest next-lint-to-eslint-cli .`
- Update `package.json` scripts from `"lint": "next lint"` to `"lint": "eslint ."` (or `"lint": "eslint"` for ESLint v9+ flat config).
- The current `.eslintrc.js` config extends `next/core-web-vitals` and `next/typescript` -- these still work with direct ESLint CLI invocation.
- Ensure `eslint` and `eslint-config-next` are in `devDependencies` (they already are).

**Phase mapping:** Next.js Upgrade phase (handle during 15.3 to 15.5 migration).

**Confidence:** HIGH -- confirmed in official Next.js 15.5 release notes.

---

### Pitfall 8: `next/image` Quality Prop Deprecation Breaks Navigation Logo

**What goes wrong:** The Navigation component uses `quality={90}` on the logo image. In Next.js 15.5, this emits a deprecation warning. In Next.js 16, using `quality` values other than 75 without explicit `images.qualities` configuration will error.

**Why it happens:** Next.js is restricting the quality prop to reduce CDN cache variation. Each quality value creates a separate cached version of the image.

**Prevention:**
- Add `images: { qualities: [75, 90] }` to `next.config.js` during the upgrade.
- Or change the logo to `quality={75}` if the visual difference is negligible.
- Audit all `<Image>` components for `quality` props -- current codebase has only 1 instance in `Navigation.tsx`.

**Phase mapping:** Next.js Upgrade phase (trivial fix, handle alongside upgrade).

**Confidence:** HIGH -- confirmed in Next.js 15.5 release notes, verified single usage in codebase.

---

### Pitfall 9: Design System Consolidation Breaks Visual Consistency During Migration

**What goes wrong:** The codebase has 530+ references to MobiGlas CSS patterns (`border-[rgba(var(--mg-*` across 106 files) and two competing button implementations: `MobiGlasButton` (in `ui/mobiglas/`) and `HolographicButton` (in `fleet-ops/mission-planner/`). Consolidating these creates a period where some pages use the old hand-coded patterns and others use the new components, causing visual inconsistency across the site.

**Why it happens:** The MobiGlas design system grew organically. Components like `HolographicButton` were built independently for the mission planner with ~250 lines of custom framer-motion animation code. Meanwhile, `MobiGlasButton` in `ui/mobiglas/` serves a similar purpose with different styling. Pages directly use CSS patterns like `border-[rgba(var(--mg-primary),0.3)]` instead of going through components. Consolidating 530+ inline style references is not a "find and replace" -- each instance needs visual verification.

**Consequences:**
- Visual regression on pages migrated to new components while others still use old patterns.
- Users see inconsistent button styles, panel borders, and animation behaviors across different sections.
- QA burden is enormous -- every page must be visually inspected.

**Prevention:**
- **Build the consolidated design system components FIRST, then migrate page by page.** Never delete old CSS until all consumers are migrated.
- Create a visual regression testing setup (screenshots or Storybook) before starting.
- Migrate in sections: all dashboard pages first, then public pages, then fleet-ops.
- Keep both button components functional during migration -- deprecate `HolographicButton` only after all consumers use `MobiGlasButton`.
- The `ui/mobiglas/index.ts` barrel export already has the right structure -- add new consolidated components there.

**Phase mapping:** Design System phase (do AFTER framer-motion migration, since both buttons use framer-motion heavily and the import paths need to be stable first).

**Confidence:** HIGH -- directly verified from codebase analysis showing 530+ inline pattern references and two competing button components.

---

### Pitfall 10: framer-motion `AnimatePresence` Behavioral Changes in Rapid State Updates

**What goes wrong:** The codebase uses `AnimatePresence` in 20+ components (Navigation, HomeContent, SignupForm, ContactHero, ServicesSection, FleetBreakdownTable, etc.). Known bugs in framer-motion v10-v11 cause `AnimatePresence` to get stuck when state changes rapidly -- exit animations don't complete, leaving ghost elements in the DOM. The v12 upgrade may fix some of these but could also change timing behavior, causing subtle animation differences.

**Why it happens:** `AnimatePresence` tracks enter/exit states internally. When React state updates faster than animation duration, the component can lose track of which children are entering vs. exiting. The `mode="wait"` prop (used in `HomeContent.tsx` and `AboutSection.tsx`) is particularly susceptible because it queues exit before enter.

**Consequences:**
- Ghost elements remaining in DOM after rapid navigation.
- Exit animations not firing, causing abrupt layout shifts.
- Components appearing "stuck" in their exit state.

**Prevention:**
- After upgrading to motion v12, test all `AnimatePresence` instances with rapid state changes (fast clicking, quick navigation).
- Pay special attention to `mode="wait"` instances -- the codebase has at least 2: `HomeContent.tsx` line 727 and `AboutSection.tsx` line 85.
- Pay special attention to `layoutId` instances -- the codebase has 2: `AboutSection.tsx` (`activeTabLine`) and `FleetCompositionTabs.tsx` (`fleet-tab-indicator`). Layout animations interact with `AnimatePresence` and have had bugs around exit timing.
- Consider adding `onExitComplete` callbacks to detect stuck states and force cleanup.

**Phase mapping:** framer-motion Migration phase (test as part of migration validation).

**Confidence:** MEDIUM -- the bugs are documented in GitHub issues #2554 and #2023, but whether v12 resolves them is not confirmed. Test after migration.

---

### Pitfall 11: Security Middleware Expansion Conflicts with Existing Middleware Matcher

**What goes wrong:** The current middleware matcher excludes API routes (`/api/*`), static files, and images. Adding CSP headers, rate limiting, or additional auth checks in middleware requires expanding what the middleware handles. If the matcher is changed to include API routes (for rate limiting), it could interfere with NextAuth's `[...nextauth]` catch-all route, breaking login/logout flows.

**Why it happens:** The current matcher pattern `'/((?!api|_next/static|_next/image|...)*)'` explicitly excludes all API routes. Rate limiting in middleware would need to include `/api/*` routes. But NextAuth's internal routes (`/api/auth/callback/*`, `/api/auth/session`, etc.) make their own internal requests that would be rate-limited, potentially blocking legitimate auth flows.

**Consequences:**
- Login flow breaks because NextAuth callback requests are rate-limited.
- Discord OAuth flow fails because the callback URL hits the rate limiter.
- API routes that serve dashboard data get blocked during normal usage.

**Prevention:**
- **Keep rate limiting in individual API route handlers**, not in middleware. The current pattern of using `apiRateLimiter.isRateLimited(key)` in route files is correct architecturally.
- If middleware rate limiting is desired, add explicit exclusions for `/api/auth/*` routes.
- For CSP headers in middleware, keep the existing matcher pattern that excludes API routes -- CSP is only needed for HTML responses, not API JSON responses.
- Test the Discord OAuth flow end-to-end after any middleware changes.

**Phase mapping:** Security Hardening phase (careful design before implementation).

**Confidence:** HIGH -- directly observed in current middleware.ts matcher and NextAuth route structure.

---

### Pitfall 12: Node.js Middleware Runtime Change in 15.5 Alters getToken() Behavior

**What goes wrong:** Next.js 15.5 stabilizes Node.js middleware runtime (previously Edge-only). If the middleware is configured with `runtime: 'nodejs'` (either explicitly or as a future default), the `getToken()` function from `next-auth/jwt` may behave differently. The Edge runtime uses Web Crypto API for JWT verification, while Node.js runtime uses the `crypto` module. Token format or verification differences could cause intermittent auth failures.

**Why it happens:** NextAuth's `getToken()` implementation has different code paths for Edge vs Node.js runtimes. The current middleware runs on Edge runtime (the default). Switching to Node.js runtime may use different JWT verification, cookie handling, or request parsing. The `next-auth` package version 4.24.11 may not fully support the Node.js middleware runtime since it predates the stable release.

**Consequences:**
- Intermittent 403 errors on protected routes.
- Token validation failures after deployment but not in development.
- All authenticated users locked out if the runtime change affects `getToken()`.

**Prevention:**
- **Do NOT switch to `runtime: 'nodejs'` in middleware during the initial upgrade.** Keep the default Edge runtime.
- Test `getToken()` explicitly after the 15.5 upgrade with the default runtime before considering any runtime change.
- If Node.js middleware runtime is needed (for rate limiting with DB access), consider upgrading to `next-auth@5` (Auth.js) which has explicit Edge compatibility support -- but this is a separate major migration.

**Phase mapping:** Next.js Upgrade phase (preserve current runtime, test before changing).

**Confidence:** MEDIUM -- the interaction between next-auth v4 and Node.js middleware runtime is not well-documented. Test empirically.

---

## Minor Pitfalls

Mistakes that cause developer friction or minor UX issues.

---

### Pitfall 13: Turbopack CSS Ordering Differs from Webpack

**What goes wrong:** Next.js 15.5 introduces Turbopack builds in beta. If enabled (`next build --turbopack`), CSS files may be concatenated in a different order than Webpack. For a design system with 530+ inline style references and custom CSS variables (`--mg-primary`, `--mg-background`, etc.), ordering changes could cause styles to override differently, producing subtle visual bugs.

**Why it happens:** Turbopack uses different heuristics for side-effects handling, which changes CSS concatenation order.

**Prevention:**
- Do not enable Turbopack for production builds during this milestone.
- If exploring Turbopack in development, visually compare key pages between `next dev` (Webpack) and `next dev --turbopack` before committing.
- The CSS variable approach used by the MobiGlas design system is less susceptible to ordering issues than class-based overrides, but verify.

**Phase mapping:** Next.js Upgrade phase (informational, do not enable Turbopack yet).

**Confidence:** HIGH -- documented in Next.js 15.5 release notes as a known difference.

---

### Pitfall 14: framer-motion MotionValue Velocity Calculation Change

**What goes wrong:** From v11 onward, subsequent value updates within synchronous blocks of code are no longer considered part of a MotionValue's velocity calculations. Components using `useMotionValue` or `useSpring` for gesture-driven animations may feel "different" after the upgrade.

**Why it happens:** The Motion team changed velocity tracking to prevent unrealistic velocity spikes from synchronous batched updates.

**Prevention:**
- Search the codebase for `useMotionValue`, `useSpring`, `useTransform` -- these are the affected APIs.
- Current codebase grep shows no direct usage of these hooks, so this is LOW risk for this project.
- The `HolographicButton` and `EventCarousel` use `motion.div` with `animate` props (declarative) rather than imperative motion values, so they are unaffected.

**Phase mapping:** framer-motion Migration phase (verify, likely no action needed).

**Confidence:** MEDIUM -- the API change is documented, but this codebase appears to not use the affected APIs.

---

### Pitfall 15: Props Serialization Boundary Errors in Server/Client Component Composition

**What goes wrong:** When wrapping existing Client Components in new Server Component data-fetching parents, props passed across the boundary must be serializable. Functions, classes, Dates, Maps, Sets, and Symbols cannot be passed from Server to Client Components. Some components may receive callback functions or complex objects as props that work fine when both parent and child are Client Components but fail at the serialization boundary.

**Why it happens:** React Server Components serialize props to JSON when passing from server to client. Non-serializable values cause runtime errors.

**Prevention:**
- Before converting a parent component to Server Component, audit all props passed to its Client Component children.
- Common violations: `onClick` handlers passed as props (must stay in client), Date objects (serialize to string), and MongoDB ObjectId instances (not serializable).
- The pattern is: Server Component fetches data, serializes to plain objects, passes to Client Component which handles interactivity.

**Phase mapping:** Performance Optimization phase (when implementing Server Component wrappers).

**Confidence:** HIGH -- fundamental React Server Components constraint, well-documented.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|---|---|---|---|
| **Security Hardening** | CSP nonces force all pages dynamic (Pitfall 2) | Split CSP strategy: hash-based for static, nonce-based for dynamic pages only | Critical |
| **Security Hardening** | In-memory rate limiter ineffective in production (Pitfall 5) | Move to MongoDB-backed rate limiting before hardening | Critical |
| **Security Hardening** | Middleware expansion breaks NextAuth (Pitfall 11) | Keep rate limiting in route handlers, not middleware | Moderate |
| **MongoDB Consolidation** | Dual client modules (Pitfall 6) | Consolidate BEFORE adding new DB consumers | Critical |
| **Next.js 15.3 to 15.5** | `next lint` deprecation (Pitfall 7) | Run codemod during upgrade | Moderate |
| **Next.js 15.3 to 15.5** | Image quality prop deprecation (Pitfall 8) | Add `images.qualities` config | Minor |
| **Next.js 15.3 to 15.5** | Middleware runtime change risk (Pitfall 12) | Do NOT change runtime during upgrade | Moderate |
| **Next.js 15.3 to 15.5** | Turbopack CSS ordering (Pitfall 13) | Do not enable Turbopack for production yet | Minor |
| **framer-motion Migration** | 109-file import rename (Pitfall 3) | Single atomic commit with find-and-replace | Critical |
| **framer-motion Migration** | AnimatePresence behavioral changes (Pitfall 10) | Test all 20+ AnimatePresence instances | Moderate |
| **framer-motion Migration** | MotionValue velocity change (Pitfall 14) | Verify no affected APIs used (likely clean) | Minor |
| **Server Component Conversion** | Removing 'use client' from hook-using components (Pitfall 4) | Audit each component, convert only pure-render wrappers | Critical |
| **Server Component Conversion** | Props serialization boundary (Pitfall 15) | Audit props before conversion | Moderate |
| **Design System Consolidation** | Visual inconsistency during migration (Pitfall 9) | Build new components first, migrate page-by-page | Moderate |

---

## "Looks Done But Isn't" Checklist

These items appear complete after initial implementation but have hidden failure modes.

- [ ] **CSP headers set** -- but did you test that `__next_f.push()` inline scripts still work? Next.js hydration uses inline scripts that CSP blocks.
- [ ] **Rate limiter moved to DB** -- but did you add TTL indexes for auto-cleanup? Without them, the rate limit collection grows unbounded.
- [ ] **framer-motion imports updated** -- but did you check `MotionProps` type import in `MobiGlasPanel.tsx`? It uses `MotionProps` from `framer-motion` explicitly.
- [ ] **Middleware auth works** -- but did you test the Discord OAuth callback flow? It makes multiple redirects that each hit middleware.
- [ ] **Server Components added** -- but did you test with JavaScript disabled? Server Components render HTML, but if client hydration fails, interactive elements break silently.
- [ ] **Design system components consolidated** -- but did you verify the 530+ inline `rgba(var(--mg-*))` references still resolve? CSS variable names changing breaks every page.
- [ ] **`next lint` migrated to ESLint CLI** -- but did you verify `npm run build` no longer auto-runs lint? In 15.5 it still does; in 16 it won't.
- [ ] **All pages tested** -- but did you test on mobile? The MobiGlas design uses `whileHover` animations (159 instances across 43 files) that don't trigger on touch devices.

---

## Recommended Phase Ordering Based on Pitfall Dependencies

Based on the pitfall analysis, this is the safest order:

1. **MongoDB Consolidation** (Pitfall 6) -- merge dual clients before adding any new DB consumers.
2. **Security Hardening** (Pitfalls 1, 2, 5, 11) -- fix rate limiter, add CSP, verify CVE patch. Requires consolidated DB.
3. **Next.js 15.3 to 15.5 Upgrade** (Pitfalls 7, 8, 12, 13) -- update framework, handle deprecations. Clean security baseline needed first.
4. **framer-motion v10 to motion v12** (Pitfalls 3, 10, 14) -- atomic import rename, test animations. Independent of Next.js version but do after framework is stable.
5. **Server Component Optimization** (Pitfalls 4, 15) -- move data fetching to server layer. Requires stable imports (post-motion migration).
6. **Design System Consolidation** (Pitfall 9) -- consolidate MobiGlas components. Requires stable framer-motion imports and server component boundaries.

**Critical dependency chain:** MongoDB Consolidation MUST precede Security Hardening. framer-motion Migration MUST precede Design System Consolidation. Next.js Upgrade should precede framer-motion migration (to have the latest framework before changing animation library).

---

## Sources

- [Next.js 15.5 Release Notes](https://nextjs.org/blog/next-15-5) -- HIGH confidence
- [CVE-2025-29927: Next.js Middleware Authorization Bypass (Datadog)](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/) -- HIGH confidence
- [CVE-2025-29927 (JFrog)](https://jfrog.com/blog/cve-2025-29927-next-js-authorization-bypass/) -- HIGH confidence
- [Motion & Framer Motion React Upgrade Guide](https://motion.dev/docs/react-upgrade-guide) -- HIGH confidence
- [Motion JavaScript Upgrade Guide](https://motion.dev/docs/upgrade-guide) -- HIGH confidence
- [Next.js CSP Documentation](https://nextjs.org/docs/app/guides/content-security-policy) -- HIGH confidence
- [Next.js 15 CSP Headers Production Issue (GitHub #80997)](https://github.com/vercel/next.js/discussions/80997) -- MEDIUM confidence
- [AnimatePresence stuck on rapid state changes (GitHub #2554)](https://github.com/framer/motion/issues/2554) -- MEDIUM confidence
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) -- HIGH confidence
- [Auth.js Edge Compatibility](https://authjs.dev/guides/edge-compatibility) -- MEDIUM confidence
- [Upstash Edge Rate Limiting](https://upstash.com/blog/edge-rate-limiting) -- MEDIUM confidence
- Codebase analysis: `src/middleware.ts`, `src/lib/rate-limiter.ts`, `src/lib/mongodb-client.ts`, `src/lib/mongodb.ts`, `src/components/ui/mobiglas/`, 109 framer-motion files -- HIGH confidence (direct observation)
