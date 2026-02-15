# Phase 9: Emergency Security & Dependency Cleanup - Research

**Researched:** 2026-02-15
**Domain:** Application security hardening, dependency management, CSS variables
**Confidence:** HIGH

## Summary

Phase 9 addresses 13 distinct requirements spanning endpoint security (SEC-01 through SEC-07, SEC-14, SEC-15), infrastructure cleanup (INFRA-02 through INFRA-04), and a CSS design-system fix (DS-01). The codebase investigation reveals every vulnerability listed in the requirements is confirmed present and exploitable. The most critical finding is that three diagnostic endpoints (`/api/diagnostic`, `/api/force-fallback`, `/api/storage-status`) are completely unauthenticated and leak internal system details including user data, file paths, and error stacks. All three cron endpoints use a "fail-open" CRON_SECRET pattern where omitting the env var disables auth entirely. The Next.js version (15.3.3) is affected by CVE-2025-55182 (CVSS 10.0 RCE) and must be upgraded to at least 15.5.7 (target: 15.5.12).

The ReDoS concern in `getUserByEmail`/`getUserByHandle` is already mitigated by proper regex escaping, but the approach should be simplified to use MongoDB's collation-based case-insensitive matching instead of regex entirely. The `--mg-error` CSS variable is referenced across 13 component files but never defined in `:root`, causing all error text to render as transparent/invisible. A companion `--mg-panel` variable is also referenced but never defined (only `--mg-panel-dark` exists).

**Primary recommendation:** Execute in 3-4 focused plans: (1) security endpoint hardening + cron auth, (2) input sanitization + error message cleanup, (3) dependency pruning + Next.js upgrade, (4) CSS variable fix.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.3.3 -> 15.5.12 | Framework | Security patches for CVE-2025-55182 (RCE), CVE-2025-55183, CVE-2025-55184 |
| next-auth | 4.24.11 | Authentication | Session/JWT auth already in use for protected routes |
| bcrypt | 5.1.1 | Password hashing | Native C++ addon, faster than bcryptjs; already used across all auth files |
| zod | 3.24.4 | Input validation | Already used in signup/reset-password routes |
| mongodb | 6.16.0 | Database driver | Consolidated client from Phase 8 |

### Supporting (No New Libraries Needed)
This phase does NOT require any new npm packages. It is exclusively about:
- Removing unused packages
- Upgrading existing packages
- Fixing security patterns with existing tools
- Adding CSS variable definitions

### Packages to Remove (INFRA-02)
| Package | Current Version | Why Remove | Last Import Location |
|---------|----------------|------------|---------------------|
| `@azure/cosmos` | ^4.4.1 | Only used in `migrate-users.ts` script (Cosmos SQL API); app migrated to MongoDB wire protocol in Phase 8 | `src/scripts/migrate-users.ts` |
| `@azure/identity` | ^4.10.0 | Zero imports anywhere in `src/` | None |
| `@azure/msal-node` | ^3.5.3 | Zero imports anywhere in `src/` | None |
| `azure-ad-verify-token` | ^3.0.3 | Zero imports anywhere in `src/` | None |
| `mammoth` | ^1.9.0 | Zero imports anywhere in `src/` | None |
| `openid-client` | ^6.5.0 | Zero imports anywhere in `src/` | None |
| `bcryptjs` | ^3.0.2 | Duplicate of `bcrypt`; zero imports in `src/` (all files use `import bcrypt from 'bcrypt'`) | None |
| `@headlessui/react` | ^1.7.18 | Zero imports anywhere in `src/` | None |

### Packages to Move to devDependencies (INFRA-03)
| Package | Currently In | Should Be In |
|---------|-------------|--------------|
| `@types/bcrypt` | dependencies | devDependencies |
| `@types/bcryptjs` | dependencies | devDependencies (then remove entirely with bcryptjs) |
| `@types/nodemailer` | dependencies | devDependencies |

## Architecture Patterns

### Pattern 1: Auth-Gating API Routes with NextAuth Session
**What:** Use `getServerSession(authOptions)` to protect API routes
**When to use:** Any API route that should require authentication
**Example (from existing fleet-ops/force-fallback/route.ts - already protected):**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... protected logic
}
```

### Pattern 2: Cron Secret Authentication (Fail-Closed)
**What:** Require CRON_SECRET for all cron endpoints, reject if not configured
**When to use:** All `/api/cron/*` endpoints and automation endpoints
**Current (VULNERABLE - fail-open):**
```typescript
// If CRON_SECRET is not set, the entire auth check is skipped!
const cronSecret = process.env.CRON_SECRET;
if (cronSecret) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
// Falls through to execute unprotected if CRON_SECRET is missing
```
**Fixed (fail-closed):**
```typescript
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  console.error('[cron] CRON_SECRET not configured - rejecting request');
  return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
}
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Pattern 3: Sanitized Error Responses
**What:** Never expose `error.message` or `error.stack` directly to clients
**When to use:** All API error responses
**Current (LEAKS - from diagnostic/route.ts):**
```typescript
return NextResponse.json({
  status: 'error',
  message: error.message,   // Leaks internal error details
  stack: error.stack         // Leaks full stack trace!
}, { status: 500 });
```
**Fixed:**
```typescript
console.error('Diagnostic error:', error); // Log internally only
return NextResponse.json({
  error: 'Internal server error'
}, { status: 500 });
```

### Pattern 4: HTML Escape in Email Templates
**What:** Escape user-supplied values before interpolation into HTML email templates
**When to use:** All email template string interpolations
**Implementation (utility function):**
```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

### Anti-Patterns to Avoid
- **Fail-open auth:** Never skip authentication when a secret/token is not configured. Always fail closed.
- **Regex on user input for DB queries:** Even with escaping, prefer MongoDB collation for case-insensitive matching over `$regex`.
- **Leaking error internals:** Never include `error.message` or `error.stack` in API responses. Log them server-side, return generic messages to clients.
- **Trusting callbackUrl:** Never redirect to an unvalidated URL from query params. Ensure it's a relative path starting with `/`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML escaping | Manual string replacement per-field | Single shared `escapeHtml()` utility | Easy to miss a field; centralized function ensures consistency |
| Input validation | Custom regex validators | `zod` schemas (already in project) | Already the project standard; catches edge cases |
| Password hashing | bcryptjs pure-JS implementation | `bcrypt` native addon (already primary) | 4x faster, no duplicate dependency |
| Case-insensitive DB queries | `$regex` with escaped input | MongoDB collation `{ locale: 'en', strength: 2 }` | More performant, no regex at all, eliminates ReDoS surface |

**Key insight:** Most "security fixes" in this phase are about REMOVING code (unused packages, debug endpoints, verbose error messages), not adding new code. The less attack surface, the better.

## Common Pitfalls

### Pitfall 1: Breaking the migrate-users script when removing @azure/cosmos
**What goes wrong:** The `src/scripts/migrate-users.ts` script is the ONLY file that imports `@azure/cosmos`. Removing the package without updating the script breaks the migration tool.
**Why it happens:** The script was written before Phase 8's MongoDB consolidation and uses the Cosmos SQL API directly.
**How to avoid:** Either (a) rewrite migrate-users.ts to use the MongoDB wire protocol via the consolidated `connectToDatabase()`, or (b) delete the script entirely since the migration is complete (all users are already in MongoDB). Option (b) is recommended since Phase 8 completed the consolidation.
**Warning signs:** `npm run migrate-users` fails after package removal.

### Pitfall 2: Next.js upgrade breaking discord.js webpack config
**What goes wrong:** The custom webpack config for discord.js externals may need adjustment after Next.js upgrade.
**Why it happens:** Next.js 15.5.x may change webpack defaults or externals handling.
**How to avoid:** After upgrading, run `npm run build` and verify all 69 pages build successfully. The existing `serverExternalPackages` config should still work.
**Warning signs:** Build errors mentioning discord.js, bufferutil, utf-8-validate, or zlib-sync.

### Pitfall 3: CSS variable fallback behavior
**What goes wrong:** `rgba(var(--mg-error), 0.8)` renders as transparent when `--mg-error` is undefined because `rgba()` with an undefined variable produces `rgba(, 0.8)` which is invalid.
**Why it happens:** The variable was referenced in 13 files but never defined in `:root` in `globals.css`.
**How to avoid:** Define `--mg-error` in `:root` using the same RGB tuple pattern as other MobiGlas variables. The existing `--mg-danger` is `255, 70, 70` which is the natural choice for error color.
**Warning signs:** Error messages appear but have invisible text.

### Pitfall 4: OAuth users with empty passwordHash
**What goes wrong:** Discord OAuth creates users with `passwordHash: ''` (empty string), which is truthy in JavaScript. If a bcrypt.compare() is ever called against it, it could behave unexpectedly.
**Why it happens:** In `auth.ts` line 119: `passwordHash: ''` for new OAuth users.
**How to avoid:** Use `null` instead of `''` for OAuth users' passwordHash. The auth flow already checks `if (!user.passwordHash)` which handles `null` correctly. Empty string `''` would pass this check.
**Warning signs:** Potential auth bypass if empty string is ever compared against.

### Pitfall 5: Finance POST route uses wrong database
**What goes wrong:** `client.db()` without arguments uses the default database from the connection string, not `COSMOS_DATABASE_ID`.
**Why it happens:** The finance transactions POST handler calls `client.db()` (line 110 of `src/app/api/finance/transactions/route.ts`) instead of `client.db(DATABASE_ID)` or using the `db` returned by `connectToDatabase()`.
**How to avoid:** Use the destructured `{ db }` from `connectToDatabase()` which already specifies `DATABASE_ID`.
**Warning signs:** Transactions saved to wrong database, not appearing in queries.

### Pitfall 6: Callback URL open redirect
**What goes wrong:** The LoginForm reads `callbackUrl` from query params and passes it directly to `router.push()` and `signIn()` without validation. An attacker could craft a URL like `/login?callbackUrl=https://evil.com` to redirect users after login.
**Why it happens:** No validation on the callbackUrl parameter in the client-side code.
**How to avoid:** Validate that callbackUrl starts with `/` (relative path) and doesn't contain `//` (protocol-relative URL). The middleware already only sets callbackUrl to `pathname` (always relative), but the client-side code reads it from URL params which can be manipulated.

## Code Examples

### SEC-01: Auth-gate diagnostic endpoint (delete or protect)
```typescript
// Option A: Delete the endpoint entirely (RECOMMENDED for /api/diagnostic)
// Simply delete src/app/api/diagnostic/route.ts

// Option B: Auth-gate it (for storage-status which may be needed)
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Require admin
  if (session.user.role !== 'admin' && (session.user.clearanceLevel ?? 0) < 3) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... existing logic, but sanitize response
}
```

### SEC-02: Fail-closed cron auth
```typescript
// Extract into reusable helper
function verifyCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 503 }
    );
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  return null; // Auth passed
}
```

### SEC-04: HTML escaping for email templates
```typescript
// src/lib/html-escape.ts (or inline in email-service.ts)
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Usage in email-service.ts:
// Before: <p>Hello, <strong>${aydoHandle}</strong>,</p>
// After:  <p>Hello, <strong>${escapeHtml(aydoHandle)}</strong>,</p>
```

### SEC-06: Callback URL validation
```typescript
function isValidCallbackUrl(url: string | null | undefined): string {
  if (!url) return '/';
  // Must be relative path, no protocol-relative URLs
  if (!url.startsWith('/') || url.startsWith('//')) return '/';
  // No external redirects hidden in path
  try {
    const parsed = new URL(url, 'http://localhost');
    if (parsed.host !== 'localhost') return '/';
  } catch {
    return '/';
  }
  return url;
}
```

### SEC-14: Fix finance transactions to use correct database
```typescript
// Before (WRONG - uses default DB from connection string):
const { client } = await connectToDatabase();
const db = client.db();

// After (CORRECT - uses the db already configured with DATABASE_ID):
const { db } = await connectToDatabase();
```

### DS-01: CSS variable definitions
```css
:root {
  /* ... existing variables ... */
  --mg-panel-dark: 0, 12, 24;     /* Panel darker background */
  --mg-error: 255, 70, 70;         /* Error red (same as --mg-danger) */
  --mg-panel: 0, 20, 40;           /* Panel background (slightly lighter than dark) */
}
```

## Detailed Findings by Requirement

### SEC-01: Unauthenticated Diagnostic Endpoints
**Confidence: HIGH** (verified by reading source code)

| Endpoint | File | Auth? | Leaks |
|----------|------|-------|-------|
| GET `/api/diagnostic` | `src/app/api/diagnostic/route.ts` | NO | User IDs, handles, emails, password hash existence/length, file paths, `cwd`, error stacks |
| GET `/api/force-fallback` | `src/app/api/force-fallback/route.ts` | NO | User IDs, handles, emails, roles, password hash info, storage mode |
| GET `/api/storage-status` | `src/app/api/storage-status/route.ts` | NO | Storage mode (cloud vs fallback), user count, error messages |

**Recommendation:** Delete `/api/diagnostic` and `/api/force-fallback` entirely (they are debug endpoints). Auth-gate `/api/storage-status` or delete it. Note: `/api/fleet-ops/force-fallback` is a separate endpoint that IS auth-gated (via session) and should be kept.

### SEC-02: Cron Secret Fail-Open
**Confidence: HIGH** (verified by reading source code)

All three cron endpoints use identical fail-open pattern:
- `src/app/api/cron/discord-sync/route.ts` (lines 16-23)
- `src/app/api/cron/ship-sync/route.ts` (lines 18-25)
- `src/app/api/cron/warm-images/route.ts` (lines 23-29)

Additionally, `src/app/api/discord/assign-synced-role/route.ts` (lines 26-36) uses CRON_SECRET as one auth method but has a fallback to session auth, and its fail-open applies only to the cron auth path (session auth still protects).

### SEC-03: ReDoS in getUserByEmail/getUserByHandle
**Confidence: HIGH** (verified by reading source code)

The regex escaping in `src/lib/user-storage.ts` (lines 73 and 99) uses `email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` which IS a correct escaping pattern. However, the better approach is to eliminate regex entirely:
- Use the `emailLower` / `aydoHandleLower` normalized fields as the primary lookup (already the first condition in the `$or`)
- Remove the regex fallback branch entirely, or replace with MongoDB collation-based case-insensitive matching

### SEC-04: XSS in Email Templates
**Confidence: HIGH** (verified by reading source code)

`src/lib/email-service.ts` interpolates user-supplied values directly into HTML:
- Line 41: `${aydoHandle}` - user handle
- Line 96: `${name}` - contact form name
- Line 97: `${email}` - contact form email
- Line 98: `${subject}` - contact form subject
- Line 104: `${message}` - contact form message body
- Line 110: `${email}` - reply-to reference

All need HTML escaping. The `message` field at line 104 is wrapped in a `white-space: pre-wrap` div which is particularly dangerous because it's explicitly rendered as-is.

### SEC-05: Error Message Information Leakage
**Confidence: HIGH** (verified by grep across all API routes)

Found 70+ instances of `error.message` being returned to clients across API routes. The worst offender is `/api/diagnostic` which returns `error.stack`. Key files requiring sanitization:
- `src/app/api/diagnostic/route.ts` - returns error.message AND error.stack
- `src/app/api/auth/signup/route.ts` - returns `Database error: ${createError.message}`
- `src/app/api/profile/route.ts` - returns `Failed to fetch profile: ${error.message}`
- 25+ other API route files

Most of these follow the pattern `{ error: \`Failed to X: ${error.message}\` }` which leaks MongoDB connection errors, file system errors, etc.

### SEC-06: Callback URL Validation
**Confidence: HIGH** (verified by reading source code)

- `src/middleware.ts` (line 31): Sets `callbackUrl` to `pathname` (always safe relative path)
- `src/components/auth/LoginForm.tsx` (line 36): Reads callbackUrl from searchParams and passes to `router.replace()` without validation
- `src/components/auth/LoginForm.tsx` (line 83): Passes callbackUrl to `signIn()` callbackUrl option
- `src/components/auth/LoginForm.tsx` (line 258): Passes callbackUrl to Discord `signIn()` callbackUrl option

The middleware only sets safe values, but the client reads from URL params which can be directly crafted by an attacker.

### SEC-07: Password Handling (bcrypt Duplicate + OAuth Hash)
**Confidence: HIGH** (verified by reading source code)

1. **Duplicate packages:** Both `bcrypt` (5.1.1, native) and `bcryptjs` (3.0.2, pure JS) are in dependencies. All source code uses `import bcrypt from 'bcrypt'` (the native version). `bcryptjs` is unused.
2. **OAuth passwordHash:** In `src/app/api/auth/auth.ts` line 119, Discord OAuth users get `passwordHash: ''` (empty string). This is truthy and could cause issues. Should be `null`.
3. **Type packages:** Both `@types/bcrypt` and `@types/bcryptjs` are in `dependencies` instead of `devDependencies`.

### SEC-14: Finance Transactions Wrong Database
**Confidence: HIGH** (verified by reading source code)

In `src/app/api/finance/transactions/route.ts` line 110:
```typescript
const { client } = await connectToDatabase();
const db = client.db(); // BUG: uses default DB, not COSMOS_DATABASE_ID
```

Meanwhile, `src/lib/finance.ts` line 22 has the same bug:
```typescript
const { client } = await connectToDatabase();
const db = client.db(); // BUG: same issue
```

Both should use `const { db } = await connectToDatabase()` which already resolves to the correct database.

### SEC-15: Debug Info in 401 Responses
**Confidence: HIGH** (verified by reading source code)

`src/app/api/discord/assign-synced-role/route.ts` lines 54-62 return debug information in 401 responses:
```typescript
return NextResponse.json({
  error: 'Unauthorized',
  debug: {
    reason: authDebug.reason,
    hasSecret: authDebug.hasSecret,
    secretPrefix: cronSecret ? cronSecret.substring(0, 3) + '...' : null,  // LEAKS SECRET PREFIX!
    receivedHeader: authDebug.receivedHeader  // LEAKS AUTH HEADER!
  }
}, { status: 401 });
```

This leaks the first 3 characters of CRON_SECRET and the received auth header to any unauthenticated caller.

### INFRA-02: Unused Package Removal
**Confidence: HIGH** (verified by grep across entire src/ directory)

See "Packages to Remove" table above. All 8 packages have zero imports in source code except `@azure/cosmos` which is only used in the legacy `migrate-users.ts` script.

### INFRA-03: @types/* Packages in Wrong Location
**Confidence: HIGH** (verified by reading package.json)

Three `@types/*` packages are in `dependencies` instead of `devDependencies`:
- `@types/bcrypt` (line 40) -> move to devDependencies
- `@types/bcryptjs` (line 41) -> remove entirely (bcryptjs is being removed)
- `@types/nodemailer` (line 42) -> move to devDependencies

### INFRA-04: Next.js Upgrade 15.3.3 -> 15.5.12
**Confidence: HIGH** (verified via npm registry and CVE databases)

- Current: `next@15.3.3`
- Target: `next@15.5.12` (confirmed exists on npm)
- Critical fix: CVE-2025-55182 (CVSS 10.0, pre-auth RCE in React Server Components)
- Also fixes: CVE-2025-55183 (source code exposure), CVE-2025-55184 (DoS)
- This is a minor version bump within v15, no breaking API changes expected
- Must also update `eslint-config-next` from `15.3.3` to match

### DS-01: Missing CSS Variables
**Confidence: HIGH** (verified by reading globals.css and grepping usage)

- `--mg-error`: Used in 13 component files, NEVER defined in `:root`. Should be `255, 70, 70` (same as `--mg-danger`).
- `--mg-panel`: Used in 2 component files (`SignupForm.tsx`, `UserProfileContent.tsx`), NEVER defined. Only `--mg-panel-dark: 0, 12, 24` exists. Should define `--mg-panel: 0, 20, 40` (slightly lighter than `--mg-panel-dark`).

Files affected by `--mg-error`:
1. `src/components/ErrorNotification.tsx`
2. `src/components/auth/LoginForm.tsx`
3. `src/components/auth/SignupForm.tsx`
4. `src/components/contact/ContactForm.tsx`
5. `src/components/ui/mobiglas/MobiGlasInput.tsx`
6. `src/components/ui/mobiglas/StatusIndicator.tsx`
7. `src/components/UserFleetBuilder.tsx`
8. `src/components/UserFleetBuilderWrapper.tsx`
9. `src/components/security/EscortRequestDetail.tsx`
10. `src/components/security/EscortRequestTracker.tsx`
11. `src/app/reset-password/page.tsx`
12. `src/app/forgot-password/page.tsx`
13. `src/app/dashboard/subsidiaries/security/page.tsx`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `bcryptjs` (pure JS) | `bcrypt` (native C++) | Already migrated | 4x faster hashing, remove duplicate |
| `@azure/cosmos` SDK | MongoDB wire protocol | Phase 8 | Unified client, remove Azure SDK |
| Next.js 15.3.3 | Next.js 15.5.12 | Dec 2025 security patches | RCE fix (CVE-2025-55182) |
| Fail-open cron auth | Fail-closed cron auth | This phase | No unauthenticated cron execution |
| `$regex` for case-insensitive lookup | Collation or normalized fields | This phase | Eliminates regex attack surface |

## Vulnerability Audit Summary

**npm audit output (current):**
- 29 total vulnerabilities: 5 moderate, 23 high, 1 critical
- Primary sources: `@azure/cosmos` -> `@aws-sdk/*` chain (23 high via `@aws-sdk/xml-builder`), `undici` in discord.js (moderate)
- Removing `@azure/cosmos` will eliminate the 23 high-severity `@aws-sdk` vulnerabilities
- Next.js upgrade will address the framework-level CVEs
- Discord.js `undici` vulnerability is moderate and requires a major version change to fix (outside scope)

## Open Questions

1. **Should `/api/diagnostic` and `/api/force-fallback` be deleted or auth-gated?**
   - What we know: They are pure debug endpoints that leak sensitive data, with no apparent production use case
   - Recommendation: DELETE both. The `/api/fleet-ops/force-fallback` (which IS auth-gated) provides the force-fallback functionality that might actually be needed. The `/api/storage-status` could be auth-gated for admin monitoring if desired.

2. **Should `migrate-users.ts` be deleted or rewritten when removing `@azure/cosmos`?**
   - What we know: Phase 8 completed the MongoDB consolidation. The migration script uses the old Cosmos SQL API.
   - Recommendation: DELETE the script. The migration is complete. If needed in the future, a new script can use the MongoDB client.

3. **Should error messages be fully generic or include operation context?**
   - What we know: Currently `error.message` is leaked in 70+ API routes
   - Recommendation: Use format like `{ error: 'Failed to create transaction' }` (describes the OPERATION that failed without revealing WHY). Log the full error server-side.

4. **Next.js 15.5.12 vs 16.x upgrade?**
   - What we know: Latest stable is 16.1.6, but 15->16 is a major version with breaking changes (React 19 requirement, async APIs)
   - Recommendation: Stay on 15.5.12 for this security-focused phase. A major version upgrade is a separate effort.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: Direct reading of all referenced source files
- npm registry: `npm view next@15.5.12 version` confirmed existence
- npm audit: Direct output from project directory

### Secondary (MEDIUM confidence)
- [Next.js Security Update Dec 2025](https://nextjs.org/blog/security-update-2025-12-11) - CVE-2025-55182, CVE-2025-55183, CVE-2025-55184 details
- [Next.js Releases](https://github.com/vercel/next.js/releases) - Version history
- [CVE-2025-66478 Advisory](https://nextjs.org/blog/CVE-2025-66478) - Additional security context
- [Next.js Version 15 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-15) - Migration documentation

### Tertiary (LOW confidence)
- None - all findings verified against source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all changes verified against package.json and source
- Architecture: HIGH - Security patterns verified against existing codebase conventions
- Pitfalls: HIGH - Each pitfall discovered from direct code analysis, not speculation
- CSS variables: HIGH - Grep confirmed exact files and missing definitions

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable - security fixes are deterministic)
