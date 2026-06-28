# Components - Dashboard Review

Scope: dashboard components: sidebar, header, widgets, mission planner, events calendar, org chart, panels.

Reviewed files: 20
Findings: 30
Severity breakdown: critical 0, high 0, medium 16, low 14

Verification notes:
- Read all 20 assigned files in full.
- Attempted `npm run lint` for the assigned files; it could not run because `next` is not installed/found in this checkout.
- Attempted `npm run type-check -- --pretty false`; blocked first by deprecated tsconfig options, then with `--ignoreDeprecations 6.0` by missing project dependencies/types such as next, react, zod, mongodb, vitest, @types/node.
- No code was modified.

Files reviewed with no specific findings: src/components/dashboard/AuthError.tsx, src/components/dashboard/DashboardFooter.tsx, src/components/dashboard/LoadingScreen.tsx.

## Findings

### 1. src/components/dashboard/DashboardBreadcrumbs.tsx:23-27
Category: bug
Severity: low
Description: Breadcrumb labels are built directly from raw path segments. URL-encoded route components such as `%20`, `%5B`, or encoded user-provided slugs will be displayed literally rather than decoded, producing broken/ugly breadcrumbs.
Suggested fix direction: Decode each segment with `decodeURIComponent` inside a try/catch before replacing hyphens and capitalizing.

### 2. src/components/dashboard/DashboardHeader.tsx:123-124
Category: bug
Severity: medium
Description: The UI labels `new Date().toLocaleDateString(...)` as `LAST LOGIN`, but this is the current client render time, not an actual authenticated last-login timestamp. This gives users misleading audit/security information.
Suggested fix direction: Add a real last-login field to the session/user payload and render that value, or relabel this as current local time/session time.

### 3. src/components/dashboard/DashboardPanelLayout.tsx:43-46
Category: failure-point
Severity: low
Description: Children are wrapped with `key={index}`. If panels are inserted, removed, or reordered, React can reuse the wrong child wrapper and reset/mis-associate child state and animations.
Suggested fix direction: Preserve stable keys from valid React children when possible, or require callers to pass keyed children and use those keys for the wrapper.

### 4. src/components/dashboard/DashboardSidebar.tsx:146-150
Category: bug
Severity: low
Description: `isActive` uses `pathname.startsWith(href)` for every non-dashboard route. Routes with shared prefixes, such as `/dashboard/events-archive`, would incorrectly mark `/dashboard/events` active.
Suggested fix direction: Treat a route as active only when `pathname === href` or `pathname.startsWith(href + '/')`.

### 5. src/components/dashboard/DashboardWidgets.tsx:5-18
Category: stub
Severity: low
Description: Employee status values are hard-coded and `SERVICE HOURS` changes randomly with `Math.random()` on an interval. This is placeholder behavior that can display fabricated account/finance/reputation data.
Suggested fix direction: Fetch real employee status data from an API or mark the widget explicitly as demo-only until real data exists.

### 6. src/components/dashboard/EventCarousel.tsx:125-158
Category: failure-point
Severity: low
Description: Manual navigation creates `setTimeout` callbacks to clear `isTransitioning`, but the timeout ids are not stored or cleared on unmount. A click followed by route navigation can leave callbacks firing after the component is gone.
Suggested fix direction: Store transition timeout ids in a ref and clear them in the component cleanup before unmount.

### 7. src/components/dashboard/EventCarousel.tsx:149-153
Category: bug
Severity: low
Description: `goToSlide` does not ignore clicks on the already-active slide. Clicking the current indicator still sets `isTransitioning`, computes a reverse direction, resets autoplay, and locks controls for 500ms without changing slides.
Suggested fix direction: Return early when `index === currentIndex` before setting transition state or resetting autoplay.

### 8. src/components/dashboard/EventsCalendar.tsx:20-24,170-176
Category: bug
Severity: low
Description: `currentDateUTC`, `currentDay`, `currentMonth`, and `currentYear` are evaluated at module load. If the dashboard stays open across midnight, the highlighted "today" cell remains stale until a full page reload.
Suggested fix direction: Keep current time/date in component state and update it on an interval or compute it inside render/effects from `new Date()`.

### 9. src/components/dashboard/EventsCalendar.tsx:38-45,244-247
Category: stub
Severity: low
Description: Debug `console.log` calls run on every render and manual refresh. This leaks event/timezone metadata to production console output and adds noise to user sessions.
Suggested fix direction: Remove the logs or guard them behind a development-only flag.

### 10. src/components/dashboard/EventsCalendar.tsx:107-122
Category: bug
Severity: medium
Description: The `eventId` query-param auto-open effect never records that it has handled the event and does not clear the URL. If the user closes the modal and events refresh later, the same modal can reopen unexpectedly.
Suggested fix direction: Track the handled `eventId` in a ref/state and/or remove the query param after opening the event, similar to the mission planner behavior.

### 11. src/components/dashboard/EventsCalendar.tsx:124-137
Category: bug
Severity: medium
Description: Whenever the current viewed month has no events, the component jumps back to the first event's month. This makes it impossible for a user to intentionally browse an empty month while events exist elsewhere.
Suggested fix direction: Only perform the initial jump once after data loads, or gate it behind an explicit "jump to next event" action rather than running on every month navigation.

### 12. src/components/dashboard/MissionPlanner.tsx:87-111
Category: failure-point
Severity: medium
Description: `fetchMissions` only updates state on `res.ok`; non-OK responses are silently ignored except for console logging on network exceptions. The UI can keep showing stale missions with no visible error if auth expires or the API returns 4xx/5xx.
Suggested fix direction: Parse and surface non-OK errors through component state/toast, clear or mark stale mission data when appropriate, and avoid relying on console-only feedback.

### 13. src/components/dashboard/MissionPlanner.tsx:140-148
Category: bug
Severity: medium
Description: The `initialMissionId` effect calls `handleEdit(mission)` whenever `initialMissionId` and `missions` are present. Every list refresh can force the user back into edit mode and overwrite in-progress navigation/state.
Suggested fix direction: Mirror the URL-param handling by tracking whether the initial mission id has already been processed, or only run the effect on initial load.

### 14. src/components/dashboard/MissionPlanner.tsx:310-335,452-475
Category: failure-point
Severity: medium
Description: Delete and complete operations do not handle non-OK responses. `handleDelete` silently does nothing on API failure, and `handleCompleteMission` only shows a toast for network exceptions, not server-side rejection.
Suggested fix direction: Parse error bodies for non-OK responses and show a toast/error state; keep the user in the current view when the action fails.

### 15. src/components/dashboard/MissionPlannerForm.tsx:162-177
Category: failure-point
Severity: low
Description: Leader loading failures are only logged to the console. The leadership selector becomes an empty enabled/disabled control with no user-facing explanation, preventing assignment without actionable feedback.
Suggested fix direction: Track a leader-loading error state and render a retry/error message in the Leadership panel.

### 16. src/components/dashboard/MissionPlannerForm.tsx:651-658,741-748
Category: bug
Severity: medium
Description: Direct edits to numeric count inputs parse the value but do not clamp it to the declared bounds. Users can type values above `max="20"` for ships or above `max="50"` for personnel and the component will store and submit those values.
Suggested fix direction: Clamp parsed input values in `onChange` the same way the plus/minus buttons do, and validate counts before save.

### 17. src/components/dashboard/MobileSidebar.tsx:45-48
Category: bug
Severity: medium
Description: The mobile drawer reuses `DashboardSidebar` but provides no way for nav link clicks inside the sidebar to call `onClose`. On mobile, selecting a route can leave the drawer/backdrop open over the newly navigated page.
Suggested fix direction: Pass an optional `onNavigate`/`onItemClick` callback into `DashboardSidebar` and call it from each `Link` in the mobile drawer.

### 18. src/components/dashboard/OrgChart-example.tsx:1-2,111-160
Category: stub
Severity: low
Description: The file contains sample/demo org-chart data and exports examples from production source. It is clearly documented as example usage, but it remains in the component tree and can be accidentally imported or shipped.
Suggested fix direction: Move examples to Storybook/docs/tests or keep them behind a development-only boundary.

### 19. src/components/dashboard/OrgChart.tsx:773-799
Category: bug
Severity: medium
Description: The SVG marker id is hard-coded as `arrowhead`. Rendering multiple `OrgChart` instances on a page, as the example file does, creates duplicate ids and `markerEnd="url(#arrowhead)"` can resolve to the wrong chart's marker definition.
Suggested fix direction: Generate a unique id per OrgChart instance with `useId()` and reference that id in `markerEnd`.

### 20. src/components/dashboard/OrgChart.tsx:449-484
Category: bug
Severity: medium
Description: Horizontal anchor offsets are computed only when `anchorXToId`, `nodeOffsets`, or `tree` change. Responsive layout, font/image loading, or window resizing can move target nodes without recomputing `computedOffsets`, leaving anchored nodes misaligned.
Suggested fix direction: Recalculate anchor offsets from the same ResizeObserver/resize path that recalculates connectors, or fold anchor offset calculation into the main layout recalculation.

### 21. src/components/dashboard/OrgChart.tsx:133-147,828-836
Category: failure-point
Severity: low
Description: Flippable person cards are clickable `<div>` elements with no button role, tab index, or keyboard handler. Keyboard and assistive-technology users cannot flip cards reliably.
Suggested fix direction: Use a `<button>` for the interactive card or add appropriate `role="button"`, `tabIndex`, `aria-pressed`, and Enter/Space key handling.

### 22. src/components/dashboard/SystemStatusBar.tsx:26-38
Category: bug
Severity: low
Description: The status bar renders `new Date()` once and never updates. The displayed time quickly becomes stale even though it is presented as a live system status bar.
Suggested fix direction: Store current time in state and update it on a timer, or remove the live time display.

### 23. src/components/dashboard/panels/LatestBriefingsPanel.tsx:19-49
Category: stub
Severity: low
Description: The latest briefings panel uses hard-coded sample briefings, unread counts, dates, and authors. In production this presents fictional corporate/security information as real dashboard data.
Suggested fix direction: Fetch briefings from a real source or clearly mark the panel as demo/static until backed by data.

### 24. src/components/dashboard/panels/LatestBriefingsPanel.tsx:133-134
Category: failure-point
Severity: medium
Description: Tailwind arbitrary-value classes are assembled dynamically with `var(--mg-${getCategoryColor(...)})`. Tailwind cannot statically discover these class names, so category-specific border/background/text styles may not be emitted in the production CSS bundle.
Suggested fix direction: Map categories to complete static class strings, use inline styles/CSS variables, or safelist every generated class.

### 25. src/components/dashboard/panels/SystemStatusPanel.tsx:15-47,89-93
Category: stub
Severity: low
Description: System statistics are static sample values while the header advertises `LIVE`. Values such as fleet readiness, shield capacity, and quantum fuel can become misleading because they are not sourced from live telemetry.
Suggested fix direction: Replace static data with real telemetry/API data or relabel the panel as simulated/demo status.

### 26. src/components/dashboard/panels/SystemStatusPanel.tsx:66-76
Category: bug
Severity: medium
Description: `StatusIcon` assigns `text-*` classes to an empty rounded `<div>`. Because no background color is set, the status indicator dot itself is invisible or theme-dependent.
Suggested fix direction: Use background-color classes (`bg-[rgba(...)]`) for the dot and reserve text classes for actual text.

### 27. src/components/dashboard/panels/SystemStatusPanel.tsx:137
Category: failure-point
Severity: medium
Description: The value color class is dynamically constructed as `text-[rgba(var(--mg-${getStatusColor(stat.status)}),0.9)]`. Tailwind will not reliably generate these dynamic arbitrary classes, so status value colors may be missing in production.
Suggested fix direction: Map each status to a full static class name or use inline styles/CSS variables.

### 28. src/components/dashboard/panels/UpcomingEventsPanel.tsx:11,64-107
Category: failure-point
Severity: medium
Description: The panel ignores `loading` and does not read `error`, and it renders no explicit empty state. While events are loading or Discord fetching fails, users see a blank panel plus the calendar button with no explanation.
Suggested fix direction: Render loading, error, and empty states before mapping events.

### 29. src/components/dashboard/widgets/TransactionModal.tsx:36-49
Category: failure-point
Severity: medium
Description: `handleSubmit` calls `onSubmit(...)`, immediately resets local form state, and closes the modal without awaiting or observing the parent submission result. The actual parent handler is async, so failed submissions still close the modal and discard user input.
Suggested fix direction: Type `onSubmit` as returning `Promise<void>` or a result, await it in the modal, and only reset/close after success; keep the modal open and show an error on failure.

### 30. src/components/dashboard/widgets/TransactionModal.tsx:98-112,166-170
Category: bug
Severity: medium
Description: The amount field permits `0` (`min="0"`) and the submit button only checks that the amount string is non-empty. A zero-value transaction can be submitted even though it is not meaningful financial activity.
Suggested fix direction: Require `Number(amount) > 0`, set `min="1"` or the smallest valid unit, and show inline validation for invalid amounts.
