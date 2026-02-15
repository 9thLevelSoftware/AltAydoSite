# Technology Stack: Security Hardening, Dependency Upgrades & Performance Optimization

**Project:** AydoCorp Website - Security & Upgrade Milestone
**Researched:** 2026-02-15
**Overall Confidence:** HIGH

---

## Decision: Next.js 15.5.12 (NOT 16.x)

The project should upgrade from 15.3.3 to **15.5.12** (latest 15.x patch, released 2026-02-04), not jump to Next.js 16.

**Rationale:**

| Factor | 15.5.12 | 16.1.6 |
|---|---|---|
| Security patches | All critical CVEs patched (CVE-2025-66478 RCE, image optimizer DoS, middleware SSRF) | Also patched |
| React version | React 18.x (current) | React 19.2 **required** -- massive migration |
| Webpack compatibility | Full support for custom `webpack` config | Turbopack default; custom `webpack` config causes build **failure** unless `--webpack` flag used |
| Middleware | `middleware.ts` works as-is | Renamed to `proxy.ts` with `proxy()` export -- affects NextAuth integration |
| `next lint` | Deprecated but functional | **Removed** entirely -- requires ESLint flat config migration |
| `next-auth` v4 | Compatible | Known peer dependency errors and runtime issues with React 19 |
| Breaking changes | Minimal from 15.3.3 -- mostly additive features | 15+ breaking changes requiring codemod + manual fixes |
| EOL | Supported through 2026-10-21 (8 months remaining) | Current LTS |

**The 15.3.3 to 15.5.12 path patches all known security vulnerabilities with minimal breaking changes.** Jumping to 16.x introduces React 19, middleware-to-proxy rename, Turbopack default (breaking the project's custom webpack config for discord.js), and next-auth v4 incompatibility. That is a separate milestone.

**Critical security context:** Next.js 15.3.3 has a **CVSS 10.0 critical RCE** (CVE-2025-66478) that allows unauthenticated remote code execution via React Server Components. Active exploitation has been observed in the wild since December 2025. This upgrade is not optional.

---

## Core Technology Changes

### 1. Next.js Upgrade: 15.3.3 --> 15.5.12

| | |
|---|---|
| **Package** | `next` |
| **From** | `15.3.3` |
| **To** | `15.5.12` |
| **Confidence** | **HIGH** |

**What changes in 15.5.x from 15.3.x:**

| Feature | Impact on This Project |
|---|---|
| Critical security patches (RCE, SSRF, DoS) | **CRITICAL** -- must patch immediately |
| Turbopack builds (beta) | Optional -- do not enable yet, project uses custom webpack |
| Node.js middleware runtime (stable) | Useful for security middleware; `config.runtime = 'nodejs'` now stable |
| `next lint` deprecation warning | Warning only; still works. Plan migration to direct ESLint CLI later |
| TypeScript improvements (typed routes, route props helpers) | Nice-to-have; opt-in via `typedRoutes: true` in config |
| `next/image` quality deprecation warning | Warning only in 15.5; add `images.qualities: [75]` to suppress |

**Breaking changes affecting this project:** None identified. The project already uses async request APIs (`await params`), does not use `legacyBehavior` on Link, does not use AMP, and does not use `serverRuntimeConfig`/`publicRuntimeConfig`.

**Migration command:**
```bash
npm install next@15.5.12 eslint-config-next@15.5.12 @next/bundle-analyzer@15.5.12
```

**Source:** [Next.js 15.5 blog](https://nextjs.org/blog/next-15-5) | [endoflife.date/nextjs](https://endoflife.date/nextjs)

---

### 2. framer-motion 10.x --> motion 12.x (Package Rename)

| | |
|---|---|
| **Old Package** | `framer-motion` `^10.16.4` |
| **New Package** | `motion` `^12.34.0` |
| **Confidence** | **HIGH** |

**Key facts:**
- `framer-motion` has been renamed to `motion`. The `framer-motion` npm package still publishes but is effectively a redirect. New development is on the `motion` package.
- Import path changes from `"framer-motion"` to `"motion/react"`.
- 109 files in this project import from `framer-motion`.

**Breaking changes from v10 to v12 that affect this project:**

| Breaking Change | Applies to This Project? | Action Required |
|---|---|---|
| Package rename: `framer-motion` --> `motion` | YES | `npm uninstall framer-motion && npm install motion` |
| Import path: `"framer-motion"` --> `"motion/react"` | YES (109 files) | Find-and-replace across all files |
| `AnimateSharedLayout` removed | NO -- not used in codebase | None |
| `useInvertedScale` removed | NO -- not used | None |
| `exitBeforeEnter` removed (use `mode="wait"`) | NO -- project already uses `mode="wait"` | None |
| `motion()` function removed (use `motion.create()`) | NO -- project uses `<motion.div>` JSX, not `motion()` | None |
| Legacy repeat syntax (`yoyo`, `flip`, `loop`) removed | Needs verification -- unlikely in this codebase | Audit animation configs |
| `DragControls.start` only accepts `PointerEvent` | NO -- no drag controls used | None |
| `Variants` type import | YES -- one file imports `Variants` | Import from `"motion/react"` instead |

**What the project uses (confirmed via grep):**
- `motion` component (JSX): `<motion.div>`, `<motion.section>`, etc. -- **unchanged API**
- `AnimatePresence`: **unchanged API**, still exported from `"motion/react"`
- `Variants` type: **still exported** from `"motion/react"`
- No advanced hooks (`useAnimation`, `useScroll`, `useMotionValue`, `useTransform`) -- pure declarative usage

**Migration is mechanical:** The project uses a simple subset of the API (motion components + AnimatePresence + variants). The migration is a package swap + import path replacement across 109 files. No behavioral changes expected.

**Migration steps:**
```bash
# 1. Swap packages
npm uninstall framer-motion
npm install motion@^12.34.0

# 2. Find-and-replace imports (all 109 files)
# FROM: import { motion } from 'framer-motion';
# TO:   import { motion } from 'motion/react';
# FROM: import { motion, AnimatePresence } from 'framer-motion';
# TO:   import { motion, AnimatePresence } from 'motion/react';
# FROM: import { motion, Variants } from 'framer-motion';
# TO:   import { motion, Variants } from 'motion/react';
```

**Performance note:** The `motion` v12 package supports `LazyMotion` with `domAnimation` features for tree-shaking. After migration, wrap the app in `<LazyMotion features={domAnimation} strict>` to reduce bundle size by only loading animation features actually used. This optimization should be done as part of the migration, not separately.

**Source:** [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) | [motion npm](https://www.npmjs.com/package/motion) | [CHANGELOG](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md)

---

## Security Hardening Stack

### 3. Security Headers: @nosecone/next

| | |
|---|---|
| **Package** | `@nosecone/next` |
| **Version** | `^1.1.0` |
| **Confidence** | **HIGH** |

**Why @nosecone/next (not helmet, not next-secure-headers, not manual headers):**

- Built specifically for Next.js middleware with nonce-based CSP support
- From the Arcjet team -- same ecosystem as the rate limiter (see below), consistent API design
- Handles the tricky part: generating per-request CSP nonces in middleware and propagating them to script tags
- Works with or without the Arcjet SDK -- it is an independent library
- Lightweight, well-maintained, actively developed (v1.1.0 released 2026-02-13)

The project currently sets `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` in `next.config.js` headers. These are good but incomplete. Missing:
- **Content-Security-Policy** (CSP) -- the single most impactful security header
- **Strict-Transport-Security** (HSTS)
- **Permissions-Policy** (restrict browser features)
- **X-Permitted-Cross-Domain-Policies**

@nosecone/next provides all of these with sensible defaults and middleware integration.

**Why NOT alternatives:**

| Alternative | Why Not |
|---|---|
| **helmet** | Built for Express. Next.js does not use Express. Would require a custom server, which Next.js explicitly recommends against. |
| **next-secure-headers** | Last published 3 years ago. Stale maintenance. Does not support nonce-based CSP in middleware. |
| **next-security** | Low adoption, based on OWASP patterns but less mature than Nosecone. |
| **Manual CSP in next.config.js** | Cannot generate per-request nonces. Static CSP headers without nonces break inline scripts that Next.js generates. |
| **Custom middleware CSP** | Viable (30-50 lines of code) but requires maintaining nonce propagation, directive formatting, and keeping up with CSP spec changes. Nosecone does this correctly and keeps up with best practices. |

**Integration point:** Extends the existing `src/middleware.ts` (which handles auth). CSP nonces require dynamic rendering for pages that need inline scripts. The project's authenticated routes are already dynamic.

**Source:** [Nosecone docs](https://docs.arcjet.com/nosecone/quick-start) | [@nosecone/next npm](https://www.npmjs.com/package/@nosecone/next) | [Arcjet security headers blog](https://blog.arcjet.com/nosecone-a-library-for-setting-security-headers-in-next-js-sveltekit-node-js-bun-and-deno/)

---

### 4. Rate Limiting & Bot Protection: @arcjet/next

| | |
|---|---|
| **Package** | `@arcjet/next` |
| **Version** | `^1.0.0-beta.15` |
| **Confidence** | **MEDIUM** |

**Why @arcjet/next (not custom rate limiter, not express-rate-limit):**

The project has a custom in-memory rate limiter (`src/lib/rate-limiter.ts`) that uses a `Map<string, RateLimitEntry>`. This has critical limitations:
- **Memory-only**: Rate limit state is lost on process restart/deployment
- **Single-instance**: Does not work across multiple server instances (if Azure scales out)
- **No bot detection**: Only counts requests, cannot distinguish bots from humans
- **No IP intelligence**: Cannot identify known bad actors or VPN/proxy abuse
- **No attack detection**: Cannot detect application-layer attacks (SQLi probes, path traversal attempts)

@arcjet/next provides:
- **Rate limiting** with sliding window and token bucket algorithms
- **Bot detection** that identifies and blocks known bad bots while allowing legitimate ones (Googlebot, etc.)
- **Shield WAF** that detects common attack patterns (SQLi, XSS probes, path traversal)
- **Decision caching** for performance (does not add latency to every request)
- **Free tier** sufficient for this project's traffic levels

**Why beta is acceptable:** Arcjet has been in beta since early 2024 with steady releases. The "beta" label reflects their cautious versioning, not instability. Used in production by numerous Vercel template apps.

**Why NOT alternatives:**

| Alternative | Why Not |
|---|---|
| **Keep custom rate limiter** | Memory-only, single-instance, no bot detection, no attack detection. Inadequate for production security. |
| **express-rate-limit** | Express middleware, not compatible with Next.js middleware. |
| **upstash/ratelimit** | Requires Redis (Upstash). Adds external service dependency and cost for rate limiting only. No bot/attack detection. |
| **rate-limiter-flexible** | Node.js library, requires manual middleware integration. No bot/attack detection. |
| **MongoDB-backed custom rate limiter** | Better than in-memory (survives restarts), but still requires building bot detection, WAF, and IP intelligence from scratch. Significant engineering effort for inferior results. |

**Integration point:** Can be used in middleware for global protection AND in individual API route handlers for route-specific limits. The existing custom rate limiter's per-route configurations (100 req/min for API, 5 req/5min for auth) can be replicated with Arcjet's configuration.

**If the team prefers zero external services:** Keep the custom rate limiter but upgrade it to use MongoDB-backed storage (TTL collection for auto-cleanup) instead of in-memory Map. This solves the persistence problem but does not add bot detection or WAF capabilities. This is the minimum viable alternative.

**Source:** [@arcjet/next npm](https://www.npmjs.com/package/@arcjet/next) | [Arcjet docs](https://docs.arcjet.com/reference/nextjs/) | [Arcjet security checklist](https://blog.arcjet.com/next-js-security-checklist/)

---

### 5. Input Validation: Zod (existing -- expand coverage)

| | |
|---|---|
| **Package** | `zod` (already installed) |
| **Version** | Keep `^3.24.4` |
| **Confidence** | **HIGH** |

**Current state:** Zod is already used in 14 API routes for input validation. This is the correct approach for structured data (JSON payloads, query params, form data).

**Gap:** Not all API routes have Zod validation. Audit needed to identify routes that accept raw `request.json()` without schema validation. Every API route that accepts user input must validate with Zod at the entry point.

**Do NOT add:**
- **isomorphic-dompurify** -- No HTML sanitization use case exists. The project accepts plain text inputs only. Zod `.string().trim().max(N)` is sufficient. React's JSX escaping prevents XSS in rendering.
- **validator.js** -- Zod already provides string validation (email, URL, UUID, regex). No need for a second validation library.
- **joi** -- Inferior to Zod for TypeScript projects (no type inference).

---

## Performance Optimization Stack

### 6. Bundle Analysis: @next/bundle-analyzer (existing -- version bump)

| | |
|---|---|
| **Package** | `@next/bundle-analyzer` |
| **Version** | Upgrade to `^15.5.12` (match Next.js version) |
| **Confidence** | **HIGH** |

Already installed and configured with `npm run analyze`. Upgrade version to match Next.js 15.5.12 for compatibility.

---

### 7. Performance Monitoring: web-vitals

| | |
|---|---|
| **Package** | `web-vitals` |
| **Version** | `^4.2.4` |
| **Confidence** | **HIGH** |

**Why:** Provides direct measurement of Core Web Vitals (LCP, INP, CLS, FCP, TTFB) in production. Lightweight (~1.5KB gzipped), browser-only. Needed to measure the impact of performance optimizations.

**Implementation:** Create a client component that reports vitals:

```typescript
// src/lib/web-vitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

export function reportWebVitals() {
  onCLS(console.log);
  onINP(console.log);
  onLCP(console.log);
  onFCP(console.log);
  onTTFB(console.log);
}
```

---

## Dependency Cleanup (Removals)

Based on the project review's finding of 8 unused packages, these should be removed:

| Package | Reason for Removal |
|---|---|
| `@azure/cosmos` | Project uses MongoDB driver for Cosmos DB vCore, not the Cosmos SDK |
| `@azure/identity` | Not imported anywhere in application code |
| `@azure/msal-node` | Not imported; auth uses NextAuth with Entra ID provider |
| `azure-ad-verify-token` | Legacy; superseded by NextAuth's built-in token handling |
| `mammoth` | DOCX-to-HTML converter; not imported in any component or route |
| `openid-client` | Not imported; NextAuth handles OIDC internally |
| `bcrypt` | Duplicate of bcryptjs; both installed, project should use only bcryptjs |
| `@types/bcrypt` | Remove with bcrypt |

**Verification required:** Before removing, run grep for each package to confirm no imports exist. Some may be used in scripts not under `src/`.

**npm audit impact:** Removing `@azure/cosmos` eliminates the entire `@aws-sdk/*` dependency tree (transitive), which accounts for 20+ of the 29 npm audit vulnerabilities. Removing `bcrypt` eliminates the `tar` vulnerability chain (via `@mapbox/node-pre-gyp`).

---

## Vulnerability Remediation Summary

| Vulnerability Source | Severity | Fix |
|---|---|---|
| `next` (8 CVEs including RCE) | CRITICAL | Upgrade to 15.5.12 |
| `@aws-sdk/*` chain (via @azure/cosmos) | HIGH (20+ vulns) | Remove unused @azure/cosmos |
| `axios` (DoS via __proto__) | HIGH | `npm install axios@latest` |
| `nodemailer` (addressparser DoS) | HIGH | `npm install nodemailer@latest` |
| `tar` (path traversal, via @mapbox/node-pre-gyp via bcrypt) | HIGH | Remove bcrypt (keep bcryptjs -- pure JS, no native deps) |
| `discord.js` --> `undici` (decompression DoS) | MODERATE | `npm install discord.js@latest` |
| `lodash` (prototype pollution) | MODERATE | Transitive; likely resolved by @azure/cosmos removal |
| `fast-xml-parser` (DoS) | HIGH | Transitive via @aws-sdk; resolved by @azure/cosmos removal |

---

## ESLint Migration (Prepare for Next.js 16)

The current setup uses `.eslintrc.js` with `"next lint"` in the lint script. While `next lint` still works in 15.5, it shows a deprecation warning. Prepare by updating the script:

**Do now (15.5.12):**
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

**Do NOT do now:**
- Do not migrate to ESLint flat config (ESLint 8 is still in use, flat config is ESLint 9+)
- Do not switch to Biome (different rule set, learning curve, separate decision)
- Do not upgrade to ESLint 9 (breaking changes in plugin ecosystem)

**Source:** [Next.js 15.5 lint deprecation](https://nextjs.org/blog/next-15-5#next-lint-deprecation)

---

## Complete Installation Commands

```bash
# Step 1: Upgrade existing packages (security-critical)
npm install next@15.5.12 eslint-config-next@15.5.12 @next/bundle-analyzer@15.5.12

# Step 2: Fix known vulnerabilities in other deps
npm install axios@latest nodemailer@latest discord.js@latest

# Step 3: Swap framer-motion for motion
npm uninstall framer-motion
npm install motion@^12.34.0

# Step 4: Add security headers library
npm install @nosecone/next@^1.1.0

# Step 5: Add performance monitoring
npm install web-vitals@^4.2.4

# Step 6: Remove unused dependencies (verify with grep first)
npm uninstall @azure/cosmos @azure/identity @azure/msal-node azure-ad-verify-token mammoth openid-client bcrypt @types/bcrypt

# Step 7 (OPTIONAL - requires free Arcjet account): Add rate limiting & bot protection
npm install @arcjet/next@^1.0.0-beta.15
```

**Net result:** Remove 8 packages, add 3 (or 4 with Arcjet). Eliminate 25+ of 29 npm audit vulnerabilities.

---

## What NOT to Add

| Anti-Pattern | Why Avoid |
|---|---|
| **Next.js 16** | React 19 migration, middleware-to-proxy rename, Turbopack default breaking webpack config, next-auth v4 incompatibility. Separate milestone. |
| **React 19** | Only required for Next.js 16. Massive migration (forwardRef removal, useFormState to useActionState, ref as prop). Not needed for security/perf goals. |
| **next-auth v5 / Auth.js** | Different cookie names (logs everyone out), different API surface. Separate migration milestone. |
| **Mongoose / Prisma** | Project uses raw MongoDB driver everywhere. Adding an ORM is unrelated to security/perf work. |
| **helmet** | Express-only. Not compatible with Next.js without custom server. |
| **Tailwind CSS v4** | Breaking changes (PostCSS plugin removal, new config format). Separate task. |
| **Zod 4** | Breaking API changes across all 14+ files using Zod schemas. Separate task. |
| **MongoDB driver 7** | Breaking changes, unverified Cosmos DB vCore compatibility. Separate task. |
| **Sentry / DataDog** | External monitoring services. Valuable but orthogonal to security hardening. Separate decision. |
| **isomorphic-dompurify** | No HTML sanitization use case currently exists. Add only when rich text input is needed. |
| **Redis** | No need for distributed state at current traffic levels. Arcjet or MongoDB-backed rate limiting handles this without infrastructure. |
| **Biome** | Linter/formatter replacement for ESLint. Significant migration. Not in scope. |

---

## Version Compatibility Matrix

| Package | Current | Target | React 18 | Next.js 15.5.12 | Node.js 20+ |
|---|---|---|---|---|---|
| next | 15.3.3 | 15.5.12 | YES | -- | YES |
| motion | N/A (framer-motion 10.16.4) | 12.34.0 | YES | YES | YES |
| @nosecone/next | N/A | 1.1.0 | YES | YES | YES |
| @arcjet/next | N/A | 1.0.0-beta.15 | YES | YES | YES (20+) |
| web-vitals | N/A | 4.2.4 | YES | YES | N/A (browser) |
| eslint-config-next | 15.3.3 | 15.5.12 | -- | YES | YES |
| @next/bundle-analyzer | 15.3.3 | 15.5.12 | -- | YES | YES |
| axios | ^1.6.7 | latest | -- | YES | YES |
| nodemailer | ^7.0.10 | latest | -- | -- | YES |
| discord.js | ^14.22.1 | latest | -- | -- | YES |

**Node.js compatibility note:** The project's `engines` field specifies `>=18 <=22`. Node.js 24.5.0 is currently installed on the dev machine, which exceeds this range. Consider updating `engines` to `>=20` (matching Next.js 16's future requirement and dropping EOL Node 18) with no upper bound restriction. Next.js 15.5.12 supports Node.js 18+.

---

## next.config.js Changes Required

**For the 15.5.12 upgrade, minimal config changes are needed:**

```javascript
// Add to images config to suppress deprecation warnings
images: {
    // ... existing remotePatterns, dangerouslyAllowSVG, minimumCacheTTL ...
    qualities: [75], // Explicit quality list (Next.js 16 will require this)
},
```

**No webpack config changes needed** for the 15.3 to 15.5 upgrade. The discord.js externals configuration remains valid.

**Security headers migration:** Move static security headers from `next.config.js` `headers()` to middleware (handled by @nosecone/next). The static headers in `next.config.js` can remain as a fallback for routes not processed by middleware.

**Cache header improvements (performance):**
```javascript
// Immutable cache for hashed static assets
{ source: '/_next/static/:path*', headers: [
    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
]},
// Long cache for fonts (they never change)
{ source: '/fonts/:path*', headers: [
    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
]},
// Reasonable cache for images/assets (may change occasionally)
{ source: '/images/:path*', headers: [
    { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }
]},
```

---

## Confidence Assessment

| Area | Level | Reason |
|---|---|---|
| Next.js 15.5.12 upgrade path | **HIGH** | Official docs verified, breaking changes analyzed against codebase, no blockers found |
| framer-motion to motion migration | **HIGH** | Breaking changes enumerated, codebase grep confirms only simple API usage, migration is mechanical find-and-replace |
| Security headers (@nosecone/next) | **HIGH** | Official docs, active maintenance (v1.1.0 released 2 days ago), designed specifically for Next.js middleware |
| Rate limiting (@arcjet/next) | **MEDIUM** | Beta status, requires external account. Functionality verified via docs. Falls back to MongoDB-backed custom limiter if team declines. |
| Dependency cleanup | **MEDIUM** | Unused packages identified by project review; each removal needs grep verification before execution |
| Performance monitoring (web-vitals) | **HIGH** | Standard library, no integration risk, browser-only |
| ESLint migration path | **HIGH** | 15.5 deprecation is warning-only, no action required yet, clear path documented |
| Vulnerability remediation | **HIGH** | npm audit output confirms vulnerability sources, fix paths are standard version bumps or removals |

---

## Sources

### Official Documentation (HIGH confidence)
- [Next.js 15.5 release blog](https://nextjs.org/blog/next-15-5)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) -- used to confirm what NOT to do yet
- [Next.js Security Update Dec 2025](https://nextjs.org/blog/security-update-2025-12-11)
- [CVE-2025-66478 advisory](https://nextjs.org/blog/CVE-2025-66478)
- [Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy)
- [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide)
- [Motion changelog](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md)
- [Arcjet Next.js SDK reference](https://docs.arcjet.com/reference/nextjs/)
- [Nosecone quick start](https://docs.arcjet.com/nosecone/quick-start)

### npm Registry / Release Data (HIGH confidence)
- [Next.js endoflife.date](https://endoflife.date/nextjs) -- 15.5.12 released 2026-02-04, supported through 2026-10-21
- [motion npm](https://www.npmjs.com/package/motion) -- v12.34.0, latest
- [framer-motion npm](https://www.npmjs.com/package/framer-motion) -- v12.34.0 (same version, redirect to motion)
- [@nosecone/next npm](https://www.npmjs.com/package/@nosecone/next) -- v1.1.0
- [@arcjet/next npm](https://www.npmjs.com/package/@arcjet/next) -- v1.0.0-beta.15

### Security Advisories (HIGH confidence)
- [React CVE-2025-55182 (RCE via RSC)](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)
- [Next.js GHSA-9qr9-h5gf-34mp](https://github.com/vercel/next.js/security/advisories/GHSA-9qr9-h5gf-34mp)
- [Wiz exploitation tracking](https://www.wiz.io/blog/critical-vulnerability-in-react-cve-2025-55182) -- confirmed active exploitation since Dec 2025
- [Palo Alto Unit 42 analysis](https://unit42.paloaltonetworks.com/cve-2025-55182-react-and-cve-2025-66478-next/)

### Project Codebase Analysis (HIGH confidence)
- 109 files import from `framer-motion` -- all use `motion` component + `AnimatePresence` + `Variants` type
- 14 files already use Zod for input validation
- Custom rate limiter at `src/lib/rate-limiter.ts` is in-memory Map-based
- Middleware at `src/middleware.ts` handles auth only, no security headers
- All `params` access already uses `await` (async request APIs migrated)
- No deprecated Next.js APIs used (`legacyBehavior`, `useAmp`, `serverRuntimeConfig`)
- npm audit: 29 vulnerabilities (1 critical, 23 high, 5 moderate)
- `engines` field: `>=18 <=22` (needs updating)
