# Phase 10: Access Control Hardening - Research

**Researched:** 2026-02-15
**Domain:** Authorization, Rate Limiting, Security Headers, File Upload Validation
**Confidence:** HIGH

## Summary

Phase 10 addresses six security requirements (SEC-08 through SEC-13) that harden the application's access control layer. The codebase currently has RBAC enforcement **deliberately disabled** across at least 7 API route files, with `hasLeadershipRole()` functions hardcoded to `return true` and commented-out original logic preserved inline. Escort request routes have **zero ownership checks** on PUT/DELETE operations. The rate limiter exists but is in-memory only (lost on restart, per-instance in multi-process), and only used by the finance route. Security headers exist partially in `next.config.js` but lack Content-Security-Policy. Image uploads validate only the `Content-Type` header (trivially spoofable) with no magic byte checking.

The existing code structure makes most of these changes straightforward -- the commented-out RBAC logic can be restored and refined, ownership checks follow patterns already established in `planned-mission-storage.ts`, and the middleware already handles auth redirects for page routes. The two most complex items are the MongoDB-backed rate limiter (requires a new collection + TTL index) and the CSP header strategy (must avoid forcing all pages into dynamic rendering).

**Primary recommendation:** Restore RBAC from commented code first (lowest risk, highest impact), then layer on ownership checks, MongoDB rate limiting, CSP headers, and magic byte validation in that order.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | existing | Session + JWT token with clearanceLevel/role | Already in use; session provides all data needed for RBAC |
| mongodb | existing | Rate limit storage backend | Phase 8 consolidated to MongoDB; use same connection pool |
| zod | existing | Input validation | Already used across API routes for request validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-type | ^19.x (ESM) | Magic byte detection from buffer | SEC-13: Server-side image upload validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| file-type (ESM) | magic-bytes.js (CJS compatible) | file-type is more maintained (150M weekly downloads) but is ESM-only; magic-bytes.js works with CJS but has fewer contributors. **Recommend file-type** since the project already uses ESM-compatible tooling in Next.js App Router. |
| MongoDB rate limiter | Upstash Redis | Redis is the industry standard for rate limiting, but this project already depends on MongoDB (Phase 8 consolidated), adding Redis is a new dependency + cost. MongoDB with TTL indexes is sufficient for the scale. |
| Nonce-based CSP | Hash-based CSP via next.config.js | Nonces force dynamic rendering on ALL pages. Hash-based CSP + `'unsafe-inline'` for styles allows static generation. The phase spec calls for "split strategy (hash for static, nonce for auth pages)" which is the right approach. |

**Installation:**
```bash
npm install file-type
```

> **Note on file-type:** Version 19+ is ESM-only. Since Next.js App Router API routes support ESM `import()`, use dynamic import: `const { fileTypeFromBuffer } = await import('file-type')`.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── auth.ts                    # Existing: hasRequiredClearance, hasRequiredRole
│   ├── auth-guards.ts             # NEW: Reusable API route authorization helpers
│   ├── rate-limiter.ts            # MODIFY: Add MongoDB-backed rate limiter class
│   ├── rate-limit-store.ts        # NEW: MongoDB collection for rate limit entries
│   ├── file-validation.ts         # NEW: Magic byte checking utilities
│   └── mongodb.ts                 # Existing: Connection pool (no changes needed)
├── middleware.ts                   # MODIFY: Add CSP headers + nonce generation
└── app/api/
    └── [all route files]          # MODIFY: Add auth guards, ownership checks
```

### Pattern 1: Centralized Authorization Guard
**What:** A reusable function that wraps common getServerSession + clearance/role checks, returning early with 401/403 responses.
**When to use:** Every protected API route handler.
**Example:**
```typescript
// src/lib/auth-guards.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { UserSession } from '@/lib/auth';
import { NextResponse } from 'next/server';
import * as userStorage from '@/lib/user-storage';

export interface AuthResult {
  session: UserSession;
  userId: string;
  clearanceLevel: number;
  role: string;
}

export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const session = await getServerSession(authOptions) as UserSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return {
    session,
    userId: session.user.id,
    clearanceLevel: session.user.clearanceLevel,
    role: session.user.role,
  };
}

export async function requireClearance(minLevel: number): Promise<AuthResult | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.clearanceLevel < minLevel) {
    return NextResponse.json(
      { error: 'Insufficient clearance level' },
      { status: 403 }
    );
  }
  return result;
}

export async function requireLeadership(): Promise<AuthResult | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const leadershipRoles = ['Director', 'Manager', 'Board Member'];
  if (!leadershipRoles.includes(result.role) && result.clearanceLevel < 3) {
    return NextResponse.json(
      { error: 'Leadership role required' },
      { status: 403 }
    );
  }
  return result;
}
```

### Pattern 2: Ownership Check at Storage Layer
**What:** Storage modules expose `canUserModify/Delete` functions that check `createdBy === userId` or leadership role.
**When to use:** Any mutating operation (PUT/DELETE) on user-owned resources.
**Example:**
```typescript
// Already exists in planned-mission-storage.ts -- extend to escort-request-storage.ts
export async function canUserModifyEscortRequest(userId: string, requestId: string): Promise<boolean> {
  const request = await getEscortRequestById(requestId);
  if (!request) return false;
  // Creator can modify
  if (request.requestedByUserId === userId) return true;
  // Assigned security officer can modify
  if (request.securityOfficerUserId === userId) return true;
  // Leadership can modify (fetch from user storage)
  const user = await userStorage.getUserById(userId);
  if (!user) return false;
  const leadershipRoles = ['Director', 'Manager', 'Board Member'];
  return leadershipRoles.includes(user.role) || user.clearanceLevel >= 3;
}
```

### Pattern 3: MongoDB-Backed Rate Limiter with TTL
**What:** Rate limit entries stored in a MongoDB collection with a TTL index for automatic cleanup.
**When to use:** Auth endpoints (login, signup, forgot-password, reset-password).
**Example:**
```typescript
// src/lib/rate-limit-store.ts
import { getDb } from '@/lib/mongodb';

const COLLECTION = 'rateLimits';

interface RateLimitDoc {
  key: string;        // e.g., "auth:login:192.168.1.1"
  count: number;
  windowStart: Date;
  expiresAt: Date;    // TTL field
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const db = await getDb();
  const collection = db.collection<RateLimitDoc>(COLLECTION);
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  // Upsert: increment count if within window, reset if window expired
  const result = await collection.findOneAndUpdate(
    { key, windowStart: { $gte: windowStart } },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        windowStart: now,
        expiresAt: new Date(now.getTime() + windowMs),
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  const doc = result;
  if (!doc) {
    return { allowed: true, remaining: maxRequests - 1, resetAt: new Date(now.getTime() + windowMs) };
  }

  const allowed = doc.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - doc.count);
  return { allowed, remaining, resetAt: doc.expiresAt };
}
```

### Pattern 4: CSP Split Strategy
**What:** Static pages use hash-based CSP from `next.config.js`; auth pages (login, signup) that need nonces use middleware-injected nonces and dynamic rendering.
**When to use:** SEC-11 requirement.
**Why split:** Nonces force dynamic rendering on every page they touch. Most pages in this app (dashboard, fleet ops, ship compendium) are already dynamic (they call `getServerSession`). Only truly static pages (landing, about) would benefit from staying static.
**Important:** Next.js 15.5+ docs now reference `proxy.ts` instead of `middleware.ts` for nonce injection, but this is the same concept. The existing `middleware.ts` can be extended.

### Anti-Patterns to Avoid
- **Checking clearance on the client only:** Client-side clearance checks are for UI gating only. The server MUST re-check on every API call.
- **Storing rate limit state in process memory only:** The current `rate-limiter.ts` uses an in-memory Map. In multi-process/serverless deployments, each instance has its own map, so an attacker can circumvent limits by hitting different instances. MongoDB storage solves this.
- **Using `'unsafe-inline'` for scripts in CSP:** This defeats the purpose of CSP for XSS protection. Use nonces or hashes instead.
- **Validating file type by extension or Content-Type header:** Both are trivially spoofable. Always check magic bytes from the actual file buffer.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File type detection | Custom magic byte lookup table | `file-type` npm package | Covers 200+ file types, handles edge cases (polyglot files, partial headers), actively maintained |
| Rate limit sliding window | Custom timestamp array tracking | MongoDB `findOneAndUpdate` with `$inc` + TTL index | Atomic operations prevent race conditions; TTL auto-cleans expired entries |
| CSP nonce injection | Manual header manipulation | Next.js middleware pattern from official docs | Framework extracts nonce automatically from CSP header and applies to all script/style tags |
| Password hashing | Custom hash function | bcrypt (already in use) | Already implemented correctly in auth.ts |

**Key insight:** The most dangerous "hand-roll" temptation in this phase is building custom authorization logic scattered across route files. A centralized `auth-guards.ts` module prevents inconsistency and makes auditing trivial.

## Common Pitfalls

### Pitfall 1: CSP Nonces Breaking Static Pages
**What goes wrong:** Adding nonces to ALL pages via middleware forces everything into dynamic rendering, destroying static page caching and increasing server load.
**Why it happens:** The middleware runs on all matched routes by default.
**How to avoid:** Use the split strategy: CSP in `next.config.js` headers for the base policy (with `'unsafe-inline'` for styles, hash-based for scripts), and only inject nonces via middleware for pages that truly need them (login, signup, password reset). However, since most dashboard pages already call `getServerSession()` and are dynamic anyway, the practical impact of nonces on those pages is minimal.
**Warning signs:** Build output shows 0 static pages; TTFB increases significantly.

### Pitfall 2: Race Condition in Rate Limiter
**What goes wrong:** Two simultaneous requests from the same IP both read count=4, both increment to 5, neither gets blocked (threshold is 5).
**Why it happens:** Read-then-write without atomicity.
**How to avoid:** Use MongoDB's `findOneAndUpdate` with `$inc` -- it's atomic. The count is incremented and returned in a single operation.
**Warning signs:** Rate limiting seems to allow more requests than configured.

### Pitfall 3: Forgetting to Check Ownership on GET with Sensitive Data
**What goes wrong:** While the phase spec focuses on edit/delete ownership, GET endpoints may also leak sensitive data (e.g., private briefing notes) to non-participants.
**Why it happens:** READ access is often overlooked when focusing on WRITE access.
**How to avoid:** Audit GET handlers too. For this project, most GETs are intentionally visible to all authenticated users (operations, missions). Document this as a conscious decision, not an oversight.
**Warning signs:** Users can see other users' private drafts.

### Pitfall 4: IP Extraction in Serverless/Proxy Environments
**What goes wrong:** `request.ip` returns `undefined` or the load balancer's IP instead of the real client IP.
**Why it happens:** Next.js behind a reverse proxy (Azure App Service, Vercel) needs to read `x-forwarded-for` header.
**How to avoid:** Extract IP with fallback chain: `request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.ip || 'unknown'`. Note: Currently NO code in the project extracts client IP at all.
**Warning signs:** All rate limit entries share the same key; everyone gets blocked or nobody does.

### Pitfall 5: file-type ESM Import in Next.js
**What goes wrong:** `import { fileTypeFromBuffer } from 'file-type'` fails at build time with "Cannot use import statement outside a module" or similar.
**Why it happens:** `file-type` v19+ is ESM-only. Next.js API routes support ESM but some build configurations may cause issues.
**How to avoid:** Use dynamic import: `const { fileTypeFromBuffer } = await import('file-type')`. This is safe in async route handlers.
**Warning signs:** Build failure mentioning ESM/CJS incompatibility.

### Pitfall 6: Hardcoded RBAC Restoration Breaking Active Users
**What goes wrong:** Re-enabling RBAC immediately blocks users who should have access but whose clearance levels haven't been set correctly in the database.
**Why it happens:** The RBAC was disabled for a reason -- likely because clearance levels weren't being assigned properly via Discord sync or admin tools.
**How to avoid:** Before restoring RBAC, verify that existing users have appropriate clearance levels. Consider adding a "grace period" log-only mode that logs would-be blocks without enforcing them, then switch to enforcement after verifying the logs look correct.
**Warning signs:** Users report sudden loss of access to features they were using.

## Code Examples

### Example 1: Restoring hasLeadershipRole (SEC-08)
```typescript
// BEFORE (current state -- hardcoded bypass):
async function hasLeadershipRole(_userId: string): Promise<boolean> {
  return true;
  /* commented out original... */
}

// AFTER (restored with centralized check):
import { requireLeadership } from '@/lib/auth-guards';

// In route handler:
export async function POST(request: NextRequest) {
  const auth = await requireLeadership();
  if (auth instanceof NextResponse) return auth;
  // ... proceed with auth.userId, auth.clearanceLevel
}
```

### Example 2: Ownership Check on Escort Requests (SEC-09)
```typescript
// In PUT handler for escort requests:
const auth = await requireAuth();
if (auth instanceof NextResponse) return auth;

const request = await escortRequestStorage.getEscortRequestById(requestData.id);
if (!request) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// Ownership check: creator, assigned officer, or leadership
const isOwner = request.requestedByUserId === auth.userId;
const isAssignedOfficer = request.securityOfficerUserId === auth.userId;
const isLeadership = auth.clearanceLevel >= 3;
if (!isOwner && !isAssignedOfficer && !isLeadership) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 });
}
```

### Example 3: MongoDB Rate Limiter Index (SEC-10)
```typescript
// Add to src/lib/mongo-indexes.ts:
try {
  const rateLimits = db.collection('rateLimits');
  await Promise.all([
    rateLimits.createIndex({ key: 1 }).catch(() => {}),
    rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {}),
  ]);
} catch (err) {
  console.warn('Index setup (rateLimits) skipped or failed:', err);
}
```

### Example 4: Magic Byte Validation (SEC-13)
```typescript
// src/lib/file-validation.ts
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export async function validateImageBuffer(
  buffer: Buffer,
  declaredType: string
): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    return { valid: false, error: 'Could not determine file type from content' };
  }

  if (!ALLOWED_IMAGE_TYPES.has(detected.mime)) {
    return {
      valid: false,
      detectedType: detected.mime,
      error: `File content is ${detected.mime}, not an allowed image type`,
    };
  }

  // Optional: warn if declared type doesn't match detected type
  if (detected.mime !== declaredType) {
    console.warn(
      `File type mismatch: declared=${declaredType}, detected=${detected.mime}`
    );
  }

  return { valid: true, detectedType: detected.mime };
}
```

### Example 5: CSP in next.config.js (SEC-11/SEC-12 base policy)
```javascript
// Add to next.config.js headers() function:
{
  source: '/(.*)',
  headers: [
    {
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",  // Will be tightened with nonces on auth pages
        "style-src 'self' 'unsafe-inline'",    // Tailwind CSS requires unsafe-inline
        "img-src 'self' blob: data: https://cdn.fleetyards.net https://images.aydocorp.space https://aydocorp.space",
        "font-src 'self'",
        "connect-src 'self' https://discord.com https://cdn.discordapp.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    },
    { key: 'X-Frame-Options', value: 'DENY' },  // Upgrade from SAMEORIGIN
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ],
},
```

### Example 6: Security Headers on API Responses (SEC-12)
```typescript
// Utility to add security headers to API responses
export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Pragma', 'no-cache');
  return response;
}
```

## Inventory of Hardcoded RBAC Bypasses

These are all locations where RBAC is currently bypassed with `return true`:

| File | Function | Original Logic (Commented Out) |
|------|----------|-------------------------------|
| `src/app/api/fleet-ops/operations/route.ts` L51 | `isLeadership = true` inline | Leadership roles or clearanceLevel >= 3 |
| `src/app/api/fleet-ops/operations/[id]/route.ts` L31-44 | `hasLeadershipRole()` | Leadership roles or clearanceLevel >= 3 |
| `src/app/api/fleet-ops/operations/[id]/route.ts` L47-60 | `canModifyOperation()` | Leader + operation.leaderId check |
| `src/app/api/fleet-ops/resources/route.ts` L27-40 | `hasLeadershipRole()` | Leadership roles or clearanceLevel >= 3 |
| `src/app/api/fleet-ops/resources/[id]/route.ts` L10-23 | `hasLeadershipRole()` | Leadership roles or clearanceLevel >= 3 |
| `src/app/api/fleet-ops/resources/allocations/route.ts` L23-36 | `hasLeadershipRole()` | Leadership roles or clearanceLevel >= 3 |
| `src/app/api/fleet-ops/missions/route.ts` L11 | inline `return true` | (no commented-out original) |
| `src/app/api/mission-templates/route.ts` L24,43 | (no function, inline logic) | Template access returns true for all |
| `src/lib/mission-template-storage.ts` L363-365 | `canUserAccessTemplate()` | TODO comment; returns true for all users |

### Routes With NO Ownership Checks (need SEC-09)

| Route | Operations Missing Checks |
|-------|--------------------------|
| `/api/security/escort-requests` | PUT (anyone can modify any request), DELETE (anyone can delete any request) |
| `/api/fleet-ops/operations/assign-ship` | POST (no check that the assigning user is authorized for the mission) |
| `/api/fleet-ops/operations/upload-image` | POST (no check that uploader is participant/leader of the mission) |

### Routes Already Implementing Ownership Checks (good patterns to follow)
| Route | Implementation |
|-------|---------------|
| `/api/planned-missions` PUT | `canUserModifyMission()` checks createdBy or leader |
| `/api/planned-missions` DELETE | `canUserDeleteMission()` checks createdBy |
| `/api/mission-templates` PUT/DELETE | `canUserModifyTemplate()` / `canUserDeleteTemplate()` checks createdBy |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` for CSP nonces | `proxy.ts` for CSP nonces | Next.js 16.x docs | Same concept, renamed file convention. **The project is on 15.5.12 -- use `middleware.ts`** |
| `'unsafe-inline'` for all scripts | SRI hashes (experimental) or nonces | Next.js 14.0.0+ | SRI is experimental + webpack-only; nonces are the stable path |
| In-memory rate limiting | Distributed store (Redis/MongoDB) | Industry standard | Required for any multi-instance deployment |

**Deprecated/outdated:**
- `file-type` versions < 17: CJS was removed in v17+. Current v19 is ESM-only.
- `express-rate-limit` with MongoDB store: Works but designed for Express, not Next.js API routes. Better to write a thin MongoDB wrapper directly.

## Open Questions

1. **Should RBAC restoration be done with a grace period?**
   - What we know: RBAC was intentionally disabled (commented-out code, not deleted). Users may have been given blanket access.
   - What's unclear: Whether all users have correct clearance levels in the database. If Discord sync sets clearance properly, grace period may be unnecessary.
   - Recommendation: Add logging before enforcement. First commit logs "RBAC_AUDIT: User X with clearance Y attempted action Z" without blocking. Second commit enables enforcement. This can be a planner decision.

2. **X-Frame-Options: SAMEORIGIN vs DENY?**
   - What we know: Currently set to SAMEORIGIN. The phase spec says "security headers."
   - What's unclear: Whether the app is legitimately embedded in iframes anywhere (e.g., admin panel, Discord embed preview).
   - Recommendation: Change to DENY unless there's a specific iframe use case. Also add `frame-ancestors 'none'` in CSP which is the modern replacement.

3. **CSP and Tailwind CSS inline styles**
   - What we know: Tailwind generates inline styles for some utilities. Strict `style-src` without `'unsafe-inline'` would break them.
   - What's unclear: Exact extent of inline style usage.
   - Recommendation: Keep `style-src 'self' 'unsafe-inline'` for styles. Focus CSP strictness on `script-src` where XSS protection matters most.

4. **Rate limit configuration values**
   - What we know: Current in-memory limiter uses 5 requests per 5 minutes for auth, 100/min for API.
   - What's unclear: Whether these thresholds match actual usage patterns.
   - Recommendation: Make thresholds configurable via environment variables with sensible defaults: `RATE_LIMIT_AUTH_MAX=5`, `RATE_LIMIT_AUTH_WINDOW_MS=300000`.

## Sources

### Primary (HIGH confidence)
- [Next.js CSP Guide (v16.1.6)](https://nextjs.org/docs/app/guides/content-security-policy) - Complete nonce + hash-based CSP documentation, proxy.ts pattern
- Codebase analysis: 35+ files with clearance/RBAC references, 7+ files with `return true` bypasses
- Codebase analysis: `src/lib/rate-limiter.ts` - Current in-memory implementation
- Codebase analysis: `src/app/api/fleet-ops/operations/upload-image/route.ts` - Current upload validation (Content-Type only)
- Codebase analysis: `next.config.js` - Existing security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)

### Secondary (MEDIUM confidence)
- [file-type npm](https://www.npmjs.com/package/file-type) - ESM-only package for magic byte detection, v19+
- [magic-bytes.js npm](https://www.npmjs.com/package/magic-bytes.js) - CJS-compatible alternative
- [MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/) - Standard pattern for auto-expiring documents

### Tertiary (LOW confidence)
- WebSearch on "MongoDB rate limiting store Next.js" - Most results recommend Redis; MongoDB approach is custom but well-understood pattern
- WebSearch on "Next.js 15 CSP nonce production issues" - Discussion #80997 notes CSP headers not applied unless `await headers()` is called; needs validation on 15.5.12

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are either already in use or well-established npm packages
- Architecture: HIGH - Patterns follow existing codebase conventions; RBAC restoration from commented code is low-risk
- Pitfalls: HIGH - Based on direct codebase analysis and documented Next.js behaviors
- CSP split strategy: MEDIUM - Next.js 15.5 vs 16.x doc differences on proxy.ts vs middleware.ts naming; functionally identical

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days; stable domain, no fast-moving dependencies)
