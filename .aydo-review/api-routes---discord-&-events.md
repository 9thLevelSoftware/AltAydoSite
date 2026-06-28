# API Routes - Discord & Events Review

Scope reviewed:
- `src/app/api/discord/assign-synced-role/route.ts`
- `src/app/api/discord/init/route.ts`
- `src/app/api/discord/roles/route.ts`
- `src/app/api/discord/roles/user/route.ts`
- `src/app/api/events/discord/route.ts`

## Summary

Findings count: 18

Severity breakdown:
- Critical: 1
- High: 4
- Medium: 8
- Low: 5

Category breakdown:
- Bug: 5
- Stub: 1
- Error: 4
- Failure-point: 8

## Findings

### 1. `src/app/api/discord/assign-synced-role/route.ts`

#### Finding 1.1
- Category: failure-point
- Severity: high
- Lines: 86-88, 93-132, 144-147
- Description: The route initializes the shared Discord singleton and only calls `discord.cleanup()` after the happy-path loop completes. If `ensureRoleByName`, any unexpected loop failure outside the per-user catch, or `cleanup()` itself throws, the logged-in Discord client can remain active. Conversely, because `getDiscordService()` returns a singleton also used by the Discord role monitor, line 132 can destroy the shared client while another request or monitor cycle is using it.
- Suggested fix direction: Do not tear down a process-wide singleton from a per-request route, or create an isolated Discord client for this batch job. If the route owns the client, wrap the whole Discord section in `try/finally` and serialize access so cleanup cannot race active monitor work.

#### Finding 1.2
- Category: failure-point
- Severity: medium
- Lines: 63-67, 73-80, 127-128
- Description: Request-controlled `max` and `delayMs` are accepted without type/range validation. Any positive `max` skips the `HARD_CAP` branch, so a caller can send a very large `max` and defeat the intended 400-user safety cap. A large target set plus `delayMs` up to 2 seconds per user can also exceed normal API route/serverless execution limits.
- Suggested fix direction: Parse `max` and `delayMs` as finite integers, clamp `max` to `HARD_CAP`, clamp total estimated duration, and reject invalid values with 400. Long-running role sync should move to a background job/queue rather than a request lifecycle.

#### Finding 1.3
- Category: failure-point
- Severity: medium
- Lines: 150-156
- Description: The same mutating role-assignment handler is exposed through GET and POST. A session-authenticated admin/manager could trigger Discord role writes through a navigated URL or embedded request, and the route does not have normal POST-only CSRF expectations for state changes.
- Suggested fix direction: Remove the GET export for this mutating operation, or make GET return a dry-run/status response only. Require POST with an explicit CSRF-protected/admin action or cron bearer token.

#### Finding 1.4
- Category: bug
- Severity: low
- Lines: 72-80
- Description: When `max > 0`, `limited` is computed as `targetUsers.length < allUsers.length` after filtering to users with Discord data. If some users have no Discord data, `limited` can be reported as true even when no Discord-eligible users were omitted.
- Suggested fix direction: Capture the filtered Discord-eligible count before slicing and compare the sliced length against that count, not against `allUsers.length`.

### 2. `src/app/api/discord/init/route.ts`

#### Finding 2.1
- Category: bug
- Severity: critical
- Lines: 13-20
- Description: If `process.env.INIT_SECRET` is unset and the request body omits `secret`, both values are `undefined`, so the `secret !== process.env.INIT_SECRET` check passes and the initialization endpoint becomes callable without a secret. In production this can expose a state-changing initialization action if the env var is missing.
- Suggested fix direction: Fail closed when `INIT_SECRET` is missing. For example, check `if (!process.env.INIT_SECRET) return 503/500`, then require a non-empty string match using a constant-time comparison or a standard bearer-token helper.

#### Finding 2.2
- Category: stub
- Severity: low
- Lines: 12-13
- Description: The comment says `Basic security check - you might want to add authentication here`, and the route only implements a raw shared-secret body field. This is placeholder-level security guidance left in a production API route.
- Suggested fix direction: Replace the placeholder with the project’s normal auth guard or cron/bearer-token pattern, and document the intended caller model.

#### Finding 2.3
- Category: error
- Severity: low
- Lines: 13, 29-35
- Description: `await request.json()` is not guarded. Malformed or empty JSON bodies go to the generic catch and return 500 `Failed to initialize`, which misclassifies client input errors as server failures.
- Suggested fix direction: Parse with `await request.json().catch(() => null)` and return 400 for missing/invalid JSON or missing `secret`.

### 3. `src/app/api/discord/roles/route.ts`

#### Finding 3.1
- Category: failure-point
- Severity: high
- Lines: 21-28, 62-68
- Description: Authorization checks use `session.user.clearanceLevel < 3` without nullish fallback. In JavaScript, `undefined < 3` is false, so a session whose token is missing `clearanceLevel` but whose `role` is not `admin` can pass this gate.
- Suggested fix direction: Use a centralized guard such as `requireClearance(3)`/`requireLeadership()`, or compare `(session.user.clearanceLevel ?? 0) < 3` in both GET and POST.

#### Finding 3.2
- Category: error
- Severity: low
- Lines: 70, 114-120
- Description: POST parses `await request.json()` without handling malformed JSON. Invalid JSON falls into the generic catch and returns a 500 `Failed to process request` instead of a 400 client error.
- Suggested fix direction: Guard JSON parsing, validate that `action` is a string, and return 400 for malformed bodies.

#### Finding 3.3
- Category: failure-point
- Severity: medium
- Lines: 73-86
- Description: The `start` action calls `monitor.start()` and immediately returns `status: running`, but `start()` performs the actual Discord role check asynchronously and does not surface configuration/login failures to this API response. The route can report success even when Discord credentials are absent or the monitor will only log repeated failures.
- Suggested fix direction: Validate Discord configuration before `start`, expose a monitor health/error state, and/or await an initial health check before returning `running`.

### 4. `src/app/api/discord/roles/user/route.ts`

#### Finding 4.1
- Category: failure-point
- Severity: high
- Lines: 49-57
- Description: The authorization check has the same `session.user.clearanceLevel < 3` nullish bug as the roles route. If `clearanceLevel` is absent from the session token, the comparison evaluates false and a non-admin session can pass the elevated-access branch for another user.
- Suggested fix direction: Use a centralized auth guard or compare `(session.user.clearanceLevel ?? 0) < 3`.

#### Finding 4.2
- Category: failure-point
- Severity: medium
- Lines: 22, 32-40
- Description: `userId` and `discordName` are read from untyped JSON and used without runtime type validation. In the `userId` path this value is passed into the Mongo-backed `getUserById` query; object values can become query selector values rather than literal IDs.
- Suggested fix direction: Require `typeof userId === 'string'` and/or `typeof discordName === 'string'`, trim values, reject objects/arrays, and validate IDs against the expected UUID/snowflake format before querying.

#### Finding 4.3
- Category: bug
- Severity: medium
- Lines: 59-68
- Description: The endpoint refuses to check roles when `user.discordName` is missing, even if the user has a stored `discordId`. Other reviewed code can sync and assign by `discordId`, so valid Discord-linked users with only an ID cannot use this route.
- Suggested fix direction: Support lookup/check by `discordId` in the monitor/service layer, or ensure every Discord-linked user always stores a normalized `discordName` before this endpoint is used.

#### Finding 4.4
- Category: error
- Severity: low
- Lines: 22, 87-93
- Description: Malformed JSON bodies are caught by the generic handler and returned as 500 `Failed to check user roles`.
- Suggested fix direction: Parse the body with explicit error handling and return 400 for invalid JSON or missing fields.

#### Finding 4.5
- Category: failure-point
- Severity: low
- Lines: 36-46, 49-57
- Description: Authenticated users can distinguish whether a submitted `discordName` exists in local user storage: an unknown name returns 404, while an existing name for another user returns 403. This creates a small enumeration signal for Discord names tied to site accounts.
- Suggested fix direction: For non-admin self-service checks, avoid arbitrary `discordName` lookup and use the session user directly. For elevated users, keep the current detailed 404/403 behavior.

### 5. `src/app/api/events/discord/route.ts`

#### Finding 5.1
- Category: failure-point
- Severity: high
- Lines: 14-24, 59-75, 100-121
- Description: GET and POST do not require authentication. `getServerSession` is only used to choose a timezone, then unauthenticated callers can list all Discord scheduled events or fetch an event by ID through the bot token. If Discord events are internal or member-only, this is an authorization bypass/data exposure issue.
- Suggested fix direction: Add the project’s normal auth/clearance guard before fetching Discord events, or explicitly separate a sanitized public-calendar endpoint from an authenticated internal Discord endpoint.

#### Finding 5.2
- Category: bug
- Severity: medium
- Lines: 47-56, 72-75, 118-121, 128-131, 144-147
- Description: `buildErrorResponse` always returns a default 200 response. Discord fetch failures and unexpected server errors are therefore reported to clients and caches as successful HTTP responses with an `error` field.
- Suggested fix direction: Let `buildErrorResponse` accept a status code and return 502/503 for Discord upstream failures and 500 for unexpected server errors.

#### Finding 5.3
- Category: bug
- Severity: medium
- Lines: 82-85, 133-135
- Description: When expansion is not requested, the route still calls `mapDiscordEventsToEventData(..., 1)`. The mapper can create synthetic recurring instances within that one-day horizon, but the route then reports `recurrenceExpanded: false` when `expand` is false. Clients can receive expanded events they did not request, with metadata saying expansion did not happen.
- Suggested fix direction: When `expand`/`expandFlag` is false, map only `discordEvents.map(e => mapDiscordEventToEventData(e, userTimezone))`. Call the expanding mapper only when expansion is requested.

#### Finding 5.4
- Category: failure-point
- Severity: medium
- Lines: 103-107, 124-143
- Description: POST accepts `expand` and `horizon` from any unauthenticated caller and can request up to 365 days of recurrence expansion. Combined with no authentication/rate limiting, this can amplify CPU work and response size for a public endpoint.
- Suggested fix direction: Require authentication and rate limiting, and consider a lower default/maximum horizon or pagination for expanded recurring events.

#### Finding 5.5
- Category: error
- Severity: low
- Lines: 110-119
- Description: `eventId` is converted to a string and interpolated into the Discord API path by the service without validation/encoding. Non-snowflake values containing path or query delimiters can produce malformed upstream requests and noisy error logs.
- Suggested fix direction: Validate event IDs against Discord snowflake format before calling the service, and ensure the service uses `encodeURIComponent` for path segments.
