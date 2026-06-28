# Ship & Mission Libraries Review

Task: t_782db322
Scope: ship libraries (FleetYards, formatting, images, mappers, R2) and mission libraries (builder, requirements, storage, state machine).

Reviewed files:
- src/lib/fleetyards/client.ts
- src/lib/fleetyards/transform.ts
- src/lib/fleetyards/types.ts
- src/lib/ships/format.ts
- src/lib/ships/image.ts
- src/lib/ships/mappers.ts
- src/lib/ships/r2-health.ts
- src/lib/ships/r2-image-mirror.ts
- src/lib/mission-builder/selectors.ts
- src/lib/mission-builder/store.tsx
- src/lib/mission-builder/validation.ts
- src/lib/mission-requirements.ts
- src/lib/mission-storage.ts
- src/lib/state-machines/mission-status.ts

Summary:
- Total findings: 21
- Severity breakdown: critical 0, high 6, medium 10, low 5
- Category breakdown: bug 7, stub 3, error 1, failure-point 10

Verification notes:
- All assigned files were read end-to-end.
- `npm run type-check -- --pretty false` is currently blocked by TypeScript 6 deprecation errors in tsconfig.
- `npx tsc --noEmit --pretty false --ignoreDeprecations 6.0` then fails at repository level because node_modules/dependency type declarations are missing in this checkout, so type-check results could not be used as a clean signal for these files.

## Findings

### 1. src/lib/fleetyards/client.ts:109-120, 237-243
- Category: failure-point
- Severity: medium
- Description: FleetYards page requests use bare `fetch` with no timeout or abort signal. A hung TCP connection, stalled TLS handshake, or upstream response that never completes can block the whole ship sync indefinitely before retry/error handling is reached.
- Suggested fix direction: Add an AbortController/AbortSignal timeout around each fetch attempt and classify timeout as retryable. Make the timeout configurable and include it in logs.

### 2. src/lib/fleetyards/client.ts:128-139
- Category: failure-point
- Severity: medium
- Description: `Retry-After` handling only uses `parseInt` and applies the resulting delay without a maximum cap. RFC-compliant HTTP-date values are ignored and a very large integer can suspend the worker for an unbounded time.
- Suggested fix direction: Support both delta-seconds and HTTP-date Retry-After forms, clamp to a sane maximum, and log when values are invalid or capped.

### 3. src/lib/fleetyards/client.ts:300-308
- Category: failure-point
- Severity: low
- Description: Pagination follows the `Link` header `rel="next"` URL verbatim. If the upstream API or an intermediary returns a hostile absolute URL, the server-side sync will fetch an arbitrary host.
- Suggested fix direction: Validate that parsed next URLs stay on the expected FleetYards API origin/path before fetching, or ignore absolute Link URLs and construct the next page URL from trusted pagination metadata.

### 4. src/lib/fleetyards/transform.ts:92-106
- Category: bug
- Severity: low
- Description: `extractImageUrl` trims only for emptiness checks but returns the original untrimmed URL. Leading/trailing whitespace from FleetYards data can persist into MongoDB and later break image URL parsing, optimization, or mirroring.
- Suggested fix direction: Return the trimmed value for both string fields and object image URL fields after validating it is non-empty.

### 5. src/lib/ships/format.ts:20-28
- Category: failure-point
- Severity: low
- Description: Invalid timestamps and future timestamps both render as `just now`. This masks data corruption or clock/timezone problems in sync-status UI and makes bad dates look healthy.
- Suggested fix direction: Distinguish invalid input from future dates; return `Unknown`/`Invalid date` for unparsable values and optionally `in the future` or an absolute date for future values.

### 6. src/lib/ships/image.ts:81-83
- Category: stub
- Severity: medium
- Description: `getShipPlaceholder()` is a placeholder function that returns an empty string. `resolveShipImage()` therefore returns `''` when no image exists, causing broken image requests or blank UI instead of a real fallback asset.
- Suggested fix direction: Return a stable local placeholder path or data-safe asset URL, and ensure callers can render it without hitting the remote optimizer unexpectedly.

### 7. src/lib/ships/r2-image-mirror.ts:237-241
- Category: failure-point
- Severity: high
- Description: `downloadImage` fetches `sourceUrl` directly with no scheme, host allowlist, DNS/IP private-network checks, or URL normalization. If FleetYards data, imported ship data, or prior stored data contains a malicious URL, the server can be induced to fetch internal services or metadata endpoints.
- Suggested fix direction: Reject non-http(s) URLs, enforce an allowlist of expected image/CDN hosts or a vetted proxy policy, block localhost/private/link-local IP ranges after DNS resolution, and log rejected URLs without fetching them.

### 8. src/lib/ships/r2-image-mirror.ts:30-38, 248-251
- Category: failure-point
- Severity: high
- Description: SVG files are accepted and mirrored as `image/svg+xml` without sanitization. Mirroring attacker-controlled SVG into the public image bucket can create stored script/content injection risk when users open the asset directly or if a rendering path ever inlines/allows SVG.
- Suggested fix direction: Either disallow SVG from the mirror pipeline or sanitize it with a proven SVG sanitizer and serve it with restrictive headers. Prefer rasterizing SVG to a safe format if SVG support is required.

### 9. src/lib/ships/r2-image-mirror.ts:309-318
- Category: bug
- Severity: medium
- Description: Existing mirrored URLs are reused solely when `previous.sourceUrl === sourceUrl`. If the source URL is stable but its content changes, the mirror never redownloads it and users keep seeing stale R2 content.
- Suggested fix direction: Include upstream version metadata, ETag/Last-Modified checks, or a forced refresh policy keyed by FleetYards `updatedAt`/sync version before reusing prior mirrored assets.

### 10. src/lib/mission-builder/selectors.ts:12-17
- Category: bug
- Severity: medium
- Description: `selectShipCount` deduplicates by `shipId`, so two non-ground-support participants assigned the same ship/model ID are counted as one ship. Mission summaries can underreport actual ship assignments/slots.
- Suggested fix direction: Clarify whether the selector should count unique ship models or assigned ship slots. If the UI label is ship count, count participants with a ship (or explicit quantities) rather than unique IDs; otherwise rename the selector/label to `selectUniqueShipTypeCount`.

### 11. src/lib/mission-builder/store.tsx:151-162
- Category: stub
- Severity: high
- Description: `save()` is explicitly a placeholder: it validates, sleeps 50ms, marks status as `saved`, and returns success without performing network I/O or persistence. Any UI using this hook can tell users a mission was saved while no data was written.
- Suggested fix direction: Replace the placeholder with a real API/storage call or remove/disable the save affordance until wired. Return a clear not-implemented error instead of `ok: true` if persistence is unavailable.

### 12. src/lib/mission-builder/store.tsx:151-162
- Category: bug
- Severity: medium
- Description: Successful `save()` sets status to `saved` but never clears `dirty`. Even after a real save is wired, the state will continue to indicate unsaved changes and can trigger redundant prompts or repeated saves.
- Suggested fix direction: Add a reducer action for successful save that atomically sets `status: 'saved'`, clears `dirty`, and optionally updates mission metadata from the persisted response.

### 13. src/lib/mission-builder/validation.ts:45-56
- Category: bug
- Severity: high
- Description: `participantDraftSchema` omits the `fleetyardsId` field that exists on `MissionParticipantDraft`. Zod objects strip unknown keys by default, so validation/coercion/save paths drop the canonical FleetYards UUID from participants.
- Suggested fix direction: Add `fleetyardsId: z.string().optional()` to the schema or make the schema passthrough intentionally. Add a regression test that a participant's FleetYards UUID survives `validateMissionDraft` and `coerceToMissionDraft`.

### 14. src/lib/mission-builder/validation.ts:62-64
- Category: failure-point
- Severity: medium
- Description: `scheduledDateTime` claims to require an ISO date string but only checks `Date.parse`. JavaScript accepts many non-ISO and environment-dependent formats, so malformed schedules can pass validation and later behave differently across runtimes/timezones.
- Suggested fix direction: Use a stricter ISO datetime schema, such as `z.string().datetime({ offset: true })`, or a custom regex/parser that accepts only the app's canonical timestamp format.

### 15. src/lib/mission-builder/validation.ts:104-106
- Category: error
- Severity: medium
- Description: `coerceToMissionDraft` is documented as accepting partial/legacy shapes, but it calls `missionDraftSchema.parse` on required fields with no fallback defaults for name/type/status/scheduledDateTime. Partial data can throw synchronously and crash a provider/reducer load path.
- Suggested fix direction: Either change the signature/comment to require a complete draft and catch parse failures at call sites, or implement true legacy coercion with defaults plus `safeParse` error handling.

### 16. src/lib/mission-requirements.ts:136-148
- Category: failure-point
- Severity: low
- Description: `cloneShipRequirements` and `clonePersonnelRequirements` copy persisted requirement objects without validating category/profession enum values or count bounds. Corrupt or legacy data can propagate negative/zero counts or invalid labels into Discord descriptions and UI summaries.
- Suggested fix direction: Sanitize requirements at this boundary: keep only known enum values, coerce counts to positive integers, and drop or report invalid entries.

### 17. src/lib/mission-storage.ts:150-168
- Category: bug
- Severity: high
- Description: `getAllMissions` builds status/leader filters and then overwrites the entire query when `filters.userId` is present. Requests that combine `userId` with `status` or `leaderId` silently ignore the earlier filters and return all missions involving that user across statuses/leaders.
- Suggested fix direction: Compose filters with `$and`, preserving status/leader constraints alongside the `$or` membership condition.

### 18. src/lib/mission-storage.ts:243-282, 297-312
- Category: bug
- Severity: high
- Description: `updateMission` supports optimistic locking through `expectedVersion`/`__v`, but mission responses created by get/create/update omit `__v` or a public `version` field. Clients cannot know the current version to send back, so the locking path is effectively unusable and concurrent updates can remain last-write-wins.
- Suggested fix direction: Expose a stable `version` field mapped from `__v` in all MissionResponse transforms, accept that field from clients/routes as `expectedVersion`, and keep stripping it from `$set` data.

### 19. src/lib/mission-storage.ts:264-280
- Category: failure-point
- Severity: medium
- Description: `updateMission` spreads arbitrary `missionData` fields into `$set` after removing only `id`, `_id`, and `__v`. Any unvalidated client/internal field can be persisted to mission documents, including fields outside the MissionResponse contract.
- Suggested fix direction: Build updates from an explicit allowlist of mission fields and validate each field before writing. Reject unknown keys rather than storing them.

### 20. src/lib/mission-storage.ts:15-77, 366-368
- Category: stub
- Severity: low
- Description: Local fallback storage functions and `usingFallbackStorage` remain in the module, but the exported MongoDB operations never call them or set the flag. `isUsingFallbackStorage()` therefore always returns false and the fallback code is dead/misleading.
- Suggested fix direction: Remove the fallback code if MongoDB is mandatory, or restore a coherent fallback path that sets/clears the flag consistently and is covered by tests.

### 21. src/lib/state-machines/mission-status.ts:50-51
- Category: failure-point
- Severity: medium
- Description: `getValidTransitions` returns the actual mutable arrays stored in `MISSION_STATUS_TRANSITIONS`. A caller can mutate the returned array and globally alter future transition validation at runtime.
- Suggested fix direction: Return a defensive copy (`[...MISSION_STATUS_TRANSITIONS[from]]`) or freeze the transition table/arrays.

## Files with no concrete findings in this pass

- src/lib/fleetyards/types.ts
- src/lib/ships/mappers.ts
- src/lib/ships/r2-health.ts
