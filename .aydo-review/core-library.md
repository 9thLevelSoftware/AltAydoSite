# Core Library Review

Task: t_445a4955
Repository: ~/AltAydoSite
Scope: Core libraries for auth, MongoDB, storage, Discord integration, email, finance, rate limiting, error reporting, CDN, logger, timezone, and ship sync/storage.

## Summary

Findings count: 32

Severity breakdown:
- Critical: 0
- High: 12
- Medium: 16
- Low: 4

Category breakdown:
- Bug: 10
- Stub: 4
- Error: 2
- Failure-point: 16

## Files reviewed

- src/lib/auth-guards.ts
- src/lib/auth.ts
- src/lib/cdn.ts
- src/lib/discord-event-description.ts
- src/lib/discord-event-image.ts
- src/lib/discord-oauth.ts
- src/lib/discord-role-mappings.ts
- src/lib/discord-role-monitor-init.ts
- src/lib/discord-role-monitor.ts
- src/lib/discord-user-sync.ts
- src/lib/discord.ts
- src/lib/email-service.ts
- src/lib/errorReporting.ts
- src/lib/escort-request-storage.ts
- src/lib/eventMapper.ts
- src/lib/file-validation.ts
- src/lib/finance.ts
- src/lib/local-storage.ts
- src/lib/logger.ts
- src/lib/mission-requirements.ts
- src/lib/mission-storage.ts
- src/lib/mongo-indexes.ts
- src/lib/mongodb.ts
- src/lib/operation-storage.ts
- src/lib/password-reset-storage.ts
- src/lib/planned-mission-storage.ts
- src/lib/rate-limit-store.ts
- src/lib/rate-limiter.ts
- src/lib/resource-storage.ts
- src/lib/ship-name-matcher.ts
- src/lib/ship-storage.ts
- src/lib/ship-sync.ts
- src/lib/storage-errors.ts
- src/lib/storage-utils.ts
- src/lib/timezone.ts
- src/lib/user-storage.ts

## Findings

### 1. Development fallback still constructs and connects a MongoClient with an empty URI

- File path: src/lib/mongodb.ts
- Line number(s): 5-18, 43-68, 82-86
- Category: bug
- Severity: high
- Description: The module logs that the app will use fallback storage when no MongoDB/CosmosDB URI is configured outside production, but it still constructs `new MongoClient(uri, options)` and starts `client.connect()` with `uri === ''` during module initialization. That can throw or create a rejected global promise before storage modules get a chance to fall back, contradicting the fallback path and potentially breaking local/dev startup.
- Suggested fix direction: Do not instantiate or connect `MongoClient` when `uri` is empty. Keep `clientPromise` lazy, and have `connectToDatabase()` throw a controlled missing-configuration error that fallback-capable storage modules can catch.

### 2. Backward-compatibility storage toggles are no-op stubs

- File path: src/lib/storage-utils.ts
- Line number(s): 23-36
- Category: stub
- Severity: low
- Description: `forceUseLocalStorage()` and `resetConnectionStatus()` only log messages and do not change any state. Callers or tests that rely on these helpers to force local storage or retry MongoDB will receive no behavior change.
- Suggested fix direction: Either remove the helpers and update callers, or wire them to actual shared storage state. If fallback is intentionally unsupported, make these functions throw or return explicit unsupported results rather than silently doing nothing.

### 3. Mission status index uses the wrong date field

- File path: src/lib/mongo-indexes.ts
- Line number(s): 57-64
- Category: bug
- Severity: medium
- Description: The missions index is created on `{ status: 1, plannedDateTime: -1 }`, but mission documents in `mission-storage.ts` use `scheduledDateTime`. Queries and sorts on status plus scheduled date will not benefit from this index.
- Suggested fix direction: Change the index to `{ status: 1, scheduledDateTime: -1 }` and consider dropping the unused `plannedDateTime` index in a migration.

### 4. User email/handle updates do not refresh normalized lookup fields

- File path: src/lib/user-storage.ts
- Line number(s): 80-89, 110-120, 172-179, 213-223
- Category: bug
- Severity: high
- Description: `createUser()` writes `emailLower` and `aydoHandleLower`, and lookups prefer those normalized fields. `updateUser()` can later change `email` or `aydoHandle`, but it only spreads the caller's fields into `$set` and never recomputes the normalized fields. After a profile change, login/search by the new email or handle can fail or continue resolving the old values.
- Suggested fix direction: When `email` or `aydoHandle` is present in `userData`, set the corresponding normalized field in the same update. Add tests for email and handle changes followed by lookups.

### 5. One transient MongoDB error switches user storage to local fallback for the rest of the process

- File path: src/lib/user-storage.ts
- Line number(s): 12-16, 33-47, 64-68, 95-99, 237-244, 322-330
- Category: failure-point
- Severity: medium
- Description: After any MongoDB operation error, `usingFallback` is set to true and subsequent calls bypass MongoDB entirely. A transient network blip can make the process read/write stale local JSON for all users until restart, causing divergence from the primary database.
- Suggested fix direction: Limit fallback to the failed operation or add a retry/backoff health check that periodically returns to MongoDB. Avoid writing auth-critical user changes to local fallback after a transient primary-store failure unless there is an explicit reconciliation path.

### 6. User identity fields are not protected by unique indexes or storage-level duplicate checks

- File path: src/lib/mongo-indexes.ts, src/lib/user-storage.ts
- Line number(s): src/lib/mongo-indexes.ts:10-19; src/lib/user-storage.ts:169-181
- Category: failure-point
- Severity: high
- Description: The users collection creates non-unique indexes for `email`, `emailLower`, `aydoHandle`, `aydoHandleLower`, and `discordId`, and `createUser()` inserts without checking for existing identities. Duplicate email/handle/Discord ID records can be created, making authentication and profile sync resolve whichever duplicate happens to be found first.
- Suggested fix direction: Add unique indexes on normalized identity fields after cleaning existing duplicates, and treat duplicate-key errors as user-facing conflicts. Keep legacy non-normalized lookups only as migration fallbacks.

### 7. Local user storage reports success even when writes fail

- File path: src/lib/local-storage.ts
- Line number(s): 28-34, 57-72, 75-79
- Category: error
- Severity: medium
- Description: `writeUsers()` catches filesystem errors and only logs them. `createUser()`, `updateUser()`, and `deleteUser()` then return as if the write succeeded, so callers can report successful account changes that were never persisted.
- Suggested fix direction: Let write failures throw, and have callers return an error/false result. Prefer atomic temp-file-and-rename writes for local JSON fallback.

### 8. User-specific mission filters discard status and leader filters

- File path: src/lib/mission-storage.ts
- Line number(s): 142-169
- Category: bug
- Severity: medium
- Description: `getAllMissions()` builds `query.status` and `query.leaderId`, but when `filters.userId` is present it replaces the entire query with a new `$or`. A request for a user's missions with a specific status or leader silently ignores those earlier filters.
- Suggested fix direction: Combine the user `$or` with existing filters via `$and`, or append the `$or` as another property while preserving status/leader constraints.

### 9. Mission update fallback is documented but not implemented

- File path: src/lib/mission-storage.ts
- Line number(s): 324-336
- Category: stub
- Severity: medium
- Description: On `updateMission()` MongoDB failures, the code logs that it is falling back to local storage and contains `Optional: Implement fallback to local storage here if needed`, but then always throws. The surrounding module contains local storage helpers and a fallback flag, so this path is misleading and incomplete.
- Suggested fix direction: Either remove the fallback message/helpers and fail consistently, or implement the local update path with the same optimistic-locking semantics as MongoDB.

### 10. Operation storage writes to MongoDB but reads/deletes from local stubs

- File path: src/lib/operation-storage.ts
- Line number(s): 100-136, 160-188, 190-267, 269-295
- Category: stub
- Severity: high
- Description: `createOperation()` and `updateOperation()` use MongoDB when available, but `getOperationById()`, `getAllOperations()`, and `deleteOperation()` have placeholder comments and fall through to local JSON. In a healthy MongoDB environment, newly created operations can be written to MongoDB and then immediately be invisible to reads or undeletable by the same module.
- Suggested fix direction: Implement MongoDB read/list/delete paths before enabling Mongo writes, or force the whole module to a single storage backend until all CRUD operations are consistent.

### 11. Resource storage has placeholder MongoDB reads/lists/deletes while creates/updates use MongoDB

- File path: src/lib/resource-storage.ts
- Line number(s): 136-155, 157-185, 187-260, 262-334, 337-436
- Category: stub
- Severity: high
- Description: Most MongoDB branches contain `MongoDB implementation would go here` placeholders or `return null`, while `createResource()` and `updateResource()` do write to MongoDB. With MongoDB available, resources can be inserted into MongoDB but `getResourceById()` returns null and list/allocation operations use local JSON, causing resource inventory and allocation state to split across stores.
- Suggested fix direction: Complete MongoDB implementations for all resource and allocation operations, or disable MongoDB writes for this module until the fallback/local implementation is the sole source of truth.

### 12. Resource allocation is not atomic and can double-book resources

- File path: src/lib/resource-storage.ts
- Line number(s): 337-370, 373-397
- Category: failure-point
- Severity: medium
- Description: `allocateResource()` writes an allocation record, then separately loads and updates the resource status. There is no transaction or conditional update that verifies the resource is still available, and duplicate allocations for the same resource across different operations are not prevented.
- Suggested fix direction: Use a MongoDB transaction or a single conditional update such as `status: 'Available'` plus a unique allocation key. Return a conflict when the resource is already reserved.

### 13. Confirmed participant updates can lose concurrent edits

- File path: src/lib/planned-mission-storage.ts
- Line number(s): 605-645, 648-651
- Category: failure-point
- Severity: medium
- Description: `addConfirmedParticipant()` and `removeConfirmedParticipant()` read the whole mission, mutate the `confirmedParticipants` array in memory, and call `updatePlannedMission()` without an `expectedVersion`. Concurrent attendance confirmations can overwrite each other because the later write saves an array based on a stale read.
- Suggested fix direction: Use optimistic locking by passing the document version through these helpers, or use atomic array updates keyed by participant ID/OD ID.

### 14. Planned mission pagination accepts invalid page and pageSize values

- File path: src/lib/planned-mission-storage.ts
- Line number(s): 276-318, 323-336
- Category: failure-point
- Severity: medium
- Description: `getAllPlannedMissionsPaginated()` passes `(page - 1) * pageSize` directly to MongoDB `skip()` and `pageSize` to `limit()` without clamping. Negative, zero, or very large values can throw runtime errors or force expensive queries; the local fallback mirrors the same invalid range behavior.
- Suggested fix direction: Normalize `page >= 1`, bound `pageSize` to a safe maximum, and return a validation error at API boundaries for invalid pagination parameters.

### 15. Password reset token consumption is not atomic

- File path: src/lib/password-reset-storage.ts
- Line number(s): 112-130, 133-161
- Category: failure-point
- Severity: high
- Description: The storage API exposes separate `getResetTokenByToken()` and `markTokenAsUsed()` calls. `markTokenAsUsed()` only filters by `id` and sets `used: true`; it does not require `used: false` or unexpired state in the same atomic operation. Two concurrent reset requests can both read an unused token before either marks it used.
- Suggested fix direction: Replace the two-step flow with an atomic consume operation such as `findOneAndUpdate({ token, used: false, expiresAt: { $gt: now } }, { $set: { used: true } })`, and make the local fallback enforce equivalent behavior under a file lock.

### 16. Local password reset cleanup leaves used tokens on disk

- File path: src/lib/password-reset-storage.ts
- Line number(s): 164-196
- Category: bug
- Severity: low
- Description: The MongoDB cleanup removes expired or used tokens, but the local fallback only filters by `expiresAt > now`. Used-but-not-yet-expired tokens remain in the local JSON file until expiry, increasing exposure if the fallback file is read.
- Suggested fix direction: Match the MongoDB cleanup predicate in local storage by filtering out both expired and `used` tokens.

### 17. Auth rate-limit keys trust a spoofable client header

- File path: src/lib/rate-limit-store.ts
- Line number(s): 76-88
- Category: failure-point
- Severity: high
- Description: `getRateLimitKey()` uses the first `x-forwarded-for` value directly. If the app is reachable without a trusted proxy stripping that header, clients can send arbitrary IPs to bypass auth rate limits.
- Suggested fix direction: Derive the client IP from a trusted platform-provided source, or only honor `x-forwarded-for` after verifying the request came through the trusted proxy/CDN. Consider combining IP with account/email where appropriate.

### 18. Mongo-backed rate limiter can split counters across duplicate upserted documents

- File path: src/lib/rate-limit-store.ts, src/lib/mongo-indexes.ts
- Line number(s): src/lib/rate-limit-store.ts:49-73; src/lib/mongo-indexes.ts:103-110
- Category: failure-point
- Severity: high
- Description: The rate-limit update uses `findOneAndUpdate(..., { upsert: true })` with a filter on `{ key, windowStart: { $gte: windowStart } }`, but the indexes are not unique. Concurrent first requests for the same key/window can upsert separate documents, splitting counts and allowing more attempts than configured.
- Suggested fix direction: Store a deterministic bucket key such as `key + windowStartBucket`, enforce a unique index on it, and retry duplicate-key races by re-running the increment against the existing bucket.

### 19. In-memory rate limiter is per-process and never prunes old keys

- File path: src/lib/rate-limiter.ts
- Line number(s): 6-17, 29-37, 39-52, 55-57
- Category: failure-point
- Severity: medium
- Description: The Map-based limiter is process-local, so it does not protect scaled deployments consistently. Expired entries are only reset when the same key is seen again and are never deleted, allowing unbounded memory growth if attackers generate many unique keys.
- Suggested fix direction: Use the Mongo-backed limiter for auth/API paths, or add periodic pruning and document that this limiter is only a best-effort single-process guard.

### 20. Image validation exports a size limit but does not enforce it

- File path: src/lib/file-validation.ts
- Line number(s): 11-12, 36-65
- Category: failure-point
- Severity: medium
- Description: `MAX_IMAGE_SIZE` is defined as 5 MB, but `validateImageBuffer()` never checks `buffer.length`. Callers that rely on this helper for complete upload validation can accept oversized images as long as the magic bytes match an allowed image type.
- Suggested fix direction: Reject `buffer.length > MAX_IMAGE_SIZE` inside `validateImageBuffer()` or rename the helper to make clear it only validates file type. Keep route-level body limits as defense in depth.

### 21. Discord user sync can attach accounts using ambiguous fuzzy/contains matches

- File path: src/lib/discord-user-sync.ts
- Line number(s): 172-260, 318-360, 446-480
- Category: failure-point
- Severity: high
- Description: When no Discord ID or exact name match exists, the sync falls back to username, nickname, fuzzy-normalized handle, and finally substring matching. The first matching Discord member is accepted without checking uniqueness or confidence, then the website user is updated with that Discord ID and role-derived profile data. Similar handles can be linked to the wrong Discord account.
- Suggested fix direction: Only auto-link on stable IDs or exact unique matches. For fuzzy/contains matches, require manual review or return candidate matches with confidence and uniqueness checks.

### 22. Full Discord sync can downgrade a user's clearance to 1 when no mapped role is found

- File path: src/lib/discord-oauth.ts, src/lib/discord-user-sync.ts
- Line number(s): src/lib/discord-oauth.ts:120-146; src/lib/discord-user-sync.ts:345-357
- Category: bug
- Severity: high
- Description: `parseDiscordRoles()` always returns a numeric `clearanceLevel`, defaulting to 1 when no mapped position/pay grade is found. `syncAllUsersWithDiscord()` treats any truthy clearance value as authoritative, so a matched user with unmapped roles can have an existing higher clearance overwritten with 1.
- Suggested fix direction: Return `clearanceLevel: null/undefined` when no role mapping was found, or only update clearance when a recognized role/pay grade produced it. Preserve existing clearance for unmatched role sets.

### 23. Single-user Discord sync omits clearance updates

- File path: src/lib/discord-user-sync.ts
- Line number(s): 461-480
- Category: bug
- Severity: medium
- Description: `syncSingleUserWithDiscord()` parses Discord roles but only writes division, position, and pay grade. Unlike the full sync path, it never writes `clearanceLevel`, so a manual/single-user sync can leave authorization stale even after roles change.
- Suggested fix direction: Apply the same guarded clearance update logic in both full and single-user sync paths.

### 24. Discord role monitor can run overlapping role-check cycles

- File path: src/lib/discord-role-monitor.ts
- Line number(s): 27-40, 69-130
- Category: failure-point
- Severity: medium
- Description: `start()` fires `this.checkAllUserRoles()` without awaiting it and schedules another call every 10 minutes regardless of whether the previous cycle has finished. Slow Discord/member fetches or database updates can overlap, causing duplicate writes, rate-limit pressure, and inconsistent logs.
- Suggested fix direction: Add an in-flight guard or queue so only one role-check cycle runs at a time. Await/log the immediate run and skip scheduled ticks when a prior cycle is still active.

### 25. Discord role monitor cleanup does not await the async Discord client destroy

- File path: src/lib/discord-role-monitor.ts, src/lib/discord-role-monitor-init.ts, src/lib/discord.ts
- Line number(s): src/lib/discord-role-monitor.ts:48-63; src/lib/discord-role-monitor-init.ts:41-45; src/lib/discord.ts:395-404
- Category: error
- Severity: low
- Description: `DiscordService.cleanup()` is async, but `DiscordRoleMonitor.stop()` is synchronous and calls it without `await` or `.catch()`. Shutdown can report success before the client is destroyed, and destroy failures can become unhandled rejections.
- Suggested fix direction: Make `stop()` and `cleanupDiscordRoleMonitor()` async, await client cleanup, and log cleanup failures explicitly.

### 26. Discord bot initialization can hang indefinitely

- File path: src/lib/discord.ts
- Line number(s): 107-143
- Category: failure-point
- Severity: medium
- Description: `initializeBot()` returns a Promise that resolves on `ready` or rejects on the first `error`/login failure, but there is no timeout. If Discord.js neither reaches ready nor emits an error (network stall, gateway issue), callers such as member lookups and role monitoring can hang forever.
- Suggested fix direction: Race the login/ready flow against a configurable timeout, clean up the client on timeout, and surface a controlled error to callers.

### 27. Discord scheduled-event updates cannot clear optional fields

- File path: src/lib/discord.ts
- Line number(s): 264-279
- Category: bug
- Severity: low
- Description: `updateScheduledEvent()` only writes `scheduled_end_time`, `entity_metadata.location`, and `image` when the supplied values are truthy. Callers cannot intentionally clear an end time, location, or image by passing an empty string/null-equivalent value, and stale Discord event data can remain.
- Suggested fix direction: Use explicit `!== undefined` checks and define how null/empty values should map to Discord's field-clearing semantics.

### 28. Discord event IDs are converted to unsafe JavaScript numbers

- File path: src/lib/eventMapper.ts
- Line number(s): 42-56, 194-200, 223-226
- Category: bug
- Severity: medium
- Description: Discord snowflake IDs are large strings. `Number.parseInt(discordEvent.id, 36)` produces values far beyond `Number.MAX_SAFE_INTEGER`, so precision can be lost and different events/recurring instances can collide. The later source lookup also relies on the same lossy numeric comparison.
- Suggested fix direction: Keep event IDs as strings, or hash Discord ID plus occurrence date into a bounded safe integer/string key. Avoid numeric conversions of snowflakes for identity.

### 29. Timezone conversion changes the absolute instant and is unsafe for recurrence calculations

- File path: src/lib/timezone.ts, src/lib/eventMapper.ts
- Line number(s): src/lib/timezone.ts:29-45; src/lib/eventMapper.ts:171-181
- Category: bug
- Severity: medium
- Description: `convertToUserTimezone()` formats a UTC instant to a locale string in the target zone and then parses that string back into a Date in the server's local timezone. The returned Date is not the same instant and depends on host locale/timezone parsing. `eventMapper` uses this derived Date to calculate weekday shifts, so recurring events can be placed on the wrong UTC day around timezone offsets and DST.
- Suggested fix direction: Use `Intl.DateTimeFormat.formatToParts()` or a timezone-aware date library to extract local calendar fields without reparsing locale strings. Keep UTC instants and local calendar fields separate.

### 30. Ship search regex fallback uses raw user search text

- File path: src/lib/ship-storage.ts
- Line number(s): 481-510
- Category: failure-point
- Severity: high
- Description: If the `$text` query fails, `findShips()` falls back to `{ name: { $regex: search, $options: 'i' } }` using the raw search string. User-controlled regex metacharacters can change query semantics or trigger expensive regex evaluation in MongoDB.
- Suggested fix direction: Escape the search string before building a regex, or use a bounded literal search strategy. Consider limiting search length and rejecting pathological patterns.

### 31. Ship pagination accepts invalid page and pageSize values

- File path: src/lib/ship-storage.ts
- Line number(s): 430-480, 494-510
- Category: failure-point
- Severity: medium
- Description: `findShips()` directly computes `skip = (page - 1) * pageSize` and passes `pageSize` to `limit()` without validation. Negative or zero values can throw or produce misleading `totalPages`, and excessive values can cause expensive reads.
- Suggested fix direction: Clamp page to at least 1, bound pageSize to a safe maximum, and validate these constraints at API boundaries.

### 32. Ship sync lacks per-ship error isolation around transform and mirroring

- File path: src/lib/ship-sync.ts
- Line number(s): 255-283, 293-357, 373-376
- Category: failure-point
- Severity: high
- Description: The sync loop catches Zod validation failures, but `transformFleetYardsShip()` and `mirrorShipAssets()` are awaited without a per-record try/catch. A single transform or R2/image mirroring exception aborts the whole sync before the audit status is built and saved, even though the comments say malformed records should be skipped without blocking other ships.
- Suggested fix direction: Wrap transform/mirror work for each ship in a try/catch, append a compact per-ship error, continue processing remaining ships, and save a partial sync status at the end.
