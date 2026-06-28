# Components - Ships & Fleet Review

Scope: 29 assigned files under `src/components/ships`, `src/components/fleet-composition`, `src/components/fleet-ops`, and `src/components/fleet-ops/mission-planner`.

Reviewed files:
- `src/components/ships/FleetShipPickerModal.tsx`
- `src/components/ships/MissionParticipantShip.tsx`
- `src/components/ships/ProfileShipCard.tsx`
- `src/components/ships/ShipBrowsePage.tsx`
- `src/components/ships/ShipCard.tsx`
- `src/components/ships/ShipCardList.tsx`
- `src/components/ships/ShipDetailPanel.tsx`
- `src/components/ships/ShipFilterChips.tsx`
- `src/components/ships/ShipFilterPanel.tsx`
- `src/components/ships/ShipGrid.tsx`
- `src/components/ships/ShipImageGallery.tsx`
- `src/components/ships/ShipPagination.tsx`
- `src/components/ships/ShipSearchBar.tsx`
- `src/components/ships/ShipSpecs.tsx`
- `src/components/ships/SyncStatusIndicator.tsx`
- `src/components/fleet-composition/FleetBreakdownChart.tsx`
- `src/components/fleet-composition/FleetBreakdownTable.tsx`
- `src/components/fleet-composition/FleetCompositionPage.tsx`
- `src/components/fleet-composition/FleetCompositionTabs.tsx`
- `src/components/fleet-ops/OperationCard.tsx`
- `src/components/fleet-ops/OperationDetailView.tsx`
- `src/components/fleet-ops/OperationEditor.tsx`
- `src/components/fleet-ops/UserSelector.tsx`
- `src/components/fleet-ops/mission-planner/HoloModal.tsx`
- `src/components/fleet-ops/mission-planner/MissionCard.tsx`
- `src/components/fleet-ops/mission-planner/MissionDashboard.tsx`
- `src/components/fleet-ops/mission-planner/MissionDetail.tsx`
- `src/components/fleet-ops/mission-planner/MissionFilters.tsx`
- `src/components/fleet-ops/mission-planner/MissionList.tsx`

Summary:
- Findings: 14
- Severity breakdown: 4 high, 7 medium, 3 low
- Category breakdown: 6 bugs, 0 stubs, 1 error, 7 failure-points
- Stub markers: none found in the assigned files

## Findings

### 1. Search input can drop the next user edit after parent state sync
- File path: `src/components/ships/ShipSearchBar.tsx`
- Line number(s): 25-43
- Category: bug
- Severity: high
- Description: The external-value sync effect sets `isExternalUpdate.current = true` on every `value` prop change. When the parent receives a debounced search value and re-renders with the same value, `setLocalValue(value)` may not change local state, so the debounce effect does not run to clear the flag. The next real user edit then enters the debounce effect with `isExternalUpdate.current === true`, clears the flag, returns early, and never calls `onChange` for that edit. This can make search appear to ignore every edit immediately after a parent sync.
- Suggested fix direction: Only mark external updates when `value !== localValue`, or compare a previous prop value; alternatively split user-originated and prop-originated updates without a sticky ref that can survive a no-op state update.

### 2. Ship gallery keeps the previous ship image when the selected ship changes
- File path: `src/components/ships/ShipImageGallery.tsx`
- Line number(s): 31-40
- Category: bug
- Severity: medium
- Description: `activeView` and `mainSrc` are initialized from `images` only once. `ShipDetailPanel` can keep the gallery component mounted while `shipId` changes and `useShipDetail` supplies a new `ship`. In that case the gallery continues showing the prior ship's resolved `mainSrc` until the user clicks a thumbnail.
- Suggested fix direction: Add an effect keyed on `images`/`shipName` that resets `activeView` and recalculates `mainSrc`, or key `ShipImageGallery` by `ship.fleetyardsId` in the parent.

### 3. Modal fetches ship pages even while closed
- File path: `src/components/ships/FleetShipPickerModal.tsx`
- Line number(s): 119-128, 185-190
- Category: failure-point
- Severity: low
- Description: `useShips` is called unconditionally before the component checks `isOpen`. If the picker is mounted but closed, it still requests the default ship page and can continue reacting to stale filter state. This wastes API/database work and can create unexpected network activity in fleet-builder screens that keep the modal mounted.
- Suggested fix direction: Add an `enabled: isOpen` option to `useShips` if supported, or move the data-fetching logic into a child rendered only when `isOpen` is true.

### 4. Body scroll lock cleanup can unlock another active overlay
- File path: `src/components/ships/ShipDetailPanel.tsx`; `src/components/ships/FleetShipPickerModal.tsx`
- Line number(s): `ShipDetailPanel.tsx` 103-111; `FleetShipPickerModal.tsx` 137-145
- Category: failure-point
- Severity: medium
- Description: Both components set `document.body.style.overflow = 'hidden'` and then reset it to an empty string on cleanup. If overlays overlap or another component had already set a non-empty overflow value, closing one overlay unlocks the body even though another overlay is still active, or discards the previous style.
- Suggested fix direction: Preserve and restore the previous overflow value, or use a shared reference-counted body-scroll-lock helper for all modal/panel components.

### 5. Operation editor shifts date/time values through UTC conversion
- File path: `src/components/fleet-ops/OperationEditor.tsx`
- Line number(s): 32-40, 289-300
- Category: bug
- Severity: high
- Description: The `datetime-local` value is built with `new Date(...).toISOString().slice(0, 16)`. `toISOString()` converts to UTC, while `datetime-local` displays and submits local wall time. Editing an operation in a non-UTC timezone can show a shifted time and save that shifted value back to the API.
- Suggested fix direction: Format the local date/time using local getters or a timezone-aware helper, and define whether the API expects UTC ISO strings or local datetime strings before submitting.

### 6. Ship assignment drops the FleetYards ID
- File path: `src/components/fleet-ops/OperationEditor.tsx`
- Line number(s): 149-156, 453-469
- Category: bug
- Severity: high
- Description: Participant ship selection encodes only `manufacturer|name` and `handleShipAssignment` stores only `shipManufacturer` and `shipName`. `UserShip` includes `fleetyardsId`, and `OperationParticipant` also has optional `fleetyardsId`, but the editor discards it. Any downstream UI or migration that needs stable ship identity cannot resolve the selected ship reliably; duplicate names or renamed ships will also be ambiguous.
- Suggested fix direction: Use the ship's `fleetyardsId` as the option value, look up the selected `UserShip`, and persist `fleetyardsId` along with display manufacturer/name.

### 7. User loading failures are silent and can update state after unmount
- File path: `src/components/fleet-ops/OperationEditor.tsx`
- Line number(s): 51-75
- Category: failure-point
- Severity: medium
- Description: The `/api/users` request has no `AbortController` and catches failures by logging only. If the editor unmounts while the request is in flight, it can still call `setUsers`/`setIsLoadingUsers`. If the request fails, the UI simply behaves as though no users are searchable, with no actionable error for the operator.
- Suggested fix direction: Add an abort signal and cleanup in the effect, and surface a user-visible error state near `UserSelector` with a retry path.

### 8. Stored diagram links are rendered as unsanitized hrefs
- File path: `src/components/fleet-ops/OperationDetailView.tsx`
- Line number(s): 297-310
- Category: failure-point
- Severity: high
- Description: `operation.diagramLinks` is rendered directly into `<a href={link}>`. The editor uses `type="url"`, but API validation for operation updates accepts arbitrary strings, and existing data may not be browser-validated. A `javascript:` or other unsafe scheme could become a stored clickable link for anyone viewing the operation.
- Suggested fix direction: Validate and normalize diagram links on both server and client; only allow safe schemes such as `https:` and `http:`, and render invalid values as plain text or reject them at save time.

### 9. Date formatters can throw on invalid API dates and crash cards/details
- File path: `src/components/fleet-ops/OperationCard.tsx`; `src/components/fleet-ops/OperationDetailView.tsx`; `src/components/fleet-ops/mission-planner/MissionCard.tsx`; `src/components/fleet-ops/mission-planner/MissionDetail.tsx`
- Line number(s): `OperationCard.tsx` 12-20; `OperationDetailView.tsx` 40-48; `MissionCard.tsx` 18-27; `MissionDetail.tsx` 34-45
- Category: error
- Severity: medium
- Description: Each formatter constructs `new Date(dateString)` and immediately passes it to `Intl.DateTimeFormat.format`. If the API returns an empty, malformed, or out-of-range date, `format` throws `RangeError: Invalid time value`, taking down the card/detail render path.
- Suggested fix direction: Centralize date formatting in a safe helper that checks `Number.isFinite(date.getTime())` and returns a fallback label such as `Date TBD` instead of throwing.

### 10. User selector dropdown has no reliable outside-click/blur close path
- File path: `src/components/fleet-ops/UserSelector.tsx`
- Line number(s): 71-75
- Category: failure-point
- Severity: low
- Description: The dropdown attempts to close with `onBlur` on the dropdown `<div>`, but that div is not focusable and focus remains on the input. Clicking outside after opening the dropdown will not reliably fire this handler, leaving stale results open until a selection is made or the input changes.
- Suggested fix direction: Use a document-level pointerdown listener, focus-within handling on a wrapper, or make the dropdown participate in focus management and close when focus leaves the whole selector.

### 11. Holographic modal schedules an untracked timeout from animation completion
- File path: `src/components/fleet-ops/mission-planner/HoloModal.tsx`
- Line number(s): 303-314
- Category: failure-point
- Severity: medium
- Description: `onAnimationComplete` creates `setTimeout(() => setBootSequence(false), 1000)` that is not stored or cleared. Closing the modal or unmounting immediately after the boot animation can still run that timeout and update state after the component is no longer active. Repeated opens can also stack delayed state transitions.
- Suggested fix direction: Store the timeout ID in a ref, clear it in the `useEffect` cleanup and when closing, or drive the boot-sequence transition from the existing `isOpen` effect with a single managed timer.

### 12. Mission images can break rendering for unconfigured remote URLs
- File path: `src/components/fleet-ops/mission-planner/MissionDetail.tsx`
- Line number(s): 253-276
- Category: failure-point
- Severity: medium
- Description: Mission image URLs are passed directly to Next `<Image>` with no validation, `unoptimized` fallback, or `onError` handling. User/API-provided images from hosts not listed in `next.config` image domains/patterns can throw a Next image configuration error; broken URLs also have no graceful fallback.
- Suggested fix direction: Validate allowed image URL schemes/hosts at save time, configure the expected remote patterns, and add a fallback/error state or use `unoptimized` for externally supplied mission images.

### 13. Mission roster keys collide when a user appears more than once
- File path: `src/components/fleet-ops/mission-planner/MissionDetail.tsx`
- Line number(s): 322-324
- Category: bug
- Severity: low
- Description: Roster rows use `key={participant.userId}`. If the mission model ever allows the same user to appear in multiple roles/ships, React keys collide and rows can reuse the wrong component state or animations.
- Suggested fix direction: Use a stable participant ID if available, or include role/ship/index in the key while preserving uniqueness.

### 14. Mission sorting does not guard invalid timestamps
- File path: `src/components/fleet-ops/mission-planner/MissionDashboard.tsx`
- Line number(s): 36-44
- Category: bug
- Severity: low
- Description: Sorting uses `new Date(...).getTime()` without handling `NaN`. A single malformed `scheduledDateTime` produces `NaN` comparators, which can leave mission ordering unstable and browser-dependent.
- Suggested fix direction: Parse dates through a safe helper and decide an explicit ordering for invalid/missing timestamps, such as placing them last.
