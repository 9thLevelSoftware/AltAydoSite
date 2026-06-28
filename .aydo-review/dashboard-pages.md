# Dashboard Pages Review

Scope: reviewed the 37 assigned dashboard page/layout files for bugs, stubs, errors, and failure points. No code was modified.

## Summary

Findings: 18

Severity breakdown:
- Critical: 0
- High: 3
- Medium: 6
- Low: 9

Verification notes:
- Confirmed all assigned files except no extra unassigned `operations/page.tsx`; the assigned `operations/layout.tsx` and `operations/fleet/page.tsx` exist.
- Attempted `npm run type-check -- --pretty false`; it failed before checking source files because `tsconfig.json` uses deprecated `moduleResolution=node10` and `baseUrl` without `ignoreDeprecations`.
- Attempted targeted lint; it failed because `next` is not installed/available in the current checkout (`sh: next: command not found`).

## Findings

### 1. Dashboard layout does not enforce authentication for the dashboard subtree

- File path: `src/app/dashboard/DashboardClient.tsx`
- Line number(s): 12-19
- Category: bug
- Severity: high
- Description: `DashboardClient` calls `useSession()` but never checks the session, redirects, or blocks rendering. Because `src/app/dashboard/layout.tsx` wraps all dashboard routes with this component, direct visits to many child pages (archives, career pages, events, subsidiaries, operations, etc.) can render without the authenticated gate used only by selected individual pages.
- Suggested fix direction: enforce authentication once at the dashboard layout/middleware boundary, preferably server-side with `getServerSession`/middleware redirect, and remove duplicated client-only guards from leaf pages where possible.

### 2. Mission planner redirects unauthenticated users to a route that appears not to exist

- File path: `src/app/dashboard/mission-planner/page.tsx`
- Line number(s): 14-17
- Category: bug
- Severity: medium
- Description: Unauthenticated users are redirected to `/auth/login?callbackUrl=/dashboard/mission-planner`, but the rest of the app and NextAuth config use `/login`; no `/auth/login` app route was found. This can produce a 404 instead of the login page.
- Suggested fix direction: redirect to `/login?callbackUrl=/dashboard/mission-planner` or centralize login route constants with the NextAuth `pages.signIn` setting.

### 3. Dashboard client contains unused session and secure-connection code

- File path: `src/app/dashboard/DashboardClient.tsx`
- Line number(s): 4-5, 12
- Category: error
- Severity: low
- Description: `useSession`, `SecureConnectionIndicator`, and the `session` variable are imported/created but unused. This is dead code and can fail stricter lint/CI settings.
- Suggested fix direction: either use the session to enforce dashboard access and render the secure indicator, or remove the unused imports/state.

### 4. Finance tracker assumes every fetch response has JSON before checking status

- File path: `src/app/dashboard/finance-tracker/FinanceTrackerClient.tsx`
- Line number(s): 52-63, 87-109
- Category: failure-point
- Severity: medium
- Description: Both GET and POST handlers call `await response.json()` before checking `response.ok`. A 401/500 proxy error, empty response, or HTML error page will throw a parsing exception and skip the intended status-specific handling.
- Suggested fix direction: check `response.ok`/`response.headers.get('content-type')` before parsing, use a safe JSON helper, and fall back to status text when the body is not valid JSON.

### 5. Finance tracker uses `Math.random()` during render

- File path: `src/app/dashboard/finance-tracker/FinanceTrackerClient.tsx`
- Line number(s): 355-360
- Category: bug
- Severity: medium
- Description: Random positions/durations are generated directly during render for the animated data streams. In Next.js client components that are server-rendered and hydrated, this can produce server/client markup mismatches and unstable animation values on every re-render.
- Suggested fix direction: precompute particle values after mount or in a stable `useMemo` seeded once per component instance, and render deterministic values during hydration.

### 6. Finance tracker rate-limit countdown is static

- File path: `src/app/dashboard/finance-tracker/FinanceTrackerClient.tsx`
- Line number(s): 127-132, 173-175
- Category: failure-point
- Severity: low
- Description: `formatResetTime()` uses `Date.now()`, but there is no interval/tick state to re-render the component while the error is visible. The displayed countdown will remain frozen until another state update occurs.
- Suggested fix direction: add a one-second interval while `rateLimitResetTime` is set, or display an absolute reset time instead of a live countdown.

### 7. Security escort request allows client-side impersonation of `requestedBy`

- File path: `src/app/dashboard/subsidiaries/security/page.tsx`
- Line number(s): 39-40, 116, 339-348
- Category: bug
- Severity: high
- Description: `requestedBy` is initialized from the session name but rendered as an editable text field and then submitted in the request body. A user can change the displayed requester before submission, and the page does not make clear that the server should ignore the client-supplied name.
- Suggested fix direction: derive requester identity from the authenticated session on the server, omit `requestedBy` from the client payload or render it read-only, and show a separate optional display/contact field if needed.

### 8. Security training docs are protected only by client-side role checks

- File path: `src/app/dashboard/subsidiaries/security/page.tsx`
- Line number(s): 61-62, 593-725
- Category: failure-point
- Severity: high
- Description: `hasTrainingAccess` hides the training docs in the UI based on `session.user.role`, but the restricted training content is still shipped in the client bundle. Anyone who can load the JS can inspect the supposedly restricted text.
- Suggested fix direction: move restricted training content behind a server component/API authorization check and return only authorized content to the browser.

### 9. Security escort submission assumes a successful response has `id`

- File path: `src/app/dashboard/subsidiaries/security/page.tsx`
- Line number(s): 119-125
- Category: failure-point
- Severity: medium
- Description: The error path assumes non-OK responses are JSON, and the success path immediately calls `newRequest.id.slice(...)`. If the API returns non-JSON, a different response shape, or a missing `id`, the UI throws after submission instead of showing a controlled error.
- Suggested fix direction: parse responses defensively, validate that `newRequest.id` is a string before slicing, and show a generic success message if the ID is absent.

### 10. Ships-to-escort input can put `NaN` into controlled state

- File path: `src/app/dashboard/subsidiaries/security/page.tsx`
- Line number(s): 367-375
- Category: bug
- Severity: medium
- Description: `parseInt(e.target.value)` writes `NaN` when the number input is temporarily empty or invalid. React controlled inputs with `NaN` values can warn and the form can submit malformed data despite the `min` and `required` attributes.
- Suggested fix direction: handle the empty string separately, clamp to a minimum of 1 before submit, and keep the state type compatible with temporary form text if needed.

### 11. Hidden stale threat level can be submitted

- File path: `src/app/dashboard/subsidiaries/security/page.tsx`
- Line number(s): 382-423, 116
- Category: failure-point
- Severity: low
- Description: Selecting `done` exposes `threatLevel`, but switching back to `needed` does not clear the existing `threatLevel`. The hidden stale value remains in `escortForm` and is submitted.
- Suggested fix direction: clear `threatLevel` when `threatAssessment` changes to `needed`, or conditionally omit `threatLevel` from the submitted payload unless assessment is `done`.

### 12. Security event calendar is a visible stub

- File path: `src/app/dashboard/subsidiaries/security/page.tsx`
- Line number(s): 729-756
- Category: stub
- Severity: low
- Description: The Event Calendar tab contains only “Calendar Integration Coming Soon” static content while the tab is available in production UI.
- Suggested fix direction: hide the tab until implemented, or wire it to the real events/escort-request calendar data.

### 13. Resources page explicitly ships placeholder content

- File path: `src/app/dashboard/archives/resources/page.tsx`
- Line number(s): 365-373
- Category: stub
- Severity: low
- Description: The page displays a notice saying it contains placeholder content and that additional resources will be added later.
- Suggested fix direction: replace placeholder copy with production resource data or mark the page/section as unavailable until complete.

### 14. Training Center page is entirely “COMING SOON”

- File path: `src/app/dashboard/career/training/page.tsx`
- Line number(s): 38-43
- Category: stub
- Severity: low
- Description: The assigned training page is a full-page under-construction placeholder instead of a functional training module.
- Suggested fix direction: hide the route from navigation until ready or implement the described curriculum/session/progress functionality.

### 15. Fleet operations page is entirely “COMING SOON” and is misnamed internally

- File path: `src/app/dashboard/operations/fleet/page.tsx`
- Line number(s): 6, 33-39
- Category: stub
- Severity: low
- Description: The page exports a function named `FleetDatabasePage` and renders only an under-construction fleet database placeholder, despite being the fleet operations route.
- Suggested fix direction: rename the component to match the route and either implement fleet operations content or hide the route until it is available.

### 16. Organizational hierarchy uses demo/sample data in production route

- File path: `src/app/dashboard/archives/hierarchy/page.tsx`
- Line number(s): 7-8, 373-377
- Category: stub
- Severity: low
- Description: The page comments identify the hierarchy as sample/testing data and the UI renders a “DEMO DATA” badge. This indicates the production archive hierarchy is not backed by real organizational data.
- Suggested fix direction: source hierarchy data from the authoritative org model/API or clearly keep the route behind a demo-only feature flag.

### 17. Career advancement rewards include unresolved TBD entries

- File path: `src/app/dashboard/career/advancement/page.tsx`
- Line number(s): 104-136
- Category: stub
- Severity: low
- Description: Multiple current reward tiers render `TBD` as the actual reward value for Seasoned Hire, Team Leader, Vice Director, and Director.
- Suggested fix direction: replace TBD entries with finalized reward data or omit those sections until values are approved.

### 18. Certification text contains HTML entities inside JavaScript strings

- File path: `src/app/dashboard/career/certifications/page.tsx`
- Line number(s): 147, 166, 302
- Category: bug
- Severity: low
- Description: Strings inside arrays contain HTML entities like `&apos;` and `&quot;`. Because these are JavaScript string values rendered via `{item}`, React will display the literal entity text instead of decoding it as punctuation.
- Suggested fix direction: use normal apostrophes/quotes inside string literals, or decode/sanitize content before rendering if it is sourced externally.
