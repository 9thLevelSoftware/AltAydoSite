# Hooks & Types Review

Scope: custom React hooks and TypeScript type definitions listed in kanban task t_f7b9f954.

Review date: 2026-06-27

## Summary

Findings: 22

Severity breakdown:
- Critical: 0
- High: 4
- Medium: 13
- Low: 5

Type-check verification:
- Ran `npm run type-check -- --pretty false` from `/Users/christopherwilloughby/AltAydoSite`.
- Result: failed before project type analysis because `tsconfig.json` uses deprecated TypeScript 6 options (`moduleResolution=node10`, `baseUrl`) without `ignoreDeprecations`. No source fixes were attempted.

## Findings

### 1. Pending confirmations can be orphaned by overlapping calls

- File path: `src/hooks/useConfirmDialog.ts`
- Line number(s): 24-28, 31-40
- Category: bug
- Severity: medium
- Description: `confirm()` stores a single resolver in `resolveRef`. If a second confirmation is opened before the first is answered, the second resolver overwrites the first and the first Promise never resolves. Any caller awaiting the first confirmation can hang indefinitely, including destructive-action flows.
- Suggested fix direction: Reject/resolve the previous pending confirmation before replacing it, queue dialogs, or prevent a new confirmation while one is already open. Also resolve pending confirmations on provider unmount.

### 2. Event fetch assumes a successful JSON shape before checking response status

- File path: `src/hooks/useEvents.ts`
- Line number(s): 56-70
- Category: error
- Severity: medium
- Description: The hook parses `response.json()` and immediately reads `data.events.length` without checking `response.ok` or verifying that `events` exists. A 401/500 response, HTML error response, or JSON error object without `events` will throw a secondary TypeError and obscure the actual API error.
- Suggested fix direction: Check `response.ok` before parsing the success shape, parse error bodies defensively, and validate `Array.isArray(data.events)` before reading `.length`.

### 3. `refreshWithTimezone()` resolves before events are refreshed

- File path: `src/hooks/useEvents.ts`
- Line number(s): 106-112
- Category: bug
- Severity: low
- Description: `refreshWithTimezone()` awaits `refetchTimezone()` but then schedules `fetchEvents()` in `setTimeout` and returns immediately. Callers that await `refreshWithTimezone()` can observe stale events/loading state, and errors from the delayed fetch are detached from the returned Promise.
- Suggested fix direction: Make the method await the event refetch directly after timezone state is available, or return a Promise that resolves/rejects after the delayed fetch completes. Prefer passing the refreshed timezone explicitly instead of relying on a timer.

### 4. Focus trap allows keyboard escape when a dialog has no focusable children

- File path: `src/hooks/useFocusTrap.ts`
- Line number(s): 40-43
- Category: failure-point
- Severity: medium
- Description: When the active container has no matching focusable elements, Tab handling returns without `preventDefault()`. This lets keyboard focus leave the modal/trap entirely, breaking accessibility and allowing users to interact with background UI while a modal is open.
- Suggested fix direction: Prevent Tab when no focusable elements exist and keep focus on the container. Consider making the container programmatically focusable (`tabIndex={-1}`) and listening at the document level while active.

### 5. Batch ship hook dependency key can collide and hides dependency issues

- File path: `src/hooks/useShipBatch.ts`
- Line number(s): 124-125
- Category: bug
- Severity: low
- Description: The effect depends on `ids.join(',')` and disables exhaustive-deps. Different ID arrays can produce the same joined string when an ID contains a comma, so the hook can skip a required refetch. The disabled lint rule also hides future dependency mistakes.
- Suggested fix direction: Require callers to pass a memoized array and depend on `ids`, or derive a collision-safe stable key with `JSON.stringify(validIds)` after normalizing IDs.

### 6. Batch ship failures leave stale ship data visible

- File path: `src/hooks/useShipBatch.ts`
- Line number(s): 101-110
- Category: failure-point
- Severity: medium
- Description: On fetch failure the hook sets `error` but does not clear `ships`. Consumers can render a previous successful batch while showing an error for the current request, which is especially misleading when the requested IDs changed.
- Suggested fix direction: Clear `ships` when a non-abort error occurs, or return request identity with the data so consumers can distinguish stale data from current results.

### 7. Ship detail requests interpolate raw IDs into the URL path

- File path: `src/hooks/useShipDetail.ts`
- Line number(s): 57
- Category: bug
- Severity: medium
- Description: `shipId` is inserted directly into `/api/ships/${shipId}`. Slugs or IDs containing `/`, `?`, `#`, `%`, or other reserved URL characters can change the route being requested or produce malformed requests.
- Suggested fix direction: Use `encodeURIComponent(shipId)` when constructing the URL path segment.

### 8. Ship detail failures can display the previous ship

- File path: `src/hooks/useShipDetail.ts`
- Line number(s): 68-77
- Category: failure-point
- Severity: medium
- Description: A successful request sets `ship`, but a later failed request for a different `shipId` only sets `error`; it does not clear the previous `ship`. Detail views can therefore show stale ship information for the wrong ID.
- Suggested fix direction: Clear `ship` when starting a request for a new ID or when a non-abort error occurs.

### 9. Ship list failures can display stale results for new filters

- File path: `src/hooks/useShips.ts`
- Line number(s): 91-101
- Category: failure-point
- Severity: medium
- Description: When a filtered ship request fails, the hook sets `error` but leaves `data` from the prior successful filter/page. Consumers may render old results under the new filter controls.
- Suggested fix direction: Clear `data` when a request starts or when a non-abort error occurs, or include the filters used to produce the returned data.

### 10. Sync status polling silently serves stale health data after failures

- File path: `src/hooks/useSyncStatus.ts`
- Line number(s): 60-66
- Category: failure-point
- Severity: low
- Description: Non-OK responses and thrown errors are swallowed without clearing `syncStatus` or exposing an error state. After an initial success, later API failures leave the UI showing stale sync health as if it were current.
- Suggested fix direction: Track `lastCheckedAt` and an error/stale flag, or clear `syncStatus` after failed polls so the UI can communicate that freshness is unknown.

### 11. Profile hook can retain the previous user's profile after session changes

- File path: `src/hooks/useUserProfile.ts`
- Line number(s): 71-84, 165-166
- Category: bug
- Severity: high
- Description: `hasFetchedRef` is global for the hook instance, not keyed by user/session. If the session changes from one authenticated user to another without first becoming unauthenticated, the effect returns early and leaves the previous user's profile in state/local cache. This is a privacy and authorization boundary failure in shared-browser or account-switching flows.
- Suggested fix direction: Track the fetched email/user ID in a ref and refetch whenever it changes. Clear profile and reset version state before loading the new user's data.

### 12. Failed profile saves leave optimistic localStorage as the source of truth

- File path: `src/hooks/useUserProfile.ts`
- Line number(s): 173-190, 212-218
- Category: failure-point
- Severity: medium
- Description: `updateProfile()` writes the optimistic update to React state and localStorage before the server confirms the save. On non-409 failures or network errors it only shows a toast; it does not roll back state/localStorage or mark the profile dirty. A reload can resurrect unsaved data from localStorage and mask that the server rejected it.
- Suggested fix direction: Keep pending updates separate from confirmed server state, roll back or mark unsynced changes on failure, and only promote localStorage cache after a successful server response.

### 13. Concurrent profile updates can race and overwrite newer changes

- File path: `src/hooks/useUserProfile.ts`
- Line number(s): 169-220
- Category: bug
- Severity: medium
- Description: Multiple rapid `updateProfile()` calls each capture the current `profile` and shared `versionRef`. Responses can arrive out of order; a 409 refresh from an older request can overwrite newer optimistic changes, and successful older responses can advance `versionRef` after newer requests were already sent.
- Suggested fix direction: Serialize saves, coalesce updates through a reducer/mutation queue, or tag requests and ignore stale responses. Use server-returned full profile/version to reconcile deterministically.

### 14. Timezone hook never fetches the signed-in user's timezone after unauthenticated initialization

- File path: `src/hooks/useUserTimezone.ts`
- Line number(s): 21-26, 62-67
- Category: bug
- Severity: high
- Description: If the hook initializes while unauthenticated, it sets `hasInitialized.current = true` and returns UTC. When the user signs in later, the effect does not fetch `/api/profile` because initialization is already marked complete. The same pattern can also miss account switches.
- Suggested fix direction: Key initialization by session user ID/email and reset it when authentication status or user identity changes. Alternatively remove the one-shot guard and let the `useCallback` dependencies drive refetches.

### 15. Discord recurrence rules are typed as `any`

- File path: `src/types/DiscordEvent.ts`
- Line number(s): 25
- Category: failure-point
- Severity: low
- Description: `recurrence_rule?: any` disables type checking at the boundary for recurring Discord events. Consumers can access non-existent fields or pass malformed recurrence data without compiler feedback.
- Suggested fix direction: Replace `any` with a narrow interface for Discord recurrence rules, or use `unknown` plus a parser/validator before consuming the value.

### 16. Escort request priority filter type accepts any string

- File path: `src/types/EscortRequest.ts`
- Line number(s): 43-46
- Category: bug
- Severity: low
- Description: `priority?: string | 'all'` simplifies to `string`, so invalid priority values compile and can be sent to filtering logic/API calls. This defeats the purpose of the specific `EscortRequest.priority` union.
- Suggested fix direction: Type it as `priority?: EscortRequest['priority'] | 'all'`.

### 17. Confirmed participant identity field appears misspelled and becomes persisted API shape

- File path: `src/types/PlannedMission.ts`
- Line number(s): 45-47
- Category: bug
- Severity: medium
- Description: `ConfirmedParticipant` uses `odId` for the participant identifier while the comment says "Discord or User ID". The misspelled field is used elsewhere as persisted shape, which makes the API hard to interoperate with and invites bugs from consumers naturally using `id`, `discordId`, or `userId`.
- Suggested fix direction: Introduce a correctly named `participantId`/`identityId` field and migrate storage/API consumers, or document and alias the legacy `odId` field during migration.

### 18. Profile timezone values are inconsistent with timezone conversion helpers

- File path: `src/types/UserProfile.ts`, `src/hooks/useUserProfile.ts`, `src/hooks/useUserTimezone.ts`
- Line number(s): `src/types/UserProfile.ts` 37-63; `src/hooks/useUserProfile.ts` 10-18; `src/hooks/useUserTimezone.ts` 11, 21-24, 47-50
- Category: bug
- Severity: medium
- Description: `UserProfile` exposes UTC offset strings like `UTC+00:00`, `useUserProfile` defaults to `UTC+00:00`, and `useUserTimezone` defaults to `UTC`. Elsewhere in the project, timezone conversion expects IANA timezone IDs such as `America/New_York`. Offset strings like `UTC+00:00` are invalid for `Intl` `timeZone` conversion and will fall back to UTC or fail to match dropdown options.
- Suggested fix direction: Standardize on IANA timezone IDs (including `UTC`) across profile types, defaults, dropdown options, and migrations. If offsets must remain, handle them separately from `Intl` `timeZone` values.

### 19. Password reset token model stores the raw reset secret

- File path: `src/types/password-reset.ts`
- Line number(s): 1-8
- Category: failure-point
- Severity: high
- Description: The model includes `token: string` as the persisted reset token. The storage layer uses this shape to insert and look up raw reset tokens, so a database or fallback JSON-file leak would expose live password-reset credentials until expiry/use.
- Suggested fix direction: Store only a cryptographic hash of the reset token (`tokenHash`) with expiry/use metadata. Compare submitted tokens by hashing them with a constant-time comparison and never return the raw token after creation.

### 20. Local user creation does not enforce unique email or handle

- File path: `src/utils/userService.ts`
- Line number(s): 61-95, 98-110
- Category: bug
- Severity: high
- Description: `createUser()` always generates a new ID and saves it without checking for an existing email or Aydo handle. `getUserByEmail()` and `getUserByHandle()` then return the first case-insensitive match, making duplicates possible and authentication/profile lookup ambiguous.
- Suggested fix direction: Check normalized email and handle uniqueness before creating a user, enforce uniqueness in the backing store, and return a clear conflict error instead of inserting duplicates.

### 21. Local user JSON writes are read-modify-write without locking or atomic replace

- File path: `src/utils/userService.ts`
- Line number(s): 46-58, 117-139, 144-161, 173-200, 205-232
- Category: failure-point
- Severity: medium
- Description: Mutations read the whole `users.json`, modify it in memory, and write it back synchronously with `fs.writeFileSync`. Concurrent requests can interleave and lose updates; process crashes during write can also leave a partially written JSON file.
- Suggested fix direction: Use a database for mutable user data, or at minimum serialize file writes with a lock and write to a temp file followed by atomic rename.

### 22. Legacy user service exposes server-only dependencies from a generic `src/utils` module

- File path: `src/utils/userService.ts`
- Line number(s): 1-13
- Category: failure-point
- Severity: low
- Description: The module imports `fs`, `path`, `bcrypt`, and `crypto` at top level and only guards execution with `isBrowser`. If this utility is accidentally imported by client code, the client bundle/build can fail before the runtime guard helps.
- Suggested fix direction: Move this service under a server-only module path, add `import 'server-only'`, and keep browser-safe types/helpers separate from filesystem/bcrypt logic.

## Files reviewed with no concrete issues found

- `src/types/Mission.ts`
- `src/types/MissionPlanning.ts`
- `src/types/Operation.ts`
- `src/types/Resource.ts`
- `src/types/mission-builder.ts`
- `src/types/next-auth.d.ts`
- `src/types/user.ts`
- `src/hooks/useToast.ts`

Some files above are simple type declarations or context wrappers; no actionable bug/stub/error/failure point was found within the assigned scope.
