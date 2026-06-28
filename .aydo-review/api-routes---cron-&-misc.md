# API Routes - Cron & Misc Review

Scope: 17 assigned route files under `src/app/api`.

Summary:
- Findings: 34
- Severity breakdown: critical 0, high 6, medium 18, low 10
- Reviewed with supporting dependency checks in `src/lib/auth-guards.ts`, `src/lib/user-storage.ts`, `src/lib/ship-storage.ts`, `src/lib/escort-request-storage.ts`, `src/lib/finance.ts`, `src/lib/rate-limiter.ts`, and `src/lib/email-service.ts`.

## Findings

### 1. Undefined clearance can bypass admin Discord sync authorization
- File path: `src/app/api/admin/discord-sync/route.ts`
- Line number(s): 23-26, 75-78
- Category: bug
- Severity: high
- Description: The admin check uses `session.user.clearanceLevel < 4 && session.user.role !== 'admin'`. In JavaScript, `undefined < 4` is false, so a session that lacks `clearanceLevel` and is not admin will not enter the denial branch. Other guards in this codebase use `?? 0`, which indicates the field is not guaranteed to be present.
- Suggested fix direction: Normalize clearance before comparison, e.g. `const clearance = session.user.clearanceLevel ?? 0`, or replace this route's bespoke check with a central `requireClearance(4)`/admin guard.

### 2. Dry-run mode is a successful stub
- File path: `src/app/api/admin/discord-sync/route.ts`
- Line number(s): 80-92
- Category: stub
- Severity: low
- Description: `dryRun` returns HTTP 200 with `success: true` while explicitly saying the functionality is not implemented. Callers and operators can mistake this for a validated preview.
- Suggested fix direction: Either implement a real dry-run path that computes intended changes without writing, or return 501/400 for `dryRun` until supported.

### 3. Invalid JSON in admin Discord sync POST becomes a generic 500
- File path: `src/app/api/admin/discord-sync/route.ts`
- Line number(s): 80, 110-117
- Category: failure-point
- Severity: low
- Description: `await request.json()` is inside the broad catch, so malformed JSON is logged as a sync API error and returned as `Discord sync failed` with status 500.
- Suggested fix direction: Parse the body in a dedicated try/catch and return 400 `Invalid JSON body` before running sync logic.

### 4. Contact form has no abuse control
- File path: `src/app/api/contact/route.ts`
- Line number(s): 14-52
- Category: failure-point
- Severity: medium
- Description: The public contact endpoint sends email for any valid body with no rate limiting, captcha, IP throttling, or idempotency. This can be used to spam the configured mailbox and consume SMTP quota.
- Suggested fix direction: Add per-IP and/or per-email rate limiting, bot protection, and operational alerts before calling `sendContactFormEmail`.

### 5. Contact form logs unmasked email on send failure
- File path: `src/app/api/contact/route.ts`
- Line number(s): 54-55
- Category: failure-point
- Severity: medium
- Description: The configuration-error and success paths mask the sender email, but the send-failure path logs `{ name, email }` unmasked. This creates avoidable PII in logs.
- Suggested fix direction: Reuse the same email masking helper for all log contexts and avoid logging full names/emails unless explicitly required.

### 6. Contact form malformed JSON returns 500 instead of 400
- File path: `src/app/api/contact/route.ts`
- Line number(s): 18-20, 79-86
- Category: failure-point
- Severity: low
- Description: A malformed JSON body is caught only by the broad catch and returned as an unexpected server error.
- Suggested fix direction: Parse JSON in a dedicated try/catch and return 400 with a validation-style error.

### 7. Finance GET exposes all transactions to any authenticated user
- File path: `src/app/api/finance/transactions/route.ts`
- Line number(s): 30-37
- Category: bug
- Severity: high
- Description: GET requires only a logged-in email, then calls `getTransactions`, which reads every document in the `transactions` collection. POST requires clearance level 3+, but read access has no equivalent authorization gate.
- Suggested fix direction: Apply the same clearance/role policy to GET, or filter transactions to the current user's permitted scope.

### 8. Undefined clearance can bypass transaction creation authorization
- File path: `src/app/api/finance/transactions/route.ts`
- Line number(s): 55-62
- Category: bug
- Severity: high
- Description: `const clearance = session.user.clearanceLevel; if (clearance < 3)` fails open when `clearanceLevel` is undefined because `undefined < 3` is false.
- Suggested fix direction: Use `const clearance = session.user.clearanceLevel ?? 0` or a centralized clearance guard.

### 9. Finance POST malformed JSON returns 500 instead of 400
- File path: `src/app/api/finance/transactions/route.ts`
- Line number(s): 76, 131-136
- Category: failure-point
- Severity: low
- Description: Invalid JSON in the request body is handled by the broad catch and reported as `Failed to create transaction` with status 500.
- Suggested fix direction: Add a dedicated JSON parse catch and return 400 before field validation.

### 10. Finance POST lacks bounds and string validation on transaction data
- File path: `src/app/api/finance/transactions/route.ts`
- Line number(s): 76-108, 112-119
- Category: failure-point
- Severity: medium
- Description: The route checks only required fields, enum values, and positive numeric amount. It does not constrain maximum amount, integer/finite money representation, description length, or description content before storing and returning it.
- Suggested fix direction: Replace ad hoc checks with a schema that enforces finite safe amounts, max lengths, trimming, and canonical currency units.

### 11. Profile ships-only update bypasses the route's Zod ship schema
- File path: `src/app/api/profile/route.ts`
- Line number(s): 10-16, 97-131
- Category: bug
- Severity: medium
- Description: `profileUpdateSchema` requires `fleetyardsId` to be a UUID, but the ships-only fast path uses manual checks that only require the fields to be present. Invalid UUIDs and extra object fields can be persisted through this path.
- Suggested fix direction: Validate ships-only updates with the same `z.array(userShipSchema)` schema and strip or reject unknown ship fields.

### 12. Profile update allows self-editing organization-controlled fields
- File path: `src/app/api/profile/route.ts`
- Line number(s): 19-29, 167-171
- Category: failure-point
- Severity: medium
- Description: The user profile update schema accepts `payGrade`, `position`, and `division` from the current user. If these fields drive organizational display, permissions, roster views, or workflows elsewhere, users can self-assign them.
- Suggested fix direction: Split self-service profile fields from staff-controlled fields, and require elevated authorization for organization-controlled attributes.

### 13. Escort request list exposes all requests to any authenticated user
- File path: `src/app/api/security/escort-requests/route.ts`
- Line number(s): 57-90
- Category: bug
- Severity: high
- Description: GET authenticates the user but does not restrict the result set to the requester, assigned officer, or leadership. It passes arbitrary filters to `getAllEscortRequests`, which returns all matching records including route, timing, personnel, and notes.
- Suggested fix direction: Apply RBAC to list queries: leadership can list all; non-leadership users should be constrained to `requestedByUserId === current user` or `securityOfficerUserId === current user` regardless of query parameters.

### 14. Escort request creation trusts client-controlled workflow and assignment fields
- File path: `src/app/api/security/escort-requests/route.ts`
- Line number(s): 122-142
- Category: bug
- Severity: high
- Description: A normal authenticated user can provide `status`, `assignedPersonnel`, `assignedSecurityOfficer`, `securityOfficerUserId`, and arbitrary `requestedBy` in the create body. The validator allows valid statuses, so a user can create an already approved/assigned/in-progress request or impersonate another display name.
- Suggested fix direction: On create, derive requester identity from the session, force initial status/assignment fields to safe defaults, and reserve workflow/assignment changes for leadership/officer endpoints.

### 15. Escort request update has object-level RBAC but no field-level authorization
- File path: `src/app/api/security/escort-requests/route.ts`
- Line number(s): 186-209
- Category: bug
- Severity: high
- Description: Once a user is the creator or assigned officer, the route passes the entire request body to storage. That permits updates to protected fields such as `requestedByUserId`, `securityOfficerUserId`, `assignedPersonnel`, `status`, and completion/assignment data without checking which actor is allowed to change each field.
- Suggested fix direction: Use role-specific update schemas and allowlists. Creators should only update requester-editable fields; officers should only update operational fields; leadership should control status transitions and assignment.

### 16. Escort request update does not validate update payloads
- File path: `src/app/api/security/escort-requests/route.ts`
- Line number(s): 175-209
- Category: failure-point
- Severity: medium
- Description: PUT only checks that `id` exists, then writes the rest of the payload. Invalid enum values, non-integer ship counts, malformed participant arrays, and unexpected fields can reach storage.
- Suggested fix direction: Add a strict update schema per role and reject unknown keys before calling `updateEscortRequest`.

### 17. Escort request update ignores optimistic-locking support
- File path: `src/app/api/security/escort-requests/route.ts`
- Line number(s): 175-176, 207-209
- Category: failure-point
- Severity: medium
- Description: `escortRequestStorage.updateEscortRequest` supports an `expectedVersion`, but the route never extracts/passes one. Concurrent edits can silently overwrite each other.
- Suggested fix direction: Expose `__v` in responses if needed, require it on mutating requests, pass it to storage, and return 409 on stale updates.

### 18. Escort request JSON parse errors return 500
- File path: `src/app/api/security/escort-requests/route.ts`
- Line number(s): 110-111, 175-176, 158-164, 228-234
- Category: failure-point
- Severity: low
- Description: POST and PUT parse JSON inside broad catch blocks, so malformed request bodies become generic 500 failures.
- Suggested fix direction: Parse JSON in a small dedicated try/catch and return 400 `Invalid JSON body`.

### 19. Escort request ship count accepts fractional values
- File path: `src/app/api/security/escort-requests/route.ts`
- Line number(s): 33-35
- Category: bug
- Severity: low
- Description: `shipsToEscort` only has to be a number >= 1, so values such as `1.5` pass validation even though a ship count should be an integer.
- Suggested fix direction: Require `Number.isInteger(data.shipsToEscort)` and set a reasonable upper bound.

### 20. Cron Discord sync reports success even when per-user errors occurred
- File path: `src/app/api/cron/discord-sync/route.ts`
- Line number(s): 39-56
- Category: failure-point
- Severity: medium
- Description: The route logs `syncResult.errors` but always returns `success: true` and HTTP 200 unless the whole sync throws. Cron monitors that rely on status or success will miss partial sync failures.
- Suggested fix direction: Return a degraded status, non-2xx status for error thresholds, or a separate `success: false`/`partialSuccess` contract that monitoring can alert on.

### 21. Cron Discord sync logs full sync error details
- File path: `src/app/api/cron/discord-sync/route.ts`
- Line number(s): 39-42
- Category: failure-point
- Severity: medium
- Description: The response intentionally avoids full error details, but the warning log stores the complete `syncResult.errors` array. Depending on `syncAllUsersWithDiscord`, this may include user identifiers or Discord data.
- Suggested fix direction: Log counts and sanitized/error-code summaries by default; keep detailed per-user data behind explicit debug logging with redaction.

### 22. Async ship sync may not survive serverless/request lifecycle limits
- File path: `src/app/api/cron/ship-sync/route.ts`
- Line number(s): 54-68, 95-105
- Category: failure-point
- Severity: medium
- Description: `mode=async` schedules the full sync inside `after()` and immediately returns 202. Long-running FleetYards sync work can exceed platform background execution limits or be terminated after the response, leaving callers with an accepted response but no durable job.
- Suggested fix direction: Move long syncs to a durable queue/worker or external scheduler, persist job state, and expose job status rather than relying on request-adjacent background work.

### 23. Ship sync response can leak raw sync errors to callers with cron access
- File path: `src/app/api/cron/ship-sync/route.ts`
- Line number(s): 28-49, 111-115
- Category: failure-point
- Severity: low
- Description: The sync response includes the first ten raw errors. This is protected by `CRON_SECRET`, but cron endpoints are often called by third-party schedulers and logs; raw errors can contain upstream URLs, identifiers, or operational details.
- Suggested fix direction: Return counts and sanitized summaries from the route; keep detailed errors in internal logs.

### 24. Warm-images cron can hang or exceed route limits on slow image optimizer requests
- File path: `src/app/api/cron/warm-images/route.ts`
- Line number(s): 74-95
- Category: failure-point
- Severity: medium
- Description: The route fetches two optimizer URLs for every unique ship image and each `fetch` has no timeout or abort signal. A slow/hung optimizer request can stall a batch, and a large dataset can exceed route/runtime limits.
- Suggested fix direction: Add per-request timeouts with `AbortController`, cap total work per invocation, persist progress, and use a queue/background worker for full warmups.

### 25. Warm-images builds its internal origin from the incoming request host
- File path: `src/app/api/cron/warm-images/route.ts`
- Line number(s): 69-81
- Category: failure-point
- Severity: low
- Description: The route derives `origin` from `request.nextUrl.host`. If deployment/proxy host validation is loose, a caller with cron credentials can make the server fetch `_next/image` on an unexpected host instead of the canonical app origin.
- Suggested fix direction: Use a configured canonical internal origin such as `NEXT_PUBLIC_APP_URL`/`NEXTAUTH_URL`, or validate the host against an allowlist.

### 26. Batch ship lookup hides database failures as successful empty results
- File path: `src/app/api/ships/batch/route.ts`
- Line number(s): 55-62
- Category: bug
- Severity: medium
- Description: The route returns 200 with `{ items: ships }`. The called storage helper returns `[]` on failure, so a database outage is indistinguishable from a valid request with no matches.
- Suggested fix direction: Make storage throw on database errors or return an explicit result type; have the route return 5xx for storage failures.

### 27. Manufacturers endpoint hides database failures as an empty list
- File path: `src/app/api/ships/manufacturers/route.ts`
- Line number(s): 20-24
- Category: bug
- Severity: medium
- Description: The route always returns 200 with `items`. The storage helper returns `[]` on errors, so clients may cache an empty manufacturer list during outages.
- Suggested fix direction: Do not swallow storage errors for API reads; propagate failures to the route and return 5xx.

### 28. Ship listing allows expensive unbounded page offsets and unconstrained search strings
- File path: `src/app/api/ships/route.ts`
- Line number(s): 12-19, 55
- Category: failure-point
- Severity: medium
- Description: `page` has no maximum and `search` has no maximum length. The route passes these directly into MongoDB-backed search/pagination; very large pages create expensive skips and long search strings can cause slow text/regex fallback behavior.
- Suggested fix direction: Add maximum page/offset and search length constraints; prefer cursor pagination for deep browsing and escape/limit regex fallback input in storage.

### 29. Sync-status endpoint masks storage failures as healthy-looking unknown state
- File path: `src/app/api/ships/sync-status/route.ts`
- Line number(s): 17-44
- Category: bug
- Severity: medium
- Description: `getLatestSyncStatus` returns `null` both when no sync exists and when it catches a storage error. The route converts null into a 200 `status: 'unknown'`, so DB failures can be cached and shown as normal unknown state.
- Suggested fix direction: Distinguish no-data from read failure in storage and return 5xx for failures.

### 30. Storage status exposes infrastructure and user-count metadata to all authenticated users
- File path: `src/app/api/storage-status/route.ts`
- Line number(s): 6-25
- Category: failure-point
- Severity: low
- Description: Any authenticated user can learn whether the app is using local fallback or Cosmos DB and the total user count. This is operational metadata that usually belongs to admins.
- Suggested fix direction: Restrict this endpoint to admins/operations users or remove sensitive details from non-admin responses.

### 31. Leaders endpoint exposes Discord IDs for all leaders to any authenticated user
- File path: `src/app/api/users/leaders/route.ts`
- Line number(s): 16-31
- Category: failure-point
- Severity: medium
- Description: Any authenticated user can retrieve leadership users' `discordId`, photo, position, division, and clearance level. Discord IDs are stable external identifiers and may not be needed by general clients.
- Suggested fix direction: Minimize fields returned to non-admins and omit `discordId` unless required for a specific authorized workflow.

### 32. Users endpoint accepts invalid pagination as NaN
- File path: `src/app/api/users/route.ts`
- Line number(s): 16-23
- Category: bug
- Severity: medium
- Description: `parseInt` can return `NaN`; `Math.max(1, NaN)` and the page-size expression both remain `NaN`. Those values are passed to storage and can trigger database errors instead of a controlled 400.
- Suggested fix direction: Validate query parameters with a schema using finite integer checks and defaults, then reject invalid input with 400.

### 33. Users endpoint exposes every user's ships to any authenticated user
- File path: `src/app/api/users/route.ts`
- Line number(s): 25-33
- Category: failure-point
- Severity: medium
- Description: The basic user list includes each user's `ships` array. Depending on fleet privacy expectations, this can expose personal inventory data beyond what is needed for a directory listing.
- Suggested fix direction: Return only minimal directory fields by default and gate richer user/fleet inventory data behind a narrower permission or explicit user profile endpoint.

### 34. Ship detail route rejects IDs with surrounding whitespace despite checking trim
- File path: `src/app/api/ships/[id]/route.ts`
- Line number(s): 21-28
- Category: bug
- Severity: low
- Description: The route checks `id.trim().length` but passes the original untrimmed `id` to `getShipByIdOrSlug`. A path segment with accidental encoded spaces can pass validation and still miss a valid ship.
- Suggested fix direction: Normalize once with `const normalizedId = id.trim()` and pass that to storage.

## Reviewed with no reportable route-level issues

- `src/app/api/cron/cloudflare-r2-health/route.ts`

