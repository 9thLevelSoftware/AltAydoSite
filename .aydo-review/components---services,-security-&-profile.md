# Components - Services, Security & Profile Review

Scope: 29 assigned component files under `src/components`.

Reviewed files:
- `src/components/services/LoadingScreen.tsx`
- `src/components/services/ScanningInterface.tsx`
- `src/components/services/ServiceOverview.tsx`
- `src/components/services/ServicesCTA.tsx`
- `src/components/services/ServicesHero.tsx`
- `src/components/security/EscortRequestDetail.tsx`
- `src/components/security/EscortRequestTracker.tsx`
- `src/components/profile/ResetProfileComponent.tsx`
- `src/components/profile/UserProfileContent.tsx`
- `src/components/mission/AccordionSection.tsx`
- `src/components/AlliesSection.tsx`
- `src/components/ClientErrorBoundary.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/components/ErrorNotification.tsx`
- `src/components/Footer.tsx`
- `src/components/HomeContent.tsx`
- `src/components/LoadingOverlay.tsx`
- `src/components/Navigation.tsx`
- `src/components/Profile.tsx`
- `src/components/ReferencePageContent.tsx`
- `src/components/SecureConnectionIndicator.tsx`
- `src/components/ServerErrorBoundary.tsx`
- `src/components/Starfield.tsx`
- `src/components/StarfieldWrapper.tsx`
- `src/components/UserFleetBuilder.tsx`
- `src/components/UserFleetBuilderWrapper.tsx`
- `src/components/UserProfilePanel.tsx`
- `src/components/UserProviderWrapper.tsx`
- `src/components/providers/index.tsx`

## Summary

Findings count: 42

Severity breakdown:
- Critical: 0
- High: 7
- Medium: 26
- Low: 9

Category breakdown:
- Bug: 17
- Stub: 1
- Error: 7
- Failure-point: 17

## Findings

### 1. `src/components/services/ScanningInterface.tsx`
- Lines: 126, 138, 145
- Category: failure-point
- Severity: low
- Description: `scanProgress` is interpolated directly into CSS width and display text without clamping or validating it. A bad caller state can render negative widths, widths above 100%, or misleading progress values.
- Suggested fix direction: Normalize progress at the component boundary, e.g. clamp to `0..100` before using it for width and text.

### 2. `src/components/services/ScanningInterface.tsx`
- Lines: 151
- Category: bug
- Severity: low
- Description: `new Date().toLocaleTimeString()` is evaluated on every render, so the displayed "Scan initialized at" timestamp changes during progress updates instead of preserving the actual scan start time.
- Suggested fix direction: Pass the scan start timestamp as a prop or capture it in state when scanning begins.

### 3. `src/components/services/ServiceOverview.tsx`
- Lines: 113-120
- Category: failure-point
- Severity: low
- Description: Service cards are clickable `<div>` elements without keyboard activation, `role`, or focus handling. Keyboard users cannot expand/collapse details reliably.
- Suggested fix direction: Use a real `<button>` for the interactive card header or add proper `role="button"`, `tabIndex`, and Enter/Space key handling.

### 4. `src/components/services/ServicesCTA.tsx`
- Lines: 32-50
- Category: error
- Severity: medium
- Description: `MobiGlasButton` renders a `<button>`, but this component nests an `<a>` inside it. Button/anchor nesting is invalid interactive HTML and can produce hydration, click, and accessibility problems.
- Suggested fix direction: Render the CTA as either a styled anchor/link or teach `MobiGlasButton` to support an `asChild`/anchor mode; do not nest interactive elements.

### 5. `src/components/services/ServicesHero.tsx`
- Lines: 12
- Category: error
- Severity: high
- Description: `mousePosition` is typed as `{ x: number; y: 0 }`, meaning `y` can only be the literal value `0`. Any real mouse position with a numeric `y` coordinate will fail strict TypeScript typing or force unsafe casts.
- Suggested fix direction: Change the prop type to `{ x: number; y: number }`.

### 6. `src/components/security/EscortRequestDetail.tsx`
- Lines: 99-105, 150-152
- Category: failure-point
- Severity: high
- Description: Saving sends the entire `editedRequest` object back to `/api/security/escort-requests`. Because `handleInputChange` is generic and the payload includes immutable/sensitive fields such as identifiers, requester, timestamps, and assignment fields, this creates a mass-assignment failure point if the API does not strictly whitelist server-side fields.
- Suggested fix direction: Send only fields the UI is allowed to edit, and rely on server-side authorization/validation for all mutations.

### 7. `src/components/security/EscortRequestDetail.tsx`
- Lines: 107-109, 134-136
- Category: failure-point
- Severity: medium
- Description: Error handling assumes every non-OK response is JSON. HTML error pages, empty 204/500 bodies, or proxy responses will make `response.json()` throw and mask the original HTTP status.
- Suggested fix direction: Parse error responses defensively with `response.text()` or `json().catch(...)`, preserving status and status text when JSON is unavailable.

### 8. `src/components/security/EscortRequestDetail.tsx`
- Lines: 130
- Category: failure-point
- Severity: medium
- Description: `request.id` is interpolated directly into the DELETE query string. IDs containing `&`, `?`, `#`, or other reserved characters can corrupt the query string and target the wrong request parameter.
- Suggested fix direction: Use `encodeURIComponent(request.id)` or `URLSearchParams` for the DELETE URL.

### 9. `src/components/security/EscortRequestDetail.tsx`
- Lines: 77-88, 252, 257, 374
- Category: bug
- Severity: medium
- Description: `formatDate` does not guard against invalid or missing date strings. `Intl.DateTimeFormat(...).format(new Date(invalid))` throws `RangeError`, which can crash the detail modal if an API record contains malformed date data.
- Suggested fix direction: Validate `Number.isNaN(date.getTime())` and render a fallback such as `Unknown` before formatting.

### 10. `src/components/security/EscortRequestDetail.tsx`
- Lines: 396-407, 442-448
- Category: failure-point
- Severity: medium
- Description: Edit and delete controls are rendered for every viewer of a request. Server-side enforcement may still protect the API, but the client offers privileged actions without any visible role/ownership gating, creating an avoidable authorization and UX failure point.
- Suggested fix direction: Gate privileged controls by authenticated role/ownership claims in the component, while keeping server-side authorization as the source of truth.

### 11. `src/components/security/EscortRequestTracker.tsx`
- Lines: 27-55
- Category: bug
- Severity: medium
- Description: `fetchRequests` has no `AbortController` or stale-response guard. Rapid filter changes can allow an older, slower request to resolve after a newer one and overwrite the current list with stale data.
- Suggested fix direction: Abort in-flight fetches on filter changes or track a request sequence ID and ignore stale responses.

### 12. `src/components/security/EscortRequestTracker.tsx`
- Lines: 51-55
- Category: bug
- Severity: medium
- Description: `onRequestsChange` is in the `useCallback` dependency list. If a parent passes an unstable callback that updates parent state, this component can refetch on every parent render and enter a repeated fetch/render loop.
- Suggested fix direction: Require the parent callback to be stable, store it in a ref, or remove it from the fetch callback dependencies by using a callback-ref pattern.

### 13. `src/components/security/EscortRequestTracker.tsx`
- Lines: 98-106, 232
- Category: bug
- Severity: medium
- Description: Request timestamps are formatted without validating the input. A malformed `createdAt` from the API can throw during list rendering and blank the tracker.
- Suggested fix direction: Validate date values before formatting and render a safe fallback for invalid values.

### 14. `src/components/profile/ResetProfileComponent.tsx`
- Lines: 49-50
- Category: bug
- Severity: medium
- Description: Resetting a profile calls `sessionStorage.clear()`, which removes every session-storage entry for the origin, not just profile-related keys. This can delete unrelated feature state, redirect state, or other session-scoped data.
- Suggested fix direction: Remove only known profile/session keys owned by this feature, or use a prefix-based cleanup like the localStorage path.

### 15. `src/components/profile/ResetProfileComponent.tsx`
- Lines: 93-96
- Category: failure-point
- Severity: low
- Description: The redirect timeout is never cleaned up. If the component unmounts before the two seconds elapse, it can still call `router.push` after unmount.
- Suggested fix direction: Store the timeout ID and clear it from the effect cleanup.

### 16. `src/components/profile/UserProfileContent.tsx`
- Lines: 86-95, 145-164
- Category: bug
- Severity: high
- Description: While the user is editing, a 10-second interval refreshes ships from `/api/profile` and overwrites `userShips`. Unsaved fleet edits can be silently lost if the background refresh completes after the user adds/removes ships locally.
- Suggested fix direction: Do not refresh mutable edit state while editing, or merge remote changes with local dirty state using conflict detection.

### 17. `src/components/profile/UserProfileContent.tsx`
- Lines: 178-227
- Category: failure-point
- Severity: medium
- Description: Photo upload has no `FileReader.onerror`, `img.onerror`, or real MIME/content validation. Corrupt or unsupported image data can leave the UI with no feedback, and `accept="image/*"` is only a browser hint.
- Suggested fix direction: Validate file type/content, handle reader/image errors, and show a user-facing error for failed image processing.

### 18. `src/components/profile/UserProfileContent.tsx`
- Lines: 657-663, 259-276
- Category: bug
- Severity: high
- Description: The edit page embeds `UserFleetBuilderWrapper`, which maintains and saves its own `ships` state, while `handleSaveProfile` later sends the parent `userShips` array. If the wrapper save fails or its callback is delayed, the final profile save can submit stale `userShips` and overwrite fleet changes.
- Suggested fix direction: Use one source of truth for fleet state during profile editing; make child changes update parent state synchronously and persist only from the parent save flow.

### 19. `src/components/mission/AccordionSection.tsx`
- Lines: 23-24
- Category: failure-point
- Severity: low
- Description: The button declares `aria-controls={id + '-panel'}`, but the component never renders the controlled panel element. If the parent does not create an exactly matching panel ID, assistive technology receives a broken relationship.
- Suggested fix direction: Either render the panel/children inside this component or make the controlled panel ID an explicit prop verified by the parent.

### 20. `src/components/AlliesSection.tsx`
- Lines: 1-2, 37-47, 65-75, 82-94, 100-112, 118-130
- Category: error
- Severity: medium
- Description: The component uses `motion` animations but does not declare `'use client'`. It is only safe when imported under an existing client boundary; importing it from a Server Component can make Next treat this file as server code around client-only animation primitives.
- Suggested fix direction: Add `'use client'` at the top or ensure the component is only imported through an explicit client wrapper.

### 21. `src/components/ClientErrorBoundary.tsx`
- Lines: 7-10, 17
- Category: failure-point
- Severity: medium
- Description: The boundary is loaded with `ssr: false`, so any subtree wrapped by it is skipped during SSR and only rendered on the client. This weakens SSR coverage and does not catch server-render failures before hydration.
- Suggested fix direction: Use a real React error boundary for client errors and Next.js `error.tsx`/route-level boundaries for server errors instead of disabling SSR for the subtree.

### 22. `src/components/ErrorBoundary.tsx`
- Lines: 42-44
- Category: failure-point
- Severity: medium
- Description: The fallback UI renders `this.state.error?.toString()` directly to end users. Production errors can expose internal exception messages, paths, or implementation details.
- Suggested fix direction: Show generic user-facing text in production and send details only to logs/monitoring.

### 23. `src/components/ErrorNotification.tsx`
- Lines: 1-5
- Category: stub
- Severity: low
- Description: The component is marked deprecated, kept only for backward compatibility, and planned for removal in Phase 15. This is explicit stale/placeholder surface area that can continue to attract new usages.
- Suggested fix direction: Replace remaining usages with `useToast()` or `MobiGlasFormError`, then remove this component.

### 24. `src/components/ErrorNotification.tsx`
- Lines: 23-30, 86-89
- Category: bug
- Severity: low
- Description: The reset countdown is computed during render but no timer updates component state. Unless a parent re-renders every second, `Reset in:` remains stale.
- Suggested fix direction: Add an interval state tick while `resetTime` is active, or pass a live remaining-time value from the parent.

### 25. `src/components/Footer.tsx`
- Lines: 141-160, 168-185
- Category: error
- Severity: medium
- Description: External anchors wrap `MobiGlasButton`, which renders a `<button>`. This creates invalid nested interactive elements and can cause inconsistent click/keyboard behavior.
- Suggested fix direction: Use an anchor styled like the button or add an anchor/as-child rendering mode to `MobiGlasButton`.

### 26. `src/components/HomeContent.tsx`
- Lines: 72-80
- Category: failure-point
- Severity: medium
- Description: The typewriter effect clears the interval but not the nested `setTimeout` scheduled after each message. If the terminal unmounts during that delay, the timeout can still call `setMessageIdx` after unmount.
- Suggested fix direction: Store the nested timeout ID and clear it in the effect cleanup.

### 27. `src/components/HomeContent.tsx`
- Lines: 277-311
- Category: failure-point
- Severity: high
- Description: `initiateSystemScan` starts a chain of nested timeouts without any cleanup. Navigating away during a scan can leave pending timers that update state on an unmounted component.
- Suggested fix direction: Track all timeout IDs in a ref and clear them on unmount, or implement the scan as a cancellable state machine/effect.

### 28. `src/components/HomeContent.tsx`
- Lines: 312, 337-351
- Category: bug
- Severity: medium
- Description: The auto-scan interval effect depends on `initiateSystemScan`, and `initiateSystemScan` depends on changing `systemStatus` values. During every scan step, the callback identity changes, causing the effect to tear down and recreate the carousel and scan intervals repeatedly.
- Suggested fix direction: Use refs or functional state updates so the scan callback is stable, and keep interval effects independent of frequently changing display state.

### 29. `src/components/HomeContent.tsx`
- Lines: 805-822, 886-918
- Category: error
- Severity: medium
- Description: Multiple `Link` components wrap `MobiGlasButton`, which renders a `<button>`. Next `Link` renders an anchor, so this creates invalid anchor/button nesting.
- Suggested fix direction: Render navigational calls to action as links styled with button classes, or add an anchor/as-child option to `MobiGlasButton`.

### 30. `src/components/LoadingOverlay.tsx`
- Lines: 1-2, 10-113
- Category: error
- Severity: medium
- Description: The file uses `motion` components but lacks an explicit `'use client'` directive. It is fragile if imported from a Server Component or outside an existing client boundary.
- Suggested fix direction: Add `'use client'` at the top or wrap it in a dedicated client-only component.

### 31. `src/components/Navigation.tsx`
- Lines: 54-66, 73-98, 153-199
- Category: error
- Severity: medium
- Description: Navigation uses `Link` around `MobiGlasButton` in desktop and mobile menus. Because `MobiGlasButton` renders a real `<button>`, these are anchors containing buttons, which is invalid HTML and problematic for assistive technology.
- Suggested fix direction: Convert these to link-styled elements or update `MobiGlasButton` to render as an anchor for navigation.

### 32. `src/components/Navigation.tsx`
- Lines: 20, 71-99, 174-200
- Category: bug
- Severity: low
- Description: The component only reads `session` and ignores the NextAuth `status`. During session loading, authenticated users can briefly see the LOGIN button before the session resolves.
- Suggested fix direction: Read `status` from `useSession()` and render a neutral/loading state until it is no longer `loading`.

### 33. `src/components/SecureConnectionIndicator.tsx`
- Lines: 8-21
- Category: failure-point
- Severity: low
- Description: The indicator says `SECURE CONNECTION` solely because the NextAuth status is authenticated. It does not check transport security, API health, token freshness, or any actual secure-channel property, so it can give users a false security signal.
- Suggested fix direction: Rename the label to an authentication/session indicator, or back it with actual connection/security checks.

### 34. `src/components/ServerErrorBoundary.tsx`
- Lines: 6-10, 72-78, 152
- Category: bug
- Severity: medium
- Description: Despite its name, this function component is not a React error boundary and cannot catch render errors thrown by descendants. It only listens for global `error` and `unhandledrejection` events after mount.
- Suggested fix direction: Use a class-based React error boundary for client render errors and Next.js route `error.tsx` files for server component failures.

### 35. `src/components/ServerErrorBoundary.tsx`
- Lines: 91-118
- Category: failure-point
- Severity: medium
- Description: The fallback exposes raw `errorDetails` and recent error log messages/digests behind a UI toggle. These details can leak internal implementation or infrastructure information to end users.
- Suggested fix direction: Hide debug details in production, restrict them to admins, or send them only to monitoring.

### 36. `src/components/Starfield.tsx`
- Lines: 69-107, 182-266, 567-576
- Category: bug
- Severity: medium
- Description: The canvas is scaled for device pixel ratio, but particle positions and drawing bounds are generated using `canvas.width`/`canvas.height` after those values have already been multiplied by the pixel ratio. With `ctx.scale(pixelRatio, pixelRatio)`, many coordinates are effectively double-scaled on high-DPI displays, placing stars/effects outside the visible CSS area and wasting work.
- Suggested fix direction: Use CSS pixel dimensions for world coordinates after scaling the context, or do all drawing in physical pixels without applying `ctx.scale`.

### 37. `src/components/UserFleetBuilder.tsx`
- Lines: 100-107, 117
- Category: bug
- Severity: medium
- Description: For each grouped ship, the removal index is found with `findIndex` matching only manufacturer and name. If a user owns duplicate ships with the same manufacturer/name, every duplicate resolves to the first matching index, so removing the second duplicate can remove the wrong ship.
- Suggested fix direction: Preserve the original array index when grouping, or give each fleet entry a stable unique ID and remove by that ID.

### 38. `src/components/UserFleetBuilderWrapper.tsx`
- Lines: 167-245, 248-267
- Category: bug
- Severity: high
- Description: Add/remove handlers optimistically update local wrapper state and fire `saveShipsToServer` as a side effect inside the state updater. Rapid edits can launch overlapping saves with no ordering, cancellation, or rollback, so a slower earlier save can leave the server with stale fleet data.
- Suggested fix direction: Move persistence out of the state updater, serialize/debounce saves, and reconcile server responses against the latest local version.

### 39. `src/components/UserFleetBuilderWrapper.tsx`
- Lines: 176-197, 217-239, 302-310
- Category: failure-point
- Severity: high
- Description: The wrapper writes fleet changes to localStorage before confirming server persistence, but only notifies the parent via `onShipsChange` on successful server response. On save failure, the wrapper UI/localStorage and parent profile state diverge, making later profile saves likely to overwrite local-only fleet changes.
- Suggested fix direction: Notify parent of local changes immediately with an explicit dirty/error state, or avoid dual persistence and let the parent own the edit transaction.

### 40. `src/components/UserProfilePanel.tsx`
- Lines: 43-52, 133-139
- Category: failure-point
- Severity: medium
- Description: This older profile panel accepts any `image/*` file and stores the full base64 data URL without size limits, resizing, or read/error handling. Large images can bloat profile storage or fail silently.
- Suggested fix direction: Reuse the safer upload path from `UserProfileContent`: enforce size/type checks, resize/compress, and handle `FileReader`/image errors.

### 41. `src/components/UserProfilePanel.tsx`
- Lines: 167-172, 145-318
- Category: bug
- Severity: medium
- Description: The edit controls imply a save workflow (`SAVE CHANGES`), but every field calls `updateProfile` immediately on change. If `updateProfile` persists changes, users cannot review/cancel edits; if it only mutates local state, the button name is misleading because it only toggles edit mode.
- Suggested fix direction: Separate draft state from persisted state and make Save/Cancel semantics explicit.

### 42. `src/components/UserProviderWrapper.tsx`
- Lines: 31-39, 46-60
- Category: bug
- Severity: medium
- Description: A global error listener treats any thrown error whose message contains `auth`, `session`, or `secret` as an authentication failure and replaces the whole app with an auth error screen. Unrelated errors with those substrings can trigger a false-positive app-wide outage.
- Suggested fix direction: Match known authentication error types/codes from the auth layer instead of substring matching arbitrary global errors.

## Files with no file-specific findings

- `src/components/services/LoadingScreen.tsx`
- `src/components/Profile.tsx`
- `src/components/ReferencePageContent.tsx`
- `src/components/StarfieldWrapper.tsx`
- `src/components/providers/index.tsx`

## Verification notes

- Read all 29 assigned files in full.
- Also inspected `src/components/ui/mobiglas/MobiGlasButton.tsx` to confirm it renders a `<button>`, which grounds the nested interactive-element findings.
- Attempted `npm run type-check -- --pretty false`; it failed before file-level checking on TypeScript 6 deprecation errors in `tsconfig.json` (`moduleResolution=node10`, `baseUrl`). Retried with `--ignoreDeprecations 6.0`, but the environment lacks installed dependency/type packages, producing repository-wide missing-module errors. No code was modified.
