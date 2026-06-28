# API Routes Review - Fleet Ops & Missions

Task: t_fb07807d
Scope: 15 assigned route files under src/app/api/fleet-ops and src/app/api/planned-missions

Review notes:
- Read every assigned file in full.
- Checked related storage/types/auth dependencies needed to validate route behavior: planned-mission-storage.ts, operation-storage.ts, resource-storage.ts, Mission.ts, Operation.ts, Resource.ts, PlannedMission.ts, auth-guards.ts.
- Searched assigned route trees for TODO/FIXME/HACK/placeholder comments; none were present in the assigned files.
- Ran a targeted TypeScript check command and no type-check output matched the assigned route/storage/type files.

Severity breakdown:
- Critical: 0
- High: 15
- Medium: 15
- Low: 6
- Total findings: 36

## Findings

### 1. src/app/api/fleet-ops/force-fallback/route.ts: lines 7-27
- Category: failure-point
- Severity: high
- Description: Any authenticated user can POST `force-local` or `reset` and change process-wide storage behavior for fleet operations. This is an administrative runtime control but there is no leadership/admin clearance check.
- Suggested fix direction: Require an admin/leadership guard such as `requireLeadership()` or a stricter admin-only clearance before allowing storage-mode changes. Audit and log the actor and action.

### 2. src/app/api/fleet-ops/missions/route.ts: lines 55-80
- Category: failure-point
- Severity: high
- Description: The list endpoint returns missions to any authenticated user and accepts arbitrary `leaderId`/`status` filters without scoping non-leadership users to missions they lead or participate in. This can expose fleet mission details across users.
- Suggested fix direction: Use the centralized auth guard and apply access scoping: leadership can list all; other users should only see missions where they are leader/participant or otherwise explicitly authorized.

### 3. src/app/api/fleet-ops/missions/route.ts: lines 109-136
- Category: bug
- Severity: high
- Description: Mission creation is allowed for any authenticated user and only checks that `name`, `type`, and `scheduledDateTime` exist. The stricter `validateMissionData()` helper is never called, so invalid mission types/statuses/participants can be persisted.
- Suggested fix direction: Require the intended clearance/role for mission creation and run full schema validation before calling storage. Remove unused validation code or wire it in.

### 4. src/app/api/fleet-ops/missions/route.ts: lines 155-212
- Category: failure-point
- Severity: high
- Description: Mission updates are allowed for any authenticated user who knows a mission ID. The route only validates status transitions if `status` is present and otherwise passes arbitrary fields through to storage.
- Suggested fix direction: Load the existing mission, verify the actor is leader/participant with update rights or leadership, whitelist mutable fields, and validate all supplied fields.

### 5. src/app/api/fleet-ops/missions/route.ts: lines 231-259
- Category: failure-point
- Severity: high
- Description: Mission deletion is allowed for any authenticated user who supplies an `id` query parameter. There is no ownership, leader, or leadership permission check.
- Suggested fix direction: Require mission delete permission, usually creator/leader plus leadership override, before calling `deleteMission()`.

### 6. src/app/api/fleet-ops/missions/route.ts: lines 83-96
- Category: failure-point
- Severity: low
- Description: `page` and `pageSize` are parsed with `parseInt` but not checked for `NaN`. Inputs such as `?page=x&pageSize=y` can produce `NaN` pagination metadata and unpredictable slicing behavior.
- Suggested fix direction: Normalize parsed numbers with `Number.isFinite()` and fall back to defaults before computing offsets and response metadata.

### 7. src/app/api/fleet-ops/operations/assign-ship/route.ts: lines 15 and 37-58
- Category: error
- Severity: medium
- Description: `missionId` is converted with `new ObjectId(missionId)` in both the conflict query and update filter without validation. A malformed ID throws and returns a 500 instead of a client error.
- Suggested fix direction: Validate `ObjectId.isValid(missionId)` before conversion or support string IDs consistently. Return 400 for invalid IDs.

### 8. src/app/api/fleet-ops/operations/assign-ship/route.ts: lines 36-69
- Category: bug
- Severity: high
- Description: Ship conflict detection and assignment are separate MongoDB operations with no transaction, conditional update, or unique index. Concurrent requests can both pass the conflict check and assign the same ship to two active missions.
- Suggested fix direction: Enforce uniqueness at the database level for active ship assignments or perform the check/update in a transaction with appropriate write concern.

### 9. src/app/api/fleet-ops/operations/assign-ship/route.ts: lines 37-41
- Category: bug
- Severity: medium
- Description: Conflict detection only checks statuses `Planning`, `Active`, and `Scheduled`, but the legacy mission status type uses `Briefing`, `In Progress`, `Debriefing`, etc. A ship can be double-booked for missions in omitted active-like statuses.
- Suggested fix direction: Align the active status list with the mission model/state machine and include all statuses where ship assignment conflicts should apply.

### 10. src/app/api/fleet-ops/operations/images/[id]/route.ts: lines 39-75 and 83-122
- Category: failure-point
- Severity: high
- Description: Any authenticated user can fetch any mission image by ID from MongoDB or local storage. The route does not verify that the requester can access the mission associated with the image.
- Suggested fix direction: Store/read the image's mission/operation ID and apply the same participant/leader/leadership access check used for mission details before streaming image bytes.

### 11. src/app/api/fleet-ops/operations/images/[id]/route.ts: lines 45-58 and 86-95
- Category: failure-point
- Severity: medium
- Description: `imageId` is used directly to build local metadata paths and Mongo filters without format validation. In the local path, this increases exposure to path traversal or unexpected file lookups if encoded path separators or tampered metadata are accepted.
- Suggested fix direction: Accept only known ID formats such as UUID/ObjectId via a strict regex, normalize and verify local paths stay under `imagesDir`, and never trust metadata `storagePath` without containment checks.

### 12. src/app/api/fleet-ops/operations/route.ts: lines 17-27 and 99-113
- Category: failure-point
- Severity: medium
- Description: Operation creation accepts any status in the enum, including terminal states, and does not validate `plannedDateTime` as a real date/time. Leadership can accidentally create completed/cancelled operations or invalid schedule values.
- Suggested fix direction: Validate schedule strings with a date parser and restrict creation to allowed initial statuses, then use explicit status-transition endpoints for later lifecycle changes.

### 13. src/app/api/fleet-ops/operations/upload-image/route.ts: lines 63-99
- Category: failure-point
- Severity: high
- Description: The upload authorization check fails open. If the mission is not found in MongoDB or the ownership query throws, the route continues and accepts the upload as long as the user is authenticated.
- Suggested fix direction: Fail closed for existing non-temp mission IDs. Resolve the mission through the storage layer, including fallback storage, and return 404/403 when the mission cannot be verified or the user is not authorized.

### 14. src/app/api/fleet-ops/operations/upload-image/route.ts: lines 76-84
- Category: bug
- Severity: high
- Description: The leader check compares `mission.leader` to `auth.userId`, but the legacy mission type uses `leaderId` and planned missions use `leaders[]`/`createdBy`. Legitimate leaders can be denied, and the check is inconsistent with the data model.
- Suggested fix direction: Use the correct mission model fields through a shared authorization helper instead of hand-rolled Mongo projections.

### 15. src/app/api/fleet-ops/operations/upload-image/route.ts: lines 132-160
- Category: failure-point
- Severity: medium
- Description: After inserting the image document, failure to update the mission's `images` reference is logged but the route still returns success. This can create orphaned image documents that are hard to discover from mission details.
- Suggested fix direction: Make image insert and mission reference update transactional where MongoDB is used, or roll back/delete the inserted image if the mission update fails.

### 16. src/app/api/fleet-ops/resources/[id]/route.ts: lines 82-84
- Category: error
- Severity: low
- Description: The PUT route parses JSON outside the validation try/catch. Malformed JSON falls to the outer catch and is returned as a 500 instead of a 400.
- Suggested fix direction: Wrap `req.json()` in its own parse-error block and return a clear 400 for invalid JSON.

### 17. src/app/api/fleet-ops/resources/[id]/route.ts: lines 109-146
- Category: failure-point
- Severity: medium
- Description: A resource owner can directly modify operational fields such as `assignedTo`, `status`, `quantity`, and `capacity`. This bypasses allocation/deallocation invariants and can desynchronize resource status from allocations.
- Suggested fix direction: Split owner-editable descriptive fields from operational fields. Require leadership or allocation workflows for `status`/`assignedTo` changes and validate capacity/quantity invariants.

### 18. src/app/api/fleet-ops/resources/[id]/route.ts: lines 196-199
- Category: failure-point
- Severity: medium
- Description: Deleting a resource does not check or clean up resource allocations. Existing allocation records can remain and point to a missing resource.
- Suggested fix direction: Reject deletion while allocations exist, cascade-delete allocations in a transaction, or mark resources archived/unavailable instead of hard deleting.

### 19. src/app/api/fleet-ops/resources/allocations/route.ts: lines 13-22 and 131-135
- Category: bug
- Severity: low
- Description: `allocatedById` is required in the request schema but is immediately overwritten with `auth.userId`. Clients must send a meaningless field to pass validation.
- Suggested fix direction: Remove `allocatedById` from the client schema and populate it server-side only.

### 20. src/app/api/fleet-ops/resources/allocations/route.ts: lines 19-20 and 123-135
- Category: failure-point
- Severity: medium
- Description: Allocation creation does not validate that `startDateTime` and `endDateTime` are valid dates, that end is after start, that requested quantity is available, or that the resource is not already allocated for an overlapping time window.
- Suggested fix direction: Validate temporal fields and enforce overlap/capacity checks in storage, preferably with transactional update semantics.

### 21. src/app/api/fleet-ops/resources/allocations/route.ts: lines 194-197
- Category: bug
- Severity: medium
- Description: Deallocation returns success even if no matching allocation existed. The storage layer also resets the resource to `Available`, which is unsafe if multiple allocations or another active assignment exists.
- Suggested fix direction: Have storage return whether a record was removed, return 404 when none exists, and compute the resource's resulting status from remaining allocations.

### 22. src/app/api/fleet-ops/resources/allocations/route.ts: lines 24-75
- Category: failure-point
- Severity: medium
- Description: Any authenticated user can query allocations by operation or resource and receive resource names, operation names, and allocator names. There is no participant/owner/leadership access check.
- Suggested fix direction: Check access to the requested operation/resource before returning allocation details.

### 23. src/app/api/fleet-ops/resources/route.ts: lines 29-57
- Category: failure-point
- Severity: medium
- Description: Any authenticated user can list all resources or filter by arbitrary owner. Depending on resource sensitivity, this leaks inventory, location, owner, and assignment information.
- Suggested fix direction: Apply visibility rules: leadership sees all resources; non-leadership users see owned/public/assigned resources only, or return a limited public projection.

### 24. src/app/api/fleet-ops/resources/route.ts: lines 103-119
- Category: failure-point
- Severity: medium
- Description: Resource creation trusts the request-supplied `owner` and does not verify that the owner user exists. Leadership users can accidentally create orphaned resources or assign them to invalid IDs.
- Suggested fix direction: Validate `owner` against user storage, or default owner to the authenticated creator unless explicitly changed by an admin workflow.

### 25. src/app/api/fleet-ops/resources/route.ts: lines 78-91
- Category: failure-point
- Severity: low
- Description: `page` and `pageSize` are not checked for `NaN`, so malformed pagination parameters can produce invalid metadata and inconsistent paging.
- Suggested fix direction: Validate parsed values with `Number.isFinite()` and clamp only after substituting safe defaults.

### 26. src/app/api/planned-missions/[id]/attendance/route.ts: lines 56-67
- Category: failure-point
- Severity: high
- Description: The attendance POST accepts `confirmedParticipants` as an array but does not validate participant objects. A permitted mission editor can spoof `confirmedBy`, `confirmedAt`, roles, duplicate records, or malformed identifiers, replacing the whole attendance list.
- Suggested fix direction: Validate each participant with a schema, derive `confirmedBy`/`confirmedAt` server-side where appropriate, reject duplicates, and consider patch-style add/remove operations instead of full replacement.

### 27. src/app/api/planned-missions/[id]/attendance/route.ts: line 56
- Category: error
- Severity: low
- Description: Malformed JSON in the attendance POST is caught by the outer handler and returned as a 500.
- Suggested fix direction: Catch JSON parse failures separately and return 400.

### 28. src/app/api/planned-missions/[id]/discord/route.ts: lines 276-291
- Category: bug
- Severity: high
- Description: The GET endpoint has a write side effect: it syncs mission status from Discord and calls `updatePlannedMission()` for any authenticated requester. A read request should not mutate mission lifecycle state without modify permission.
- Suggested fix direction: Move status sync to a privileged POST/PATCH/background job or require the same modification permission before updating local mission status.

### 29. src/app/api/planned-missions/[id]/discord/route.ts: lines 159-164 and 453-479
- Category: failure-point
- Severity: medium
- Description: Public Discord event descriptions are built with `request.headers.get('origin')` as the base URL. The Origin header is client-controlled, so a privileged request can publish or update Discord events containing a spoofed briefing link.
- Suggested fix direction: Use a configured canonical application URL, not request Origin, when generating external links.

### 30. src/app/api/planned-missions/[id]/discord/route.ts: lines 174-193
- Category: failure-point
- Severity: high
- Description: Publishing creates the Discord scheduled event before updating the local mission. If the local update fails after Discord creation, the route returns an error but leaves an orphaned Discord event with no mission reference.
- Suggested fix direction: Add compensation that deletes the Discord event if local persistence fails, or persist a pending state first and reconcile asynchronously.

### 31. src/app/api/planned-missions/[id]/discord/route.ts: lines 376-383
- Category: failure-point
- Severity: medium
- Description: Unpublish deletes the Discord event before clearing the local mission reference. If the local update fails after the Discord delete succeeds, the mission remains linked to a deleted event.
- Suggested fix direction: Use an idempotent two-phase/pending state or compensate by retrying local cleanup and surfacing a recoverable inconsistent state.

### 32. src/app/api/planned-missions/[id]/route.ts: lines 74-83
- Category: failure-point
- Severity: high
- Description: The per-ID PUT route performs no schema validation or field whitelist. Any authorized modifier can pass arbitrary fields to `updatePlannedMission()`, including lifecycle/status, `createdBy`, `discordEvent`, `expectedParticipants`, or `confirmedParticipants`.
- Suggested fix direction: Reuse a shared planned-mission update schema, restrict sensitive fields to dedicated endpoints, and validate status transitions separately.

### 33. src/app/api/planned-missions/[id]/status/route.ts: lines 164-179
- Category: failure-point
- Severity: medium
- Description: Status is changed to `SCHEDULED` before Discord auto-publish runs. If Discord publishing fails, the response still reports route success and the mission remains scheduled without a Discord event.
- Suggested fix direction: Treat publish failure as a failed transition, or persist an explicit `SCHEDULED_PENDING_DISCORD`/warning state and require retry before considering the mission published.

### 34. src/app/api/planned-missions/route.ts: lines 403-415
- Category: bug
- Severity: high
- Description: The root PUT route's validation is both over-strict and under-strict. Updating any core field (`name`, `scheduledDateTime`, `operationType`, `primaryActivity`) invokes full create-style validation and can reject valid partial updates, while non-core updates bypass validation and are passed directly to storage.
- Suggested fix direction: Define a partial update schema that validates only supplied fields and still whitelists all mutable fields. Use dedicated endpoints for status, attendance, and Discord state.

### 35. src/app/api/planned-missions/route.ts: lines 298-318
- Category: failure-point
- Severity: high
- Description: Planned mission creation removes only a few managed fields, then accepts client-supplied `status`, `images`, `expectedParticipants`, `confirmedParticipants`, and potentially `discordEvent` through `safeMissionData`. A creator can seed attendance or Discord state that should be system-derived.
- Suggested fix direction: Whitelist create fields instead of copying the whole body. Default status and participant/Discord fields server-side unless a privileged workflow explicitly sets them.

### 36. src/app/api/planned-missions/route.ts: lines 228-245 and 237-255
- Category: failure-point
- Severity: low
- Description: `upcoming` limit, `page`, and `pageSize` are parsed without `NaN` checks. Malformed or very large limits can produce bad metadata or expensive queries.
- Suggested fix direction: Validate with `Number.isFinite()`, clamp both page size and upcoming limit, and use safe defaults for malformed values.
